'use strict';
const { RGB, RGBA } = require('./rgb.js');
const { relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('./srgb.js');
const { lightness, XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('./cie.js');
const { bankRound } = require('./utility/num_util.js');
const { zeros } = require('./utility/array_util.js');
const { isPowerOfTwo } = require('./utility/type_util.js');
const { RGBImage } = require('./rgbimage.js');
const { convolveComplex } = require('./signal.js');
const { FrequencyDist } = require('./histogram.js');

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
        signalLength = isCol ? complexImage.height() : complexImage.width(),
        power = bankRound(Math.log2(signalLength)),
        j = signalLength / 2,
        tempR,
        tempI,
        c;

    //Sort in Reverse Bit order
    for (let i = 1; i < signalLength; i++) {
        if (i < j) {
            let ti = ReX._toDataIndex(makeFFTIndex(i, dimIndex, isCol, 0));
            let tj = ReX._toDataIndex(makeFFTIndex(j, dimIndex, isCol, 0));
            for (c = 0; c < chans; c++) {
                tempR = ReX.getAtDI(tj);
                tempI = ImX.getAtDI(tj);
                ReX.getAtDI(tj) = ReX.getAtDI(ti);
                ImX.getAtDI(tj) = ImX.getAtDI(ti);
                ReX.getAtDI(ti) = tempR;
                ImX.getAtDI(ti) = tempI;
                ti = ReX._incrementDataIndex(ti, 1, 2);
                tj = ReX._incrementDataIndex(tj, 1, 2);
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
                let ip = ReX._toDataIndex(makeFFTIndex(i + halfSpectra, dimIndex, isCol, 0));
                let ti = ReX._toDataIndex(makeFFTIndex(i, dimIndex, isCol, 0));
                //Butterfly calculation for each channel's signal
                for (c = 0; c < chans; c++) {
                    tempR = ReX.getAtDI(ip) * ur - ImX.getAtDI(ip) * ui;
                    tempI = ReX.getAtDI(ip) * ui + ImX.getAtDI(ip) * ur;
                    ReX.getAtDI(ip) = ReX.getAtDI(ti) - tempR;
                    ImX.getAtDI(ip) = ImX.getAtDI(ti) - tempI;
                    ReX.getAtDI(ti) = ReX.getAtDI(ti) + tempR;
                    ImX.getAtDI(ti) = ImX.getAtDI(ti) + tempI;
                    ip = ReX._incrementDataIndex(ip, 1, 2);
                    ti = ReX._incrementDataIndex(ti, 1, 2);
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
        ImX = complexImage.imag;
        signalLength = isCol ? complexImage.height() : complexImage.width(),
        powerOf2 = 1;  
    while (powerOf2 < signalLength * 2 + 1) powerOf2 *= 2;
    //Perform the following Z-Transform for all channels
    for (let c of chans) {
        let tcos = [];
        let tsin = [];
        let ReA = zeros([powerOf2], true);
        let ImA = zeros([powerOf2], true);
        let ReB = zeros([powerOf2], true);
        let ImB = zeros([powerOf2], true);

        for (let si = 0; si < signalLength; si++) {
            let j = si * si % (signalLength * 2),
                ti = ReX._toDataIndex(makeFFTIndex(si, dimIndex, isCol, c));
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
            let ti = ReX._toDataIndex(makeFFTIndex(si, dimIndex, isCol, c));
            ReX.setAtDI(ti, ReA[i] * tcos[i] + ImA[i] * tsin[i]);
            ImX.setAtDI(ti, ImA[i] * tcos[i] - ReA[i] * tsin[i]);
        }
    }
    return complexImage;
}

function FFT1DImage(complexImage, dimIndex, isCol=false, chans) {
    let signalLength = isCol ? complexImage.height() : complexImage.width();
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
    for (let row = 0; row < complexImage.height(); row++) {
        FFT1DImage(complexImage, row, false, chans);
    }
    //Take FFT of each column
    for (let col = 0; col < complexImage.width(); col++) {
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
    let ReX = inPlace ? 
        rgbImage : 
        new RGBImage(rgbimage.data.slice(0), rgbImage.width(), rgbImage.height());
    let ImX = new Tensor(rgbImage.shape, zeros(rgbImage.shape, true));
    let complexImage = {
        real : ReX,
        imag : ImX,
        height : () => {
            ReX.height();
        },
        width : () => {
            ReX.width();
        }
    }
    return FFT2DFromComplexImage(complexImage, chans);
}

/** Inverse Fourier Transform of a complex 2D image in the frequency domain epresented as two flat multi-channel array components
 * @param   {Object}  complexImage  instantiation of complex image class with real and imaginary components in the frequency domain.
 * @param   {Int}     chans   the number of color channels to perform the inverse FFT on.
 * @returns {Object} ComplexSignal     References to the component arrays that have been altered in place.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the time domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the time domain.
**/
function inverseFFT2DImage(complexImage, chans) {
    let normal = complexImage.height() * complexImage.width();

    complexImage.imag.forEachVal([[],[],[0,[],chans]], (amp, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, amp * -1);
    });

    FFT2DFromComplexImage(complexImage, chans);

    //Normalize each value by dividing by pixelWidth * pixelHeight
    complexImage.real.forEachVal([[],[],[0,[],chans]], (value, dataIndex) => {
        complexImage.real.setAtDI(dataIndex, value / normal);
    });
    complexImage.imag.forEachVal([[],[],[0,[],chans]], (value, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, -1 * value / normal);
    });

    return { complexImage };
}

function multiplyFreqImage(complexX, copmlexH, chans, inPlace=false) {
    if (!max) max = ReX.length;
    let ReY = inPlace ? ReX : [],
        ImY = inPlace ? ImX : [];

    if (inPlace) {
        let temp;
        for (let i = min; i < max; i++) {
            temp = ReX[i] * ReH[i] - ImX[i] * ImH[i]; 
            ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
            ReY[i] = temp;
        }
    } else {
        for (let i = min; i < max; i++) {
            ReY[i] = ReX[i] * ReH[i] - ImX[i] * ImH[i];
            ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
        }
    }
    return { "ReX" : ReY, "ImX" : ImY }
}



function depadRealImage(img, pWidth, chans, minusWidth, minusHeight) {
    let ccTotal = img.length;
    let pHeight = ccTotal / pWidth / chans,
        newRows = pHeight - minusHeight;
        newCols = pWidth - minusWidth,
        endIndex = newCols * chans;
        colChansRmv = minusWidth * chans;
        currIndex = endIndex + colChansRmv;
        for (let r = 1; r < newRows; r++) {
            let sectionLen = newCols * chans;
            for (let c = 0; c < sectionLen; c++) {
                img[endIndex] = img[currIndex];
                endIndex++;
                currIndex++;
            }
            currIndex += colChansRmv;
        }
        img.splice(endIndex);
        return img;
}

function FFTConvolution(img, psf) {
    let heightPowerOf2 = 1;
    let widthPowerOf2 = 1;
    while (heightPowerOf2 < img.height() * 2 - 1) heightPowerOf2 *= 2;
    while (widthPowerOf2 < img.width() * 2 - 1) widthPowerOf2 *= 2;
    let imgPaddingAfter = [
        heightPowerOf2 - img.height(),
        widthPowerOf2 - img.width()
    ];
    let psfPaddingAfter = [
        heightPowerOf2 - psf.shape[0],
        widthPowerOf2 - psf.shape[1]
    ];
    img.pad()
}

function convolveRealImage(img, psf, edge="mirror") {
    let output = [];
        finalHeight = img.height() + psf.rows() - 1,
        finalWidth = img.width() + psf.cols() - 1,
        leftRadius = Math.ceil(psf.cols() / 2) - 1, //5 = 2 4 = 1
        rightRadius = psf.cols() - leftRadius - 1, //5 = 2; 4 = 2;
        topRadius = Math.ceil(psf.rows() / 2) - 1,
        bottomRadius = psf.rows() - topRadius - 1;
        // cntrRI= leftRadius,
        // cntrCI = rightRadius,
        let currIndex = 0;
        let rightSum = 0;
        let topSum = 0;
        let sum = 0;
        let subCols = 0;
        let subRows = 0;
        let totalSub = 0;
    for (let row = 0; row < imgHeight; row++) {
        for (let col = 0; col < imgWidth; col++) {
            

            //calculate submerged columns and rows;
            if (col < leftRadius) subCols = leftRadius - col;
            else if (imgWidth - col <= rightRadius) subCols = rightRadius - (imgWidth - col - 1);
            if (row < topRadius) subRows = topRadius - row;
            else if (imgHeight - row <= bottomRadius) subRows = bottomRadius - (imgHeight - row - 1);
            
            if (!subRows || !subCols) {
                switch(edge) {
                    case "mirror" : 
                        wrapRInd = imgHeight - r - 1;
                        break;
                    case "pad" : 
                        val = 0;
                        break;
                    case "correct" :
                        //divide by immersed pixels;
                        break;
                }
            } else {
                for (let pr = -topRadius; pr <= bottomRadius; pr++) {
                    for (let pc = -leftRadius; pc <= rightRadius; pc++) {
                        //sum += img[((r * imgWidth) + c) * chans] * 
                        
                    }
    
                }
            }
        }
    }

    for (let r = -topRadius; r < imgHeight - topRadius; r++) {
        for (let c = -leftRadius; c < imgWidth - leftRadius; c++) {
            let sum = 0,
                subC = 0,
                subR = 0,
                totalSub;

            //calculate submerged columns and rows;
            if (c < 0) subC = 0 - c;
            else if (c + psfWidth - 1 >= imgWidth) subC = psfWidth - imgWidth + c;
            if (r < 0) subR = 0 - r;
            else if (r + psfHeight - 1 >= imgHeight) subR = psfHeight - imgHeight + r;
            
            if (!subR || !subC) {
                switch(edge) {
                    case "mirror" : 
                        wrapRInd = imgHeight - r - 1;
                        break;
                    case "pad" : 
                        val = 0;
                        break;
                    case "correct" :
                        //divide by immersed pixels;
                        break;
                }
            } else {
                for (let pr = 0; pr < psfHeight; pr++) {
                    for (let pc = 0; pc < psfWidth; pc++) {
                        //sum += psf[]
                        
                    }
                }
            }
            //output[row col] = 
        }
    }
}
module.exports = {
    equalizeImgLight,
    FFT2DFromRealImage,
    inverseFFT2DImage,
    FFT1DImage,
}