const { is8BitInt, inUnitInterval } = require('./valuetype.js');

//Linearizes sRGB gamma-encoded color channel value in unit interval by applying
// sRGGB gamma decoding step-function. Value returned is in unit interval. 
function decodeGammaFromUI(stimulus) {
    if (stimulus < 0.04045) {
        return stimulus / 12.92;
    } else {
        return Math.pow(((stimulus + 0.055) / 1.055), 2.4);
    }
}

//Linearizes sRGB gamma-encoded  8bit color channel value by applying
// sRGB gamma decoding step function. Value returned is in unit interval.
function decodeGammaFrom8Bit(colorChannel) {
    let uiCC = colorChannel / 255;
    return decodeGammaUI(uiCC);
}

//From linear stimulus in unit Interval applies sRGB piecewise gamma encoding function .
// Returned value is in Unit Interval.
function encodeGammaUI(linStim) {
    if (linStim < 0.00313080495) {
        return linStim * 12.92;
    } else {
        return Math.pow(linStim, 1 / 2.4) * 1.055 - 0.055;
    }
}

//From linear stimulus in unit interval applies sRGB piecewise gamma encoding function .
// Returned value is 8Bit Integer.
function encodeGamma8Bit(linStim) {
    let uiCC = encodeGammaUI(linStim);
    return Math.round(uiCC * 255); 
}

//Coordinates of sRGB RGB primaries in linearized 3D space. 
const primaryChromaticityCoordinates = {
    matrix : [
        [0.64, 0.33, 0.03],
        [0.30, 0.60, 0.10],
        [0.15, 0.06, 0.79]
    ],
    obj : {
        r : {
            x : 0.64,
            y : 0.33,
            z : 0.03
        },
        g : {
            x : 0.30,
            y : 0.60,
            z : 0.10
        },
        b : {
            x : 0.15,
            y : 0.06,
            z : 0.79
        }
    }
}

//Chromaticity Coordinates of sRGB reference white (CIE Illuminant D65) in linear 3D space.
const whitepointChroma = {
    matrix : [0.3127, 0.3290, 0.3583],
    obj : {
        x : 0.3127,
        y : 0.3290,
        z : 0.3583
    }
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
    'decodeGammaUI': decodeGammaFromUI,
    'decodeGamma8Bit': decodeGammaFrom8Bit,
    'encodeGammaUI' : encodeGammaUI,
    'encodeGamma8Bit' : encodeGamma8Bit
}
