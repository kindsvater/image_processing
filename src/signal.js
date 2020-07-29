'use strict';
const { dim } = require('./lin');
const { zeros } = require('./valuetype');
const { inverseFFT, realFFT } = require('./fourier');


const displayRefA = 1;
const audioRefA = 0.00001;
const dBFromAmp = (sigA, refA) => 20 * Math.log10(sigA / refA);
const dBFromPow = (sigP, refP) => 10 * Math.log10(sigP / refP);
//Extend the real frequency domain from N / 2 + 1 to N. 
//Useful when you want to calculate the Inverse Fast Fourier Transform 
//but your frequency signals ReX and ImX only cover the real domain. 
function extendRealFreqDomain(ReX, ImX, inPlace=false) {
    let ReEX = inPlace ? ReX : ReX.slice(0),
        ImEX = inPlace ? ImX : ImX.slice(0),
        n = (ReX.length - 1) * 2;

    for (let i = (n / 2) + 1; i < n; i++) {
        ReEX[i] = ReEX[n - i];
        ImEX[i] = -1 * ImEX[n - i];
    }
    return { ReEX, ImEX };
}

//Multiply two N length complex signals in the frequency domain, X and H, by one another. 
function multiplyFreq(ReX, ImX, ReH, ImH, min=0, max=0, inPlace=false) {
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
    let n = sig.length,
        m = ir.length,
        Y = [];

    for (let i = 0; i < n + m; i++) {
        Y[i] = 0;
    }

    for (let i = 0; i < n; i++) {
        for (j = 0; j < m; j++) {
            Y[i + j] = Y[i + j] + (sig[i] * ir[j]);
        }
    }
    return Y;  
}

//Convolve n-sample time-domain signal with m-sample impulse response. Output sample calculations
//are performed independently of one another. Ouput: n * m - 1 length output signal.
function convolveOutput(sig, ir) {
    let n = sig.length,
        m = ir.length,
        Y = [];

    for (let i = 0; i < n + m; i++) {
        Y[i] = 0
        for (let j = 0; j < m; j++) {
            if (i - j < 0) continue;
            if (i - j > n) continue;
            Y[i] = Y[i] + (ir[j] * sig[i - j]);
        }
    }
    return Y;
}

//Given two time-domain signals, returns a third signal, the cross-correlation. The cross-correlation
//signal's amplitude is a measure of the resemblance of the target signal to the received signal at 
//a time-point x.
function correlate(receivedSig, targetSig) {
    let preFlip = targetSig.reverse();
    return convolveOutput(receivedSig, preFlip);
}

//Load origin signal spanning from fromInd up to toInd into dest array and pad the rest of
// dest with zeros up to destN. If fromInd is out of range of origin signal, pads eith zeros.
function loadSignal(dest, destN, origin, fromInd, toInd) {
    let padding = (toInd > origin.length) ? toInd - origin.length : 0;
    let loadRange = toInd - fromInd - padding;
    
    for (let i = 0; i < loadRange; i++) {
        dest[i] = origin[fromInd + i];
    }
    for (let j = loadRange; j < destN; j++) {
        dest[j] = 0;
    }
    return dest;
}

function convolveReal(signal, ir, fftSize=0) {
    if (fftSize === 0) {
        fftSize = 1;
        while (fftSize < ir.length) {
            fftSize *= 2;
        }
        fftSize *= 2;
    }
    let n = signal.length,
        m = ir.length,
        segSize = fftSize + 1 - m,
        segCount = Math.ceil( n / segSize),
        overlapSize = fftSize - segSize,
        overlap = zeros(overlapSize),
        XX = [],
        output = [];
    //load impulse response signal into XX
    loadSignal(XX, fftSize, ir, 0, m);

    //Get Real DFT of the filter's impulse response
    let { ReX, ImX } = realFFT(XX, true);
    let ReFR = ReX.slice(0),
        ImFR = ImX.slice(0),
        
    for (let seg = 0; seg < segCount; seg++) {
        loadSignal(XX, fftSize, signal, seg * segSize, (seg + 1) * segSize);
        //Analyze frequency of segment
        ({ ReX, ImX } = realFFT(XX, true)); 
        //Multiply segment freq signal by kernel freq signal
        ({ ReX, ImX } = multiplyFreq(ReX, ImX, ReFR, ImFR, 0, fftSize / 2 + 1));
        //Extend Real and Imaginary signal from N / 2 + 1 to N
        let { ReEX, ImEX } = extendRealFreqDomain(ReX, ImX)
        //Take the inverse FFT of the now convolved segment
        XX = inverseFFT(ReEX, ImEX)["ReX"];
        //Add the prior segment's overlap to this segment
        for (let i = 0; i < overlapSize; i++) {
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



function convolveComplex(ReX, ImX, ReY, ImY) {
    let n = ReX.length;
    if (n !== ImX.length || n !== ReY.length || n !== ImY.length) throw
        new Error("Complex signals and their component's lengths must match.");
    FFT(ReX, ImX);
    FFT(ReY, ImY);
    multiplyFreq(ReX, ImX, ReY, ImY, 0, n, true);
    inverseFFT(ReX, ImX);
    return { ReX, ImX }
}   

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
    extendRealFreqDomain,
    convolveComplex,
    convolveReal
}