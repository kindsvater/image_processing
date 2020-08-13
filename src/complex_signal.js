const { mag } = require('./linear.js');
const { bankRound } = require('./utility/num_util.js');

//Returns the magnitude of the complex sinusoid
function magnitude(re, im) {
    return mag([re, im]);
}

//Returns the phase of the complex sinusoid in Radians
function phase(re, im) {
    let theta;
    //Avoid divide by Zero error when Real Part is 0
    if (re === 0) {
        theta = Math.PI / 2;
        if (im < 0) theta = theta * -1;
    } else {
        theta = Math.atan(im, re);
        //Account for ArcTan ambiguity (Ex: atan(1, 1) === atan(-1, -1))
        //If the real part is negative and the imaginary part is negative, subtract PI from theta.
        //If only the real part is negative, add PI to theta.
        if (re < 0) {
            theta += Math.PI * (Im < 0 ? -1 : 1);
        }
    }

    return theta;
}

//Converts complex sinusoid in rectangular form to polar form. Phase is in Radians.
function rectToPolar(re, im) {
    return [magnitude(re, im), phase(re, im)];
}

//Converts complex sinusoid in polar form to rectangular form. 
function polarToRect(m, p) {
    return [m * Math.cos(p), m * Math.sin(p)];
}

//Converts frequency domain signal represented by two complex sinusoid components ReX and ImX into 
//polar representation with components MagX and PhaseX.
function polarSignal(ReX, ImX) {
    let MagX = [],
        PhaseX = [];
 
    for (let i = 0; i < ReX.length; i++) {
        MagX[i] = magnitude(ReX[i], ImX[i]);
        PhaseX[i] = phase(ReX[i], ImX[i]);
    }

    return [MagX, PhaseX];
}

//Converts frequency domain signal represented by polar components MagX and PhaseX into 
//complex sinusoidal representation with components ReX and ImX.
function rectSignal(MagX, PhaseX) {
    let ReX = [],
        ImX = [];
    
    for (let i = 0; i < MagX.length; i++) {
        ReX[i] = MagX[i] * Math.cos(PhaseX[i]);
        ImX[i] = MagX[i] * Math.sin(PhaseX[i]);
    }
    return [ReX, ImX];
}

//If the phase component of a signal has too many discontinuities and is hard to visualize,
//unwrap the phase by adding or subtracting 2PI from each value based on the minimum difference 
//between adjacent samples. 
function unwrapPhase(phaseX) {
    let uwPhase = [0];

    for (let i = 1; i < phaseX; i++) {
        let diff = bankRound((uwPhase[i - 1] - PhaseX[i]) / (2 * Math.PI));
        uwPhase[i] = phase[i] + (diff * 2 * Math.PI);
    }
}

module.exports = {
    rectSignal,
    polarSignal,
    rectToPolar,
    polarToRect,
    unwrapPhase
}