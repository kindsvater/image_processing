'use strict';
const { bankRound } = require('../../utility/num_util.js');
const { zeros } = require('../../utility/array_util/init.js');
const { isPowerOfTwo } = require('../../utility/type_util.js');
const { convolveComplex } = require('../../flatsignal/signalprocessing.js');

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

function chirpZImage(complexImage, dimIndex, isCol=false, chans=3) {
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

function fft1DImage(complexImage, dimIndex, isCol=false, chans) {
    let signalLength = isCol ? complexImage.shape[0] : complexImage.shape[1];
    if (signalLength === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(signalLength)) {
        radix2FFTImage(complexImage, dimIndex, isCol, chans); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZImage(complexImage, dimIndex, isCol, chans);
    }
    return complexImage;
}

module.exports = {
    fft1DImage,
}