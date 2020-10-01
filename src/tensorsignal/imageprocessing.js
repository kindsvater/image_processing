'use strict';
const { bankRound, nextPowerOf2 } = require('../utility/num_util.js');
const { zeros, toNestedArray } = require('../utility/array_util.js');
const { isPowerOfTwo } = require('../utility/type_util.js');
const { sRGBtoXYZ, XYZtosRGB } = require('../colorspace/srgb.js');
const { XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('../colorspace/cie.js');
const { convolveComplex } = require('../flatsignal/signalprocessing.js');
const { RGBImage } = require('./rgbimage.js');
const { FrequencyDist } = require('../stat/histogram.js');
const { ComplexSignal } = require('./complexsignal.js');
const { Tensor } = require('../tensor/tensor.js');
const { pad, getPadding, depad } = require('../tensor/pad/pad.js');

function labelprint(label, data) {
    console.log(label);
    console.log(data);
}
//Given an RGBA image, equalizes the lightness of the image between the minimum and maximum values
function equalizeImgLight(realImage, min, max) {
    let histogram = new FrequencyDist(realImage.toLightness(), 64, min, max);
    let equalCDF = histogram.equalize(256);
    let equalData = [];

    realImage.forEachPixel((pixel) => {
        let lab = XYZtoLAB(sRGBtoXYZ(pixel));
        let l8bit = Math.floor(LAB.LVal(lab) / 100 * 255);

        if (l8bit >= min && l8bit < max) {
            let new8BitL = equalCDF[histogram.intervalIndex(l8bit)];
            let equalsrgb = XYZtosRGB(
                LABtoXYZ(
                    LAB.color(new8BitL / 255 * 100, LAB.AVal(lab), LAB.BVal(lab)
                ), undefined, true)
            );
            equalData.push(...equalsrgb);
        } else {
            equalData.push(...pixel);
        }
        equalData.push(255);
    });

    return new RGBImage(equalData, realImage.width, true);
}

//Use when performing a transfrom on multi-channel flat image in place.
//Translates the abstract index n in the input signal to its actual index in the image. 
function makeFFTIndex(si, dimIndex, isCol, chan) {
    let tensorIndex = [0,0,chan];
    tensorIndex[+isCol] = dimIndex;
    tensorIndex[+!isCol] = si;
    return tensorIndex;
}

function radix2FFTImage(complexImage, dimIndex, isCol=false, chans=3) {
    let ReX = complexImage.real,
        ImX = complexImage.imag,
        height = complexImage.shape[0],
        width = complexImage.shape[1],
        signalLength = isCol ? height : width,
        power = bankRound(Math.log2(signalLength)),
        j = signalLength / 2,
        tempR,
        tempI,
        c;

    //Sort in Reverse Bit order
    for (let i = 1; i < signalLength; i++) {
        if (i < j) {
            let ti = ReX.__toDataIndex(makeFFTIndex(i, dimIndex, isCol, 0));
            let tj = ReX.__toDataIndex(makeFFTIndex(j, dimIndex, isCol, 0));
            for (c = 0; c < chans; c++) {
                tempR = ReX.getAtDI(tj);
                tempI = ImX.getAtDI(tj);
                ReX.setAtDI(tj, ReX.getAtDI(ti));
                ImX.setAtDI(tj, ImX.getAtDI(ti));
                ReX.setAtDI(ti, tempR);
                ImX.setAtDI(ti, tempI);
                ti = ReX.__incrementDataIndex(ti, 1, 2);
                tj = ReX.__incrementDataIndex(tj, 1, 2);
            }
        }
        let k = signalLength / 2;
        while (k <= j) {
            j = j - k;
            k = k / 2;
        }
        j = j + k;
    }

    //Loop for each stage
    for (let stage = 1; stage <= power; stage++) {  
        let spectraSize = Math.pow(2, stage);      
        let halfSpectra = spectraSize / 2;
        let ur = 1;
        let ui = 0;
        //calculate sine and cosine values
        let sr = Math.cos(Math.PI / halfSpectra);
        let si = Math.sin(Math.PI / halfSpectra);

        //Loop for each Sub-DTF
        for (j = 1; j <= halfSpectra; j++) {
            //Loop for each Butterfly
            for (let i = j - 1; i < signalLength; i += spectraSize) {
                let ip = ReX.__toDataIndex(makeFFTIndex(i + halfSpectra, dimIndex, isCol, 0));
                let ti = ReX.__toDataIndex(makeFFTIndex(i, dimIndex, isCol, 0));
                //Butterfly calculation for each channel's signal
                for (c = 0; c < chans; c++) {
                    tempR = ReX.getAtDI(ip) * ur - ImX.getAtDI(ip) * ui;
                    tempI = ReX.getAtDI(ip) * ui + ImX.getAtDI(ip) * ur;
                    ReX.setAtDI(ip, ReX.getAtDI(ti) - tempR);
                    ImX.setAtDI(ip, ImX.getAtDI(ti) - tempI);
                    ReX.setAtDI(ti, ReX.getAtDI(ti) + tempR);
                    ImX.setAtDI(ti, ImX.getAtDI(ti) + tempI);
                    ip = ReX.__incrementDataIndex(ip, 1, 2);
                    ti = ReX.__incrementDataIndex(ti, 1, 2);
                }
            }
            tempR = ur;
            ur = tempR * sr - ui * si;
            ui = tempR * si + ui * sr;
        }
    }
    return complexImage;
}

function chirpZTransformImage(complexImage, dimIndex, isCol=false, chans=3) {
    let ReX = complexImage.real,
        ImX = complexImage.imag,
        height = complexImage.shape[0],
        width = complexImage.shape[1],
        signalLength = isCol ? height : width,
        powerOf2 = 1;  

    while (powerOf2 < signalLength * 2 + 1) powerOf2 *= 2;
    //Perform the following Z-Transform for all channels
    for (let c = 0; c < chans; c++) {
        let tcos = [];
        let tsin = [];
        let ReA = zeros([powerOf2], true);
        let ImA = zeros([powerOf2], true);
        let ReB = zeros([powerOf2], true);
        let ImB = zeros([powerOf2], true);

        for (let si = 0; si < signalLength; si++) {
            let j = si * si % (signalLength * 2),
                ti = ReX.__toDataIndex(makeFFTIndex(si, dimIndex, isCol, c));
            tcos[si] = Math.cos(Math.PI * j / signalLength);
            tsin[si] = Math.sin(Math.PI * j / signalLength);
            ReA[si] = ReX.getAtDI(ti) * tcos[si] + ImX.getAtDI(ti) * tsin[si];
            ImA[si] = ImX.getAtDI(ti) * tcos[si] - ReX.getAtDI(ti) * tsin[si];
        }
        //Pad with zeros so that length is radix-2 number M
        for (let sigPadIndex = signalLength; sigPadIndex < powerOf2; sigPadIndex++) {
            ReA[sigPadIndex] = 0;
            ImA[sigPadIndex] = 0;
        }

        ReB[0] = tcos[0];
        ImB[0] = tsin[0];
        for (let si = 1; si < signalLength; si++) {
            ReB[si] = tcos[si];
            ImB[si] = tsin[si];
            ReB[powerOf2 - si] = tcos[si];
            ImB[powerOf2 - si] = tsin[si];
        }

        convolveComplex(ReA, ImA, ReB, ImB);
        for (let si = 0; si < signalLength; si++) {
            let ti = ReX.__toDataIndex(makeFFTIndex(si, dimIndex, isCol, c));
            ReX.setAtDI(ti, ReA[si] * tcos[si] + ImA[si] * tsin[si]);
            ImX.setAtDI(ti, ImA[si] * tcos[si] - ReA[si] * tsin[si]);
        }
    }
    return complexImage;
}

function FFT1DImage(complexImage, dimIndex, isCol=false, chans) {
    let signalLength = isCol ? complexImage.shape[0] : complexImage.shape[1];
    if (signalLength === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(signalLength)) {
        radix2FFTImage(complexImage, dimIndex, isCol, chans); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransformImage(complexImage, dimIndex, isCol, chans);
    }
    return complexImage;
}

function FFT2DFromComplexImage(complexImage, chans) {
    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < complexImage.shape[0]; row++) {
        FFT1DImage(complexImage, row, false, chans);
    }
    //Take FFT of each column
    for (let col = 0; col < complexImage.shape[1]; col++) {
        FFT1DImage(complexImage, col, true, chans);
    }
    return complexImage;
}

/** Calculates Fourier Transform of a 2D image represented as one flat multi-channel array.
 * @param   {Object}  rgbImage Instance of the RGBImage class.
 * @param   {Int}     chans   the number of color channels to perform the transform on.
 * @param   {Boolean} inPlace If true will alter the original image object.
 * @returns {Object} ComplexSignal     A complex representation of the image in the frequency domain.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the freq domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the freq domain.
**/
function FFT2DFromRealImage(rgbImage, chans, inPlace=true) {
    let complexImage = new ComplexSignal(rgbImage);
    return FFT2DFromComplexImage(complexImage, chans);
}

/** Inverse Fourier Transform of a complex 2D image in the frequency domain epresented as two flat multi-channel array components
 * @param   {Object}  complexImage  instantiation of complex image class with real and imaginary components in the frequency domain.
 * @param   {Int}     chans   the number of color channels to perform the inverse FFT on.
 * @returns {Object} ComplexSignal     References to the component arrays that have been altered in place.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the time domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the time domain.
**/
function inverseFFT2DImage(complexImage, chans=3) {
    let normal = complexImage.shape[0] * complexImage.shape[1];
    labelprint("normalization factor", normal);
    labelprint("DataSize = ", complexImage.real.data.length / 4);
    console.log("complex imag prior to inversion", complexImage.imag.data.slice(0));
    complexImage.imag.forEachVal([[],[],[0,[],chans - 1]], (amp, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, amp * -1);
    });
    labelprint("Real before Inversion", complexImage.real.data.slice(0));
    FFT2DFromComplexImage(complexImage, chans);
    labelprint("Real before normalization", complexImage.real.data.slice(0));
    //Normalize each value by dividing by pixelWidth * pixelHeight
    complexImage.real.forEachVal([[],[],[0,[],chans - 1]], (value, dataIndex) => {
        complexImage.real.setAtDI(dataIndex, value / normal);
    });
    complexImage.imag.forEachVal([[],[],[0,[],chans - 1]], (value, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, -1 * value / normal);
    });
    labelprint("inversion complete", complexImage.real.data.slice(0));
    return complexImage;
}

// function multiplyFreqImage(X, H, chans, inPlace=false) {
//     //check shapes
//     let temp;
//     let hi;
//     let xi;
//     let result = inPlace 
//         ? X
//         : new ComplexSignal(new Tensor(X.shape, X.real.data.slice(0)));

//     for (let i = 0; i < X.shape[0]; i++) {
//         for (let j = 0; j < H.shape[1]; j++) {
//             for (let c = 0; c < chans; c++) {
//                 hi = [i, j];
//                 xi = [i, j, c];
//                 temp = (X.getReal(xi) * H.getReal(hi)) - (X.getImag(xi) * H.getImag(hi));
//                 result.setImag(
//                     xi,
//                     (X.getImag(xi) * H.getReal(hi)) + (X.getReal(xi) * H.getImag(hi))
//                 );
//                 result.setReal(xi, temp);
//             }
//         }
//     }

//     return result;
// }

function multiplyFreqImage(X, H, chans, inPlace=false) {
    let temp;
    let hi;
    let xi = 0;
    
    for (hi = 0; hi < H.real.data.length; hi++) {
        for (let c = 0; c < 3; c++) {
            temp = X.real.data[xi] * H.real.data[hi] - X.imag.data[xi] * H.imag.data[hi];
            X.imag.data[xi] = X.imag.data[xi] * H.real.data[hi] + X.real.data[xi] * H.imag.data[hi];
            X.real.data[xi] = temp;
            xi++;
        }  
        xi++;
    }

    return X;
}

function FFTConvolution(img, psf, paddingType="constant", paddingConstant=0) {
    let height = img.shape[0];
    let width = img.shape[1];
    let FFTHeight = nextPowerOf2(height * 2 - 1);
    labelprint("Target Height", FFTHeight);
    let FFTWidth = nextPowerOf2(width * 2 - 1);
    labelprint("Target Width", FFTWidth);
    labelprint("Target data size", FFTHeight * FFTWidth * 4);
    labelprint("img before padding", img.data.slice(0));
    let imgPadding = getPadding(img, [FFTHeight, FFTWidth], "center");
    let psfPadding = getPadding(psf, [FFTHeight, FFTWidth], "center");
    labelprint("image padding", imgPadding);
    labelprint("psf Padding", psfPadding);
    pad(img, imgPadding, true, paddingType, paddingConstant);
    pad(psf, psfPadding, true, paddingType, paddingConstant);
    labelprint("Padding Image", img.data.slice(0));
    labelprint("Padded psf", psf.data.slice(0));
    let complexFreqImg = FFT2DFromRealImage(img, 3, true);
    let complexFreqPSF = FFT2DFromRealImage(psf, 1, true);

    labelprint("Frequency Image", complexFreqImg);
    labelprint("complexFreqPSF", complexFreqPSF);
    let convolvedFreqImg =  multiplyFreqImage(complexFreqImg, complexFreqPSF, 3);
    labelprint("convolved Freq image", convolvedFreqImg.real.data.slice(0));
    let convolvedRealImage = inverseFFT2DImage(convolvedFreqImg, 3).real;
    labelprint("nested convolved real", toNestedArray(convolvedRealImage.data.slice(0), convolvedRealImage.shape));
    return  depad(convolvedRealImage, imgPadding);
}

// function convolveRealImage(img, psf, edge="mirror") {
//     let output = [];
//         finalHeight = height + psf.rows() - 1,
//         finalWidth = img.width() + psf.cols() - 1,
//         leftRadius = Math.ceil(psf.cols() / 2) - 1, //5 = 2 4 = 1
//         rightRadius = psf.cols() - leftRadius - 1, //5 = 2; 4 = 2;
//         topRadius = Math.ceil(psf.rows() / 2) - 1,
//         bottomRadius = psf.rows() - topRadius - 1;
//         // cntrRI= leftRadius,
//         // cntrCI = rightRadius,
//         let currIndex = 0;
//         let rightSum = 0;
//         let topSum = 0;
//         let sum = 0;
//         let subCols = 0;
//         let subRows = 0;
//         let totalSub = 0;
//     for (let row = 0; row < imgHeight; row++) {
//         for (let col = 0; col < imgWidth; col++) {
            

//             //calculate submerged columns and rows;
//             if (col < leftRadius) subCols = leftRadius - col;
//             else if (imgWidth - col <= rightRadius) subCols = rightRadius - (imgWidth - col - 1);
//             if (row < topRadius) subRows = topRadius - row;
//             else if (imgHeight - row <= bottomRadius) subRows = bottomRadius - (imgHeight - row - 1);
            
//             if (!subRows || !subCols) {
//                 switch(edge) {
//                     case "mirror" : 
//                         wrapRInd = imgHeight - r - 1;
//                         break;
//                     case "pad" : 
//                         val = 0;
//                         break;
//                     case "correct" :
//                         //divide by immersed pixels;
//                         break;
//                 }
//             } else {
//                 for (let pr = -topRadius; pr <= bottomRadius; pr++) {
//                     for (let pc = -leftRadius; pc <= rightRadius; pc++) {
//                         //sum += img[((r * imgWidth) + c) * chans] * 
                        
//                     }
    
//                 }
//             }
//         }
//     }

//     for (let r = -topRadius; r < imgHeight - topRadius; r++) {
//         for (let c = -leftRadius; c < imgWidth - leftRadius; c++) {
//             let sum = 0,
//                 subC = 0,
//                 subR = 0,
//                 totalSub;

//             //calculate submerged columns and rows;
//             if (c < 0) subC = 0 - c;
//             else if (c + psfWidth - 1 >= imgWidth) subC = psfWidth - imgWidth + c;
//             if (r < 0) subR = 0 - r;
//             else if (r + psfHeight - 1 >= imgHeight) subR = psfHeight - imgHeight + r;
            
//             if (!subR || !subC) {
//                 switch(edge) {
//                     case "mirror" : 
//                         wrapRInd = imgHeight - r - 1;
//                         break;
//                     case "pad" : 
//                         val = 0;
//                         break;
//                     case "correct" :
//                         //divide by immersed pixels;
//                         break;
//                 }
//             } else {
//                 for (let pr = 0; pr < psfHeight; pr++) {
//                     for (let pc = 0; pc < psfWidth; pc++) {
//                         //sum += psf[]
                        
//                     }
//                 }
//             }
//             //output[row col] = 
//         }
//     }
// }
module.exports = {
    equalizeImgLight,
    FFT2DFromRealImage,
    inverseFFT2DImage,
    FFT1DImage,
    FFTConvolution
}