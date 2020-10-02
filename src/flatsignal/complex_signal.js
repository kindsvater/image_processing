const { mag } = require('../utility/linearalg_util.js');
const { bankRound } = require('../utility/num_util.js');
/**
 * Calculates the magnitude of a sinusoid represented by a complex number.
 * @param {Number} re The Real Component 
 * @param {Number} im The Imaginary component
 * @returns The magnitude of the sinusoid.
 */
function magnitude(re, im) {
    return mag([re, im]);
}
/**
 * Calculates the phase of a sinusoid represented by a complex number. 
 * @param {Number} re The Real Component
 * @param {Number} im The Imaginary Component
 * @returns {Number} The phase in Radians
 */
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
/**
 * Converts a Rectangular representation of a complex sinusoid to Polar form.
 * @param {Number} re The Real Component of Rectangular Form
 * @param {Number} im The Imaginary Component of Rectangular Form
 * @returns {Array.<Number>} An array with the Polar magnitude and phase: [magnitude, phase]
 */
function rectToPolar(re, im) {
    return [magnitude(re, im), phase(re, im)];
}
/**
 * Converts complex sinusoid in polar form to rectangular form. 
 * @param {Number} magnitude 
 * @param {Number} phase 
 * @returns {Array.<Number>} An array with the Rectangular Real and Imaginary Components: [Real, Imaginary]
 */
function polarToRect(magnitude, phase) {
    return [magnitude * Math.cos(phase), magnitude * Math.sin(phase)];
}
/**
 * Converts n-length signal in the frequency domain, represented in Rectangular Form, to Polar Form.
 * @param {Array.<Number>} ReX n-length array of Real Components 
 * @param {Array.<Number>} ImX n-length array of Imaginary Components
 * @returns {Array.<Array.<Number>>} An array with the n-length magnitude and phase components: [[Magnitude], [Phase]]
 */
function polarSignal(ReX, ImX) {
    let MagX = [],
        PhaseX = [];
 
    for (let i = 0; i < ReX.length; i++) {
        MagX[i] = magnitude(ReX[i], ImX[i]);
        PhaseX[i] = phase(ReX[i], ImX[i]);
    }

    return [MagX, PhaseX];
}
/**
 * Converts n-length signal in the frequency domain, represented in Polar Form, to Rectangular Form.
 * @param {Array.<Number>} MagX n-length array of Magnitude Components
 * @param {Array.<Number>} PhaseX n-length array of Phase Components
 * @returns {Array.<Array.<Number>>} An array with both n-length Real and Imaginary Components: [[Real], [Imaginary]]
 */
function rectSignal(MagX, PhaseX) {
    let ReX = [],
        ImX = [];
    
    for (let i = 0; i < MagX.length; i++) {
        ReX[i] = MagX[i] * Math.cos(PhaseX[i]);
        ImX[i] = MagX[i] * Math.sin(PhaseX[i]);
    }
    return [ReX, ImX];
}
/**
 * Unwraps the phase value by adding or subtracting 2PI from each value based on the minimum difference 
 * between adjacent samples. Use when the phase component has too many discontinuities and is hard to visualized.
 * @param {Array.<Number>} phaseX n-length array of Phase Components
 * @returns {Array.<Number>} An n-length array of unwrapped Phase Components.
 */
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