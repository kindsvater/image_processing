'use strict';
const { dim } = require('../utility/linearalg_util');
const { zeros } = require('../utility/array_util.js');
const { bankRound } = require('../utility/num_util.js');
const { isPowerOfTwo } = require('../utility/type_util.js');

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

//Divide two n length complex signals in the frequency domain, X / Y.
function divideFreq(ReX, ImX, ReY, ImY) {
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

//Calculates the number of complex multiplications per output sample
function irFFTSizeCost(size, exponent, m) {
    return (size * (exponent + 1)) / (size - m + 1);
}

//Finds optimal FFT size for an impulse response of length m. 
function optFFTSize(m) {
    let size = 2;
    let exponent = 1;
    while (size < m) {
        size *= 2;
        exponent++;
    }
    let cost = Infinity;
    while (cost > irFFTSizeCost(size * 2, exponent + 1, m)) {
        size *= 2;
        exponent++;
        cost = irFFTSizeCost(size, exponent, m);
    }
    return size;
}


function convolveReal(signal, ir) {
    let n = signal.length;
    let m = ir.length;
    let fftSize = optFFTSize(m);
    let segSize = fftSize - m + 1;
    let segCount = Math.ceil(n / segSize);
    let overlapSize = fftSize - segSize;
    let overlap = zeros([overlapSize], true);
    let XX = [];
    let output = [];

    //load impulse response signal into XX
    loadSignal(XX, fftSize, ir, 0, m);

    //Get Real DFT of the filter's impulse response
    let { ReX, ImX } = realFFT(XX, true);
    let ReFR = ReX.slice(0),
        ImFR = ImX.slice(0);
        
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


//Given one N-point time domain signal, the Discrete Fourier Transform decomposesas the signal into
//two N/2-point frequency domain signals ReX and ImX. These are returned as key-value pairs of an object.
//The values of ReX and ImX are scalars that scale a sinusoid function (Cosine for ReX and Sine for ImX)
//whose frequency, relative to the original signal, is the domain value of the frequency signal.
function realDFT(sig) {
    if  (sig.length % 2 !== 0) throw new Error("Length of signal must be even");
    let ReX = [],
        ImX = [],
        i,
        j;
    
    for (i = 0; i < sig.length / 2; i++) {
        ReX[i] = 0;
        ImX[i] = 0;
    }
    
    for (i = 0; i < sig.length / 2; i++) {
        for (j = 0; j < sig.length; j++) {
            ReX[i] += sig[j] * Math.cos(2 * Math.PI * i * j / sig.length);
            ImX[i] -= sig[j] * Math.sin(2 * Math.PI * i * j / sig.length);
        }
    }

    return { ReX, ImX }
}
//From two N / 2 + 1 sized vectors of real and imaginary components. Synthesizes N point signal.
function inverseRealDFT(ReX, ImX) {
    if (ReX.length !== ImX.length) throw new Error("Real and Imaginary vectors must be the same length");
    let X = [],
        cosX = [],
        sinX = [],
        n = ReX.length + ImX.length - 2;
        i,
        j;

    for (i = 0; i < (n / 2) + 1; i++) {
        cosX[i] = ReX[i] / (n / 2); //convert real signal to cos amplitude scalars
        sinX[i] = - ImX[i] / (n / 2); //convert imaginary signal to sin amplitude scalars
    }
    cosX[0] = ReX[0] / n;
    cosX[ReX.length - 1] = ReX[ReX.length - 1] / n;

    for (i = 0; i < n; i++) {
        X[i] = 0; //Initialize time-domain signal 
        //Sum scaled basis functions for each frequency
        for (j = 0; j < (n / 2) + 1; j++) {
            X[i] = X[i] + cosX[j] * Math.cos(2 * Math.PI * j * i / n);
            X[i] = X[i] + sinX[j] * Math.sin(2 * Math.PI * j * i / n);
        }
    }
    return X;
}

//Fast Fourier Transform of a Complex Signal in the time domain. 
function FFT(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary signal component lengths do not match");
    if (n === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(n)) {
        radix2FFT(ReX, ImX); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransform(ReX, ImX);
    }
}

function radix2FFT(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary signal component lengths do not match");
    if (!isPowerOfTwo(n)) throw new Error("Signal length must be a power of 2 to perform radix-2 transform");
    if (n === 1) return { ReX, ImX };
    let m = bankRound(Math.log2(n)),
        j = n / 2,
        tempR,
        tempI;

    //Sort in Reverse Bit order
    for (let i = 1; i < n; i++) {
        if (i < j) {
            tempR = ReX[j];
            tempI = ImX[j];
            ReX[j] = ReX[i];
            ImX[j] = ImX[i];
            ReX[i] = tempR;
            ImX[i] = tempI;
        }
        let k = n / 2;
        while (k <= j) {
            j = j - k;
            k = k / 2;
        }
        j = j + k;
    }
    let g = 0;
    //Loop for each stage
    for (let stage = 1; stage <= m; stage++) {  
        let spectraSize = Math.pow(2, stage);      
        let spectraSize2 = spectraSize / 2;
        let ur = 1;
        let ui = 0;
        //calculate sine and cosine values
        let sr = Math.cos(Math.PI / spectraSize2);
        let si = Math.sin(Math.PI / spectraSize2);

        //Loop for each Sub-DTF
        for (j = 1; j <= spectraSize2; j++) {
            //Loop for each Butterfly
            for(let i = j - 1; i < n; i += spectraSize) {
                let ip = i + spectraSize2;
                //Butterfly calculation
                tempR = ReX[ip] * ur - ImX[ip] * ui;
                tempI = ReX[ip] * ui + ImX[ip] * ur;
                ReX[ip] = ReX[i] - tempR;
                ImX[ip] = ImX[i] - tempI;
                ReX[i] = ReX[i] + tempR;
                ImX[i] = ImX[i] + tempI;
            }
            tempR = ur;
            ur = tempR * sr - ui * si;
            ui = tempR * si + ui * sr;
        }
    }
    return { ReX, ImX };
}

//Transforms complex signal in frequency domain to complex signal in the time domain
function inverseFFT(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary signal component lengths do not match");
    for (let k = 0; k < n; k++) {
        ImX[k] *= -1;
    }

    FFT(ReX, ImX);

    for (let i = 0; i < n; i++) {
        ReX[i] = ReX[i] / n;
        ImX[i] = -1 * ImX[i] / n;
    }

    return { ReX, ImX };
}

//From N-point time-domain signal, calculate the Real Frequency Spectrum using the 
//Fast Fourier Transform. The real spectrum is composed of ReX and ImX, which are both 
//N / 2 + 1 length signals.
function realFFT(signal, realOutput=false) {
    let n = signal.length,
        ReX = signal.slice(0), //Initialize Real part of signal
        ImX = zeros(n); //Initialize Imaginary part of signal

    FFT(ReX, ImX); //Take Fast Fourier Transform
    
    if (realOutput) {
        //Return Real DFT spectrum 
        return { 
            "ReX" : ReX.slice(0, n / 2 + 1),
            "ImX" : ReX.slice(0, n / 2 + 1)
        }
    } else {
        //Return complex spectrum
        return { ReX, ImX };
    }
}
//For 2-Dimensional spatial domain signal. Returns complex 2D signal in frequency domain. 
function FFT2D(signal) {
    let rn = signal.length,
        cn = signal[0].length,
        ReImg = [],
        ImImg = [],
        freq;
    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < rn; row++) {
        freq = realFFT(signal[row], false);
        ReImg[row] = freq.ReX;
        ImImg[row] = freq.ImX;
    }
    let ReColFreqs,
        ImColFreqs;
    //Take FFT of each column
    for (let col = 0; col < cn; col++) {
        ReColFreqs = [];
        ImColFreqs = [];
        for (let row = 0; row < rn; row++) {
            ReColFreqs[row] = ReImg[row][col];
            ImColFreqs[row] = ImImg[row][col];
        }
        FFT(ReColFreqs, ImColFreqs);
        //Store Results back in column
        for (let row = 0; row < rn; row++) {
            ReImg[row][col] = ReColFreqs[row];
            ImImg[row][col] = ImColFreqs[row];
        }
    }
    return {ReImg, ImImg};
}

function chirpZTransform(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary components must have same number of elements.");
    let m = 1;
    while (m < n * 2 + 1) m *= 2;
    let tcos = [],
        tsin = [],
        ReA = [],
        ImA = [],
        ReB = [],
        ImB = [];

    for (let i = 0; i < n; i++) {
        let j = i * i % (n * 2);
        tcos[i] = Math.cos(Math.PI * j / n);
        tsin[i] = Math.sin(Math.PI * j / n);
        ReA[i] = ReX[i] * tcos[i] + ImX[i] * tsin[i];
        ImA[i] = ImX[i] * tcos[i] - ReX[i] * tsin[i];
    }
    //Pad with zeros so that length is radix-2 number M
    for (let i = n; i < m; i++) {
        ReA[i] = 0;
        ImA[i] = 0;
    }

    ReB[0] = tcos[0];
    ImB[0] = tsin[0];
    for (let i = 1; i < n; i++) {
        ReB[i] = ReB[m - i] = tcos[i];
        ImB[i] = ImB[m - i] = tsin[i];
        console.log(ReB[n]);
    }

    radix2FFT(ReA, ImA)
    radix2FFT(ReB, ImB)
    multiplyFreq(ReA, ImA, ReB, ImB);
    for (let i = 0; i < n; i++) {
        ReX[i] = ReA[i] * tcos[i] + ImA[i] * tsin[i];
        ImX[i] = ImA[i] * tcos[i] - ReA[i] * tsin[i];
    }
    return ReX, ImX;
}

function convolveComplex(ReX, ImX, ReY, ImY) {
    let n = ReX.length;
    if (n !== ImX.length || n !== ReY.length || n !== ImY.length) {
        throw new Error("Complex signals and their component's lengths must match.");
    }
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
    correlate,
    extendRealFreqDomain,
    convolveComplex,
    convolveReal,
    multiplyFreq,
    divideFreq
}