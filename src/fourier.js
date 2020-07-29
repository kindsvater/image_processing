const { bankRound, zeros } = require('./valuetype');

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
    //TODO: make compatible with signal with length not a power of 2.
    // let power = Math.log2(complexSig.length)
    // if (!Number.isInteger(power)) {
    //     // let n = Math.pow(2, Math.ceil(power));
    //     // for (i = complexSig.)
    //     //We could zero pad the signal to next power of two, 
    //     //Or perform the Chirp Z-Transform
    let tempR,
        tempI,
        m = bankRound(Math.log2(ReX.length)),
        j = ReX.length / 2;

    //Sort in Reverse Bit order
    for (let i = 1; i < ReX.length; i++) {
        if (i < j) {
            tempR = ReX[j];
            tempI = ImX[j];
            ReX[j] = ReX[i];
            ImX[j] = ImX[i];
            ReX[i] = tempR;
            ImX[i] = tempI;
        }
        let k = ReX.length / 2;
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
            for(let i = j - 1; i < ReX.length; i += spectraSize) {
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
    return {ReX, ImX};
}

//Transforms complex signal in frequency domain to complex signal in the time domain
function inverseFFT(ReX, ImX) {
    for (let k = 0; k < ReX.length; k++) {
        ImX[k] *= -1;
    }

    FFT(ReX, ImX);

    for (let i = 0; i < ReX.length; i++) {
        ReX[i] = ReX[i] / ReX.length;
        ImX[i] = -1 * ImX[i] / ReX.length;
    }

    return { ReX, ImX };
}

//From N-point time-domain signal, calculate the Real Frequency Spectrum using the 
//Fast Fourier Transform. The real spectrum is composed of ReX and ImX, which are both 
//N / 2 + 1 length signals.
function RDFTFromFFT(signal, real=false) {
    let ReX = signal.slice(0), //Initialize Real part of signal
        ImX = zeros(signal.length); //Initialize Imaginary part of signal
    FFT(ReX, ImX); //Take Fast Fourier Transform
    //Return Real DFT spectrum
    if (real) {
        return { 
            "ReX" : ReX.slice(0, signal.length / 2 + 1),
            "ImX" : ReX.slice(0, signal.length / 2 + 1)
        }
    }
    return { ReX, ImX };
}

//For 2-Dimensional spatial domain signal. Returns complex 2D signal in frequency domain. 
function FFT2D(signal) {
    let ReImg = [],
        ImImg = [],
        freq;
    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < signal.length; row++) {
        freq = RDFTFromFFT(signal[row]);
        ReImg[row] = freq.ReX;
        ImImg[row] = freq.ImX;
    }
    let ReColFreqs,
        ImColFreqs;
    //Take FFT of each column
    for (let col = 0; col < signal[0].length; col++) {
        ReColFreqs = [];
        ImColFreqs = [];
        for (let row = 0; row < signal.length; row++) {
            ReColFreqs[row] = ReImg[row][col];
            ImColFreqs[row] = ImImg[row][col];
        }
        FFT(ReColFreqs, ImColFreqs);
        //Store Results back in column
        for (let row = 0; row < signal.length; row++) {
            ReImg[row][col] = ReColFreqs[row];
            ImImg[row][col] = ImColFreqs[row];
        }
    }
    return {ReImg, ImImg};
}

module.exports = {
    realDFT,
    inverseRealDFT,
    FFT2D,
    FFT,
    inverseFFT,
}