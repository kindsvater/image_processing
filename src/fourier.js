const { bankRound, zeros, isPowerOfTwo } = require('./valuetype');
const { convolveComplex } = require('signal.js');
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

    convolveComplex(ReA, ImA, ReB, ImB);
    for (let i = 0; i < n; i++) {
        ReX[i] = ReA[i] * tcos[i] + ImA[i] * tsin[i];
        ImX[i] = ImA[i] * tcos[i] - ReA[i] * tsin[i];
    }
    return ReX, ImX;
}

module.exports = {
    realDFT,
    inverseRealDFT,
    FFT2D,
    FFT,
    realFFT,
    inverseFFT,
}