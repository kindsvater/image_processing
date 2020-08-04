'use strict';
const { RGB, RGBA } = require('./RGB');
const { relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('./sRGB');
const { lightness, XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('./cie');
const { bankRound, zeros, isPowerOfTwo } = require('./util');
const { ImageReader } = require('./ImageReader.js');
const { convolveComplex } = require('./signal.js');

//Given a flat array of RGB or RGBA image data and a function to calculate a property of a color: creates a 
//n-bin normalized histogram of the calculated property value for each color in the image as long as the value
//is within the specified range. The parameter a specifies the model for the image: true for RGBA and false for RGB
function histogram(img, calc, nbins, min, max, a=true) {
    if ((max - min + 1) % nbins !== 0) {
        throw new Error("Bin size is not an integer. Histogram range must be cleanly divisible by bin count");
    }
    let binSize = (max - min + 1) / nbins; 
    let total = 0; // Total colors with calculated values falling within range of histogram. 
    
    //Declare and initialize empty histogram
    let freqHist = [];
    for (let m = 0; m < nbins; m++) {
        freqHist[m] = 0;
    }

    let reader = new ImageReader(img, a);
    while(reader.hasNextColor()) {
        let L = calc(reader.nextColor())
        if (L >= min && L < max) {
            total = total + 1;
            freqHist[binIdx(L, min, binSize)] += 1;
        }
    }

    return freqHist.map((freq) => parseFloat((freq / total).toPrecision(4)));
}        

function binIdx(value, min, binSize) {
    return Math.floor((value - min) / binSize);
}

//Given an n-bin normalized histogram, returns its corresponding cumulative distribution. 
function cdf(normHist) {
    let cumProb = 0;
        c = [];
    for(let i = 0; i < normHist.length; i++) {
        cumProb += normHist[i];
        c[i] = parseFloat(cumProb.toPrecision(4));
    }
    return c;
}

//Given an n-bin Cumulative Distribution and a range of values, returns an n-index array of
//the equalized range. 
function equalizeHist(cdf, range) {
    let equal = [];
    for (let j = 0; j < cdf.length; j++) {
        equal[j] = cdf[j] * range;
    }
    return equal;
}

//Given an RGBA image, equalizes the lightness of the image between the minimum and maximum values
function equalizeImgLight(img, min, max) {
    let normHist = histogram(
        img,
        (rgbColor) => {
            return LAB.LVal(XYZtoLAB(sRGBtoXYZ(rgbColor))) / 100 * 255;
            },
        max - min + 1,
        min,
        max,
        true
    );

    let equalCDF = equalizeHist(cdf(normHist), 255);

    let read = new ImageReader(img, true);
    let labImg = [];
    while(read.hasNextColor()) {
        labImg.push(XYZtoLAB(sRGBtoXYZ(read.nextColor())));
    }

    XYZtoLAB([1.0378, 0.9509, 0.8658]);
    let equalImg = labImg.map(lab => {
        let L8Bit = Math.floor(LAB.LVal(lab) / 100 * 255);
        if (equalCDF[binIdx(L8Bit, min, 1)]) {
            L8Bit = equalCDF[binIdx(L8Bit, min, 1)];
        }
        let eqLAB = LAB.color(L8Bit / 255 * 100, LAB.AVal(lab), LAB.BVal(lab));
        let newXYZ = LABtoXYZ(eqLAB, undefined, true);
        let sRGB = XYZtosRGB(newXYZ);
        return sRGB;
    });
    let unclampedImg = [];
    for (let x = 0; x < equalImg.length; x++) {
        unclampedImg.push(RGB.redLevel(equalImg[x]), RGB.greenLevel(equalImg[x]), RGB.blueLevel(equalImg[x]), 255);
    }
    return new Uint8ClampedArray(unclampedImg);
}

//Use when performing a transfrom on multi-channel flat image in place.
//Translates the abstract index n in the input signal to its actual index in the image. 
function translateIndex(ind, chans, pOffset, from) {
    return from + (ind * chans * pOffset);
}

function radix2FFTImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (!to) to = ReX.length;
    let ccTotal = to - from,
        n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans,
        m = bankRound(Math.log2(n)),
        j = n / 2,
        tempR,
        tempI,
        c,
        tj,
        ti;

    //Sort in Reverse Bit order
    for (let i = 1; i < n; i++) {
        if (i < j) {
            ti = translateIndex(i, chans, pWidth, from);
            tj = translateIndex(j, chans, pWidth, from);
            for (c = 0; c < chans; c++) {
                tempR = ReX[tj + c];
                tempI = ImX[tj + c];
                ReX[tj + c] = ReX[ti + c];
                ImX[tj + c] = ImX[ti + c];
                ReX[ti + c] = tempR;
                ImX[ti + c] = tempI;
            }
        }
        let k = n / 2;
        while (k <= j) {
            j = j - k;
            k = k / 2;
        }
        j = j + k;
    }

    //Loop for each stage
    for (let stage = 1; stage <= m; stage++) {  
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
            for (let i = j - 1; i < n; i += spectraSize) {
                let ip = translateIndex(i + halfSpectra, chans, pWidth, from);
                ti = translateIndex(i, chans, pWidth, from);
                //Butterfly calculation for each channel's signal
                for (c = 0; c < chans; c++) {
                    tempR = ReX[ip + c] * ur - ImX[ip + c] * ui;
                    tempI = ReX[ip + c] * ui + ImX[ip + c] * ur;
                    ReX[ip + c] = ReX[ti + c] - tempR;
                    ImX[ip + c] = ImX[ti + c] - tempI;
                    ReX[ti + c] = ReX[ti + c] + tempR;
                    ImX[ti + c] = ImX[ti + c] + tempI;
                }
            }
            tempR = ur;
            ur = tempR * sr - ui * si;
            ui = tempR * si + ui * sr;
        }
    }
    return {ReX, ImX};
}

function chirpZTransformImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (ReX.length !== ImX.length) throw new Error("Complex signal real and imaginary component lengths do not match");
    if (from < 0 || from >= ReX.length) throw new Error("From Index " + from + " is out of range");
    if (to > ReX.length) throw new Error("To Index " + to + " is out of range");
    if (!to) to = ReX.length;
    let ccTotal = to - from;
    let n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
    let m = 1;
    while (m < n * 2 + 1) m *= 2;
    //Perform the following Z-Transform for all channels
    for (let c = 0; c < chans; c++) {
        let tcos = [],
            tsin = [],
            ReA = zeros(m);
            ImA = zeros(m);
            ReB = zeros(m);
            ImB = zeros(m);

        for (let i = 0; i < n; i++) {
            let j = i * i % (n * 2),
                ti = translateIndex(i, chans, pWidth, from);
            tcos[i] = Math.cos(Math.PI * j / n);
            tsin[i] = Math.sin(Math.PI * j / n);
            ReA[i] = ReX[ti + c] * tcos[i] + ImX[ti + c] * tsin[i];
            ImA[i] = ImX[ti + c] * tcos[i] - ReX[ti + c] * tsin[i];
        }
        //Pad with zeros so that length is radix-2 number M
        for (let i = n; i < m; i++) {
            ReA[i] = 0;
            ImA[i] = 0;
        }

        ReB[0] = tcos[0];
        ImB[0] = tsin[0];
        for (let i = 1; i < n; i++) {
            ReB[i] = tcos[i];
            ImB[i] = tsin[i];
            ReB[m - i] = tcos[i];
            ImB[m - i] = tsin[i];
        }

        convolveComplex(ReA, ImA, ReB, ImB);
        for (let i = 0; i < n; i++) {
            let ti = translateIndex(i, chans, pWidth, from);
            ReX[ti + c] = ReA[i] * tcos[i] + ImA[i] * tsin[i];
            ImX[ti + c] = ImA[i] * tcos[i] - ReA[i] * tsin[i];
        }
    }
    return { ReX, ImX };
}

function FFT1DImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (ReX.length !== ImX.length) throw new Error("Complex signal component lengths do not match");
    if (from < 0 || from >= ReX.length) throw new Error("From Index " + from + " is out of range");
    if (to > ReX.length) throw new Error("To Index " + to + " is out of range");
    if (!to) to = ReX.length;
    let ccTotal = to - from;
    let n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
    if (n === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(n)) {
        radix2FFTImage(ReX, ImX, chans, from, to, pWidth); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransformImage(ReX, ImX, chans, from, to, pWidth);
    }
}

function FFT2DFromComplexImage(ReX, ImX, chans, pWidth) {
    let ccTotal = ReX.length;
    if (ccTotal !== ImX.length) throw new Error("Complex Image Component lengths do not match.");
    let pHeight = ccTotal / pWidth / chans;

    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < pHeight; row++) {
        FFT1DImage(ReX, ImX, chans, (row * pWidth * chans), ((row + 1) * pWidth * chans));
    }
    //Take FFT of each column
    for (let col = 0; col < pWidth; col++) {
        FFT1DImage(ReX, ImX, chans, col * chans, (((pHeight - 1) * pWidth) + (col + 1)) * chans, pWidth);
    }
    return {ReX, ImX};
}

/** Calculates Fourier Transform of a 2D image represented as one flat multi-channel array.
 * @param   {Array}   img     Flat array of pixel color channels. Length is number of pixels * number of channels.
 * @param   {Int}     pWidth  the width of the image in pixels.
 * @param   {Int}     chans   the number of color channels per pixel.
 * @param   {boolean} inPlace If true will alter the original image array in place.
 * @returns {Object} ComplexSignal     A complex representation of the flat image in the frequency domain.
 * @returns {Array}  ComplexSignal.ReX The real component of the signal in the freq domain.
 * @returns {Array}  ComplexSignal.ImX The imaginary component of the signal in the freq domain.
**/
function FFT2DFromRealImage(img, pWidth, chans, inPlace=true) {
    let ReX = inPlace ? img : [];
        ImX = zeros(img.length);
    return FFT2DFromComplexImage(ReX, ImX, chans, pWidth);
}

/** Inverse Fourier Transform of a complex 2D image in the frequency domain epresented as two flat multi-channel array components
 * @param   {Array}   ReX    Real Component of multi-channel flat image.
 * @param   {Array}   ImX    Imaginary Component of multi-channel flat image.
 * @param   {Int}     pWidth  the width of the image in pixels.
 * @param   {Int}     chans   the number of color channels per pixel.
 * @returns {Object} ComplexSignal     References to the component arrays that have been altered in place.
 * @returns {Array}  ComplexSignal.ReX The real component of the signal in the freq domain.
 * @returns {Array}  ComplexSignal.ImX The imaginary component of the signal in the freq domain.
**/
function inverseFFT2DImage(ReX, ImX, chans, pWidth) {
    let ccTotal = ReX.length;
        pHeight = ccTotal / pWidth / chans,
        normal = pHeight * pWidth;
    if (ccTotal !== ImX.length) throw new Error("Complex Image Component lengths do not match");
    for (let k = 0; k < ccTotal; k++) {
        ImX[k] *= -1;
    }

    FFT2DFromComplexImage(ReX, ImX, chans, pWidth);

    //Normalize each value by dividing by pixelWidth * pixelHeight
    for (let i = 0; i < ccTotal; i++) {
        ReX[i] = ReX[i] / normal;
        ImX[i] = -1 * ImX[i] / normal;
    }

    return { ReX, ImX };
}

// function multiplyFreqImage(ReX, ImX, ReH, ImH, chans, inPlace=false) {
//     let min = 0;
//     let max = 
//     if (!max) max = ReX.length;
//     let ReY = inPlace ? ReX : [],
//         ImY = inPlace ? ImX : [];

//     if (inPlace) {
//         let temp;
//         for (let i = min; i < max; i++) {
//             temp = ReX[i] * ReH[i] - ImX[i] * ImH[i]; 
//             ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
//             ReY[i] = temp;
//         }
//     } else {
//         for (let i = min; i < max; i++) {
//             ReY[i] = ReX[i] * ReH[i] - ImX[i] * ImH[i];
//             ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
//         }
//     }
//     return { "ReX" : ReY, "ImX" : ImY }
// }

function padComplexImage(ReX, ImX, pWidth, chans, toWidth, toHeight) {
    let ccTotal = ReX.length;
    if (ccTotal !== ImX.length) throw new Error("Complex Image Component lengths do not match");
    let pHeight = ccTotal / pWidth / chans,
        newCCTotal = chans * toWidth * toHeight,
        newRows = toHeight - pHeight,
        newCols = toWidth - pWidth;
    
    //Add new rows to end of array
    let endZeros = newRows * (pWidth + newCols) * chans;
    for (let z = 1; z <= endZeros; z++) {
        ReX[newCCTotal - z] = 0;
        ImX[newCCTotal - z] = 0;
    }
    //Move over each former row by the column padding amount, starting with last.
    let endIndex = newCCTotal - endZeros - 1;
    let colZeros = newCols * chans;
    for (let r = pHeight; r > 0; r--) {
        for (let z = 1; z <= colZeros; z++) {
            ReX[endIndex] = 0;
            ImX[endIndex] = 0;
            endIndex--;
        }
        let origRowEndIndex = r * chans * pWidth - 1;
        for (let c = 0; c < pWidth * chans; c++) {
            ReX[endIndex] = ReX[origRowEndIndex - c];
            ImX[endIndex] = ImX[origRowEndIndex - c];
            endIndex--;
        }
    }
    return ReX, ImX;
}

function padRealImage(img, pWidth, chans, toWidth, toHeight) {
    let ccTotal = img.length;
    
    let pHeight = ccTotal / pWidth / chans,
        newCCTotal = chans * toWidth * toHeight,
        newRows = toHeight - pHeight,
        newCols = toWidth - pWidth;
    
    //Add new rows to end of array
    let endZeros = newRows * (pWidth + newCols) * chans;
    for (let z = 1; z <= endZeros; z++) {
        img[newCCTotal - z] = 0;
    }
    //Move over each former row by the column padding amount, starting with last.
    let endIndex = newCCTotal - endZeros - 1;
    let colZeros = newCols * chans;

    for (let r = pHeight; r > 0; r--) {
        for (let z = 1; z <= colZeros; z++) {
            img[endIndex] = 0;
            endIndex--;
        }
        let origRowEndIndex = r * chans * pWidth - 1;
        for (let c = 0; c < pWidth * chans; c++) {
            img[endIndex] = img[origRowEndIndex - c];
            endIndex--;
        }
    }
    return img;
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

function convolveRealImage(img, imgWidth, imgChans, psf, psfWidth, edge="mirror") {
    let output = [];
        ccTotal = img.length,
        imgHeight = ccTotal / imgWidth / imgChans,
        psfHeight = psf.length / psfWidth,
        finalHeight = imgHeight + psfHeight - 1,
        finalWidth = imgWidth + psfWidth - 1,
        leftRadius = Math.ceil(psfWidth / 2) - 1, //5 = 2 4 = 1
        rightRadius = psfWidth - leftRadius - 1, //5 = 2; 4 = 2;
        topRadius = Math.ceil(psfHeight / 2) - 1,
        bottomRadius = psfHeight - topRadius - 1,
        // cntrRI= leftRadius,
        // cntrCI = rightRadius,
        currIndex = 0;

    for (let r = 0; r < imgHeight; r++) {
        for (let c = 0; c < imgWidth; c++) {
            let sum = 0,
                subC = 0,
                subR = 0,
                totalSub;

            //calculate submerged columns and rows;
            if (c < leftRadius) subC = leftRadius - c;
            else if (imgWidth - c <= rightRadius) subC = rightRadius - (imgWidth - c - 1);
            if (r < topRadius) subR = topRadius - r;
            else if (imgHeight - r <= bottomRadius) subR = bottomRadius - (imgHeight - r - 1);
            
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
    histogram,
    cdf,
    equalizeHist,
    equalizeImgLight,
    FFT2DFromRealImage,
    inverseFFT2DImage,
    FFT1DImage,
    padRealImage,
    padComplexImage,
}