'use strict';
const { dim } = require('./lin');
const { zeros } = require('./valuetype');
const { inverseFFT, RDFTFromFFT } = require('./fourier');


const displayRefA = 1;
const audioRefA = 0.00001;
const dBFromAmp = (sigA, refA) => 20 * Math.log10(sigA / refA);
const dBFromPow = (sigP, refP) => 10 * Math.log10(sigP / refP);
//Extend the real frequency domain from N / 2 + 1 to N. 
//Useful when you want to calculate the Inverse Fast Fourier Transform 
//but your frequency signals ReX and ImX only cover the real domain. 
function extendRealFreqDomain(ReX, ImX) {
    //TODO: rewrite inplace
    let exRe = ReX.slice(0),
        exIm = ImX.slice(0),
        n = (ReX.length - 1) * 2;

    for (let i = (n / 2) + 1; i < n; i++) {
        exRe[i] = ReX[n - i];
        exIm[i] = -1 * ImX[n - i];
    }
    return [exRe, exIm];
}

//Multiply two N length complex signals in the frequency domain, X and H, by one another. 
function freqMultiply(ReX, ImX, ReH, ImH, min=0, max=0, inPlace=false) {
    if (!max) max = ReX.length;
    let ReY = inPlace ? ReX : [];
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

//Divide two n length complex signals in the frequency domain, X / Y.
function freqDivision(ReX, ImX, ReY, ImY) {
    //TODO: rewrite for in-place computation
    let ReH = [],
        ImH = [];
    
    for (let i = 0; i < ReX.length; i++) {
        ReH[i] = (ReY[i] * ReX[i] + ImY[i] * ImX[i])
            / (ReX[i] * ReX[i] + ImX[i] * ImX[i]);
        ImH[i] = (ImY[i] * ReX[i] - ReY[i] * ImX[i])
            / (ReX[i] * ReX[i] + ImX[i] * ImX[i]);
    }
    return { "ReX" : ReH, "ReY" : ImH }
}

//Convolve n-sample time-domain signal with m-sample impulse response. Output sample calculations
//are distributed across multiple input samples.
function convolveInput(sig, ir) {
    let Y = [],
        i,
        j;

    for (i = 0; i < sig.length + ir.length; i++) {
        Y[i] = 0;
    }

    for (i = 0; i < sig.length; i++) {
        for (j = 0; j < ir.length; j++) {
            Y[i + j] = Y[i + j] + (sig[i] * ir[j]);
        }
    }
    return Y;  
}

//Convolve n-sample time-domain signal with m-sample impulse response. Output sample calculations
//are performed independently of one another. 
function convolveOutput(sig, ir) {
    let Y = [],
        i,
        j;

    for (i = 0; i < sig.length + ir.length; i++) {
        Y[i] = 0
        for (j = 0; j < ir.length; j++) {
            if (i - j < 0) continue;
            if (i - j > sig.length) continue;
            Y[i] = Y[i] + (ir[j] * sig[i - j]);
        }
    }
    return Y.slice(0, sig.length);
}

//Given two time-domain signals, returns a third signal, the cross-correlation. The cross-correlation
//signal's amplitude is a measure of the resemblance of the target signal to the received signal at 
//a time-point x.
function correlate(receivedSig, targetSig) {
    let preFlip = targetSig.reverse();
    return convolveOutput(receivedSig, preFlip);
}


function convolveFFT(signal, ir, fftSize) {
    let output = [];
    let segSize = fftSize + 1 - ir.length,
        segCount = Math.ceil(signal.length  / segSize),
        overlapSize = fftSize - segSize;
    
    //load filter impulse response
    let XX = zeros(fftSize);
    for (let i = 0; i < ir.length; i++) {
        XX[i] = ir[i];
    }
    //Get Real DFT of the filter's impulse response
    let { ReX, ImX } = RDFTFromFFT(XX);
    let ReFR = ReX.slice(0),
        ImFR = ImX.slice(0),
        overlap = zeros(overlapSize);
    
    for (let seg = 0; seg < segCount; seg++) {
        //Initialize XX with the segment
        for (let i = 0; i < segSize; i++) {   
            //If the segment is out of range of the original signal, pad with zeros  
            XX[i] = ((seg * segSize) + i) >= signal.length ? 0 : signal[(seg * segSize) + i];
        }
        for (let j = segSize; j < fftSize; j++) {
            XX[j] = 0;
        }
        loadSegment(signal.slice(seg * segSize, (seg + 1) * segSize), XX);
        //Analyze frequency of segment
        ({ ReX, ImX } = RDFTFromFFT(XX, true)); 
        //Multiply segment freq signal by kernel freq signal
        ({ ReX, ImX } = freqMultiply(ReX, ImX, ReFR, ImFR, 0, fftSize / 2 + 1));
        //Extend Real and Imaginary signal from N / 2 + 1 to N
        ({ ReX, ImX } = extendRealFreqDomain(ReX, ImX));
        //Take the inverse FFT of the now convolved segment
        XX = inverseFFT(ReX, ImX)["ReX"];
        //Add the prior segment's overlap to this segment
        for (let i = 0; i < overlap.length; i++) {
            XX[i] = XX[i] + overlap[i];
        }
        //Save the samples that will overlap with the next segment
        for (let i = segSize; i < fftSize; i++) {
            overlap[i - segSize] = XX[i];
        }
        //concatenate convolved segment to output
        output.push(...XX.slice(0, segSize));
    }
    //Concatenate remaining overlap to output
    output.push(...overlap);
    return output;
}

// //If provided point spread function is separable (psf(xy) = h(x)v(y)) 
// //Separate into horizontal and vertical projections and return.
// //If not separable, return null;
// function separate(psf) {
//     let {rows, cols} = dim(psf);
//     let h = psf[0];
//     let v = [1];
//     for (let i = 1; i < rows; i++) {
//         let c = psf[i][0] / h[0];
//         for (let j = 1; j < cols; j++) {
//             if (c !== psf[i][j]) {
//                 //what is my rounding error...
//                 return false;
//             }
//         }
//         v[i] = c;
//     }
//     return {h, v};
// }

function convolve2D(signal, psf) {
    let { rows, cols } = dim(psf);
    // if (rows === 3 && rows === cols ) {
    //     //Naive 2d convolution
    // }
    // if (filterKernelIsSeperable) {
    //     //Decompose Kernel into horizontal and vertical projections
    //     //convolve rows with horizontal projection
    //     //convolve columns of intermediate image with vertical projection
    // } else {
    //     //convolveFFT2D
    // }
}

function InverseFFT2D(ReX, ImX) {
    //Take Inverse FFt of the Rows
    //Take Inverse FFT of the cols
}
const freqResolution = (fftSize, sampleRate) => sampleRate / fftSize;

const timeResolution = (fftSize, sampleRate) => fftSize / sampleRate;

module.exports = {
    "convolve" : convolveOutput,
    realDFT,
    inverseRDFT,
    correlate,
    FFT,
    inverseFFT,
    extendRealFreqDomain
}