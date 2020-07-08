const { is8BitInt, inUnitInterval } = require('./valuetype.js');

//Linearizes sRGB gamma-encoded color channel value in unit interval by applying
// sRGGB gamma decoding step-function. Value returned is in unit interval. 
function decodeGammaUI(stimulus) {
    if (stimulus < 0.04045) {
        return stimulus / 12.92;
    }
    return Math.pow(((stimulus + 0.055) / 1.055), 2.4);
}

//Linearizes sRGB gamma-encoded  8bit color channel value by applying
// sRGB gamma decoding step function. Value returned is in unit interval.
function decodeGamma8Bit(colorChannel) {
    let uiCC = colorChannel / 255;
    return decodeGammaUI(uiCC);
}

//Not a proper luma conversion for sRGB, 
//relies on primaries and white point in NTSC color spaces like YIQ an YUV
// function lumaCCIR601(rPrime, gPrime, bPrime) {
//     let YPrime = 0.299 * rPrime + 0.587 * gPrime + 0.114 * bPrime;
//     return YPrime;
// }

//Again not a proper luma function for sRGB, output should be luma values between 16 and 235
//This function produces values from 0 to 255 which must be clamped.
// function lumaBT709(rPrime, gPrime, bPrime) {
//     let luma = 0.2126 * rPrime + 0.7152 * gPrime + 0.0722 * bPrime;
//     return luma;
// }

module.exports = {
    'decodeGammaUI': decodeGammaUI,
    'decodeGamma8Bit': decodeGamma8Bit,
}
