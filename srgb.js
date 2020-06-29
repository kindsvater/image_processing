let srgb = module.exports;

//Converts one sRGB gamma-encoded color channel decimal value between 0.0-1.0. 
function sRGBtoLinear(colorChannel) {
    if (colorChannel < 0.04045) {
        return colorChannel / 12.92;
    }
    return Math.pow(((colorChannel + 0.055) / 1.055), 2.4);
}

//Given sRGB color channel values between 0-255, returns the luminence of the color as 0.0-1.0.
srgb.luminence = (r, g, b) => {
    if (!(isSRGBValue(r) && isSRGBValue(g) && isSRGBValue(b))) {
        return null;
    }
    let vR = sRGBtoLinear(r / 255);
    let vG = sRGBtoLinear(g / 255);
    let vB = sRGBtoLinear(b / 255);
    let Y = 0.2126 * vR + 0.7152 * vG + 0.0722 * vB;
    return Y;
}

//Given luminence, calculates non-contextual lightness: 0(black) - 100(white). 
srgb.perceivedLightness = (luminence) => {
    if (luminence <= (216 / 24389)) {
        return luminence * (24389 / 27);
    }
    return Math.pow(luminence, (1 / 3)) * 116 - 16;
}

let tone = (r, g, b) => (Math.max(r, g, b) + Math.min(r, g, b)) / 2;

function isSRGBValue(channelValue) {
    return channelValue < 256 && channelValue >= 0;
}