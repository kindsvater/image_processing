const { multiply } = require('./flatimage/linear.js');
const { createRGBRelativeLuminance, RGBA, RGB } = require('./rgb.js');

//This matrix is used to convert linearized sRGB color to its corresponding color
//in the XYZ colorspace. The XYZ color is the matrix product of the 
//linearized sRGB color vector and the conversion matrix. 
const sRGBtoXYZMatrix = [
    [0.41239079926595923, 0.35758433938387785, 0.1804807884018343],
    [0.21263900587151022, 0.7151686787677557, 0.07219231536073371],
    [0.019330818715591835,0.11919477979462596, 0.9505321522496606]
]

const XYZtosRGBMatrix = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660,  1.8760108,  0.0415560],
    [0.0556434, -0.2040259,  1.0572252]
]

//Coordinates of sRGB red green and blue primary colors in linearized 3D space. 
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

//Given a linearized sRGB color, calculates the Relative Luminence of the color. 
//Relative Luminence is the Y stimulus in the XYZ colorspace.
const relativeLuminence = createRGBRelativeLuminance(sRGBtoXYZMatrix);

//Linearizes sRGB gamma-encoded color channel value in unit interval by applying
// sRGGB gamma decoding step-function. Value returned is in unit interval. 
function decodeGammaUI(stimulus) {
    if (stimulus < 0.04045) {
        return stimulus / 12.92;
    } else {
        return Math.pow(((stimulus + 0.055) / 1.055), 2.4);
    }
}

//Linearizes sRGB gamma-encoded  8bit color channel value by applying
// sRGB gamma decoding step function. Value returned is in unit interval.
function decodeGamma8Bit(colorChannel) {
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

//Converts sRGB color to XYZ colorspace.
function sRGBtoXYZ(rgb) {
    let linRGB = linearize8Bit(rgb);
    return multiply(sRGBtoXYZMatrix, linRGB);
}
//Linearizes the 8Bit color channels of a gamm-encoded sRGB color.
function linearize8Bit(rgb) {
    return rgb.map(cc => decodeGamma8Bit(cc));
}
//Gamma-encodes each color channel of a linear sRGB color to 8Bit values.
function delinearize8Bit(rgb) {
    return rgb.map(cc => encodeGamma8Bit(cc));
}
//Converts XYZ color to Gamma-encoded sRGB
function XYZtosRGB(xyz) {
    let linRGB = multiply(XYZtosRGBMatrix, xyz);
    return delinearize8Bit(linRGB);
}

//Creates gray sRGB color from gray value between 0 and 256. 
//Set a to true if an RGBA output is desired.
function gray(gVal, a=false) {
    return a ? RGBA.color(gVal, gVal, gVal) : RGBA.color(gVal, gVal, gVal);
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
    decodeGammaUI,
    decodeGamma8Bit,
    encodeGammaUI,
    encodeGamma8Bit,
    linearize8Bit,
    'primaryChroma' : primaryChromaticityCoordinates.matrix,
    'whitepointChroma' : whitepointChroma.matrix,
    relativeLuminence,
    sRGBtoXYZ,
    XYZtosRGB,
    gray
}
