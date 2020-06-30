let srgb = module.exports;

//Converts one sRGB gamma-encoded color channel decimal value between 0.0-1.0. 
function sRGBtoLinear(colorChannel) {
    if (colorChannel < 0.04045) {
        return colorChannel / 12.92;
    }
    return Math.pow(((colorChannel + 0.055) / 1.055), 2.4);
}

//Given sRGB color channel values between 0-255, returns the luminence of the color as 0.0-1.0.
srgb.luminence = (rPrime, gPrime, bPrime) => {
    if (!(isSRGBValue(rPrime) && isSRGBValue(gPrime) && isSRGBValue(bPrime))) {
        return null;
    }
    let r = sRGBtoLinear(rPrime / 255);
    let g = sRGBtoLinear(gPrime / 255);
    let b = sRGBtoLinear(bPrime / 255);
    let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return Y;
}

//Given luminence, calculates non-contextual lightness: 0(black) - 100(white). 
srgb.CIEPerceivedLightness = (luminence) => {
    if (luminence <= (216 / 24389)) {
        return luminence * (24389 / 27);
    }
    return Math.pow(luminence, (1 / 3)) * 116 - 16;
}

srgb.CCIR601Luma = (r, g, b) => {
    let YPrime = 0.299 * r + 0.587 * g + 0.114 * b;
    return YPrime;
}

srgb.BT709Luma = (r, g, b) => {
    let YPrime = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return YPrime;
}

let tone = (r, g, b) => (Math.max(r, g, b) + Math.min(r, g, b)) / 2;

function isSRGBValue(channelValue) {
    return channelValue < 256 && channelValue >= 0;
}

//If sRGB can represent 255 x 255 x 255 = 16,777,216 colors, how many discrete luminosity values are in this color space?
function getColorsOfSameBrightness() {
    let YtoRGBMap = [];
    for (let r = 0; r < 256; r++) {
        for (let g = 0; g < 256; g++) {
            for (let b = 0; b < 256; b++) {
                //Y = srgb.luminence(r, g, b);
                //Y = CIEPerceivedLightness(m);
                Y = srgb.CCIR601Luma(r,g,b);
                if(Math.round(Y) === 77) {
                    YtoRGBMap.push([r, g, b])
                }
            }
        }
    }
    console.log(YtoRGBMap);;
    console.log("Unique Color Count: " + 65025);
    console.log("unique Y val count: " + YtoRGBMap.length);
}

function compareBrightnessFunctions(r, g, b) {
    let Y = srgb.luminence(r, g, b);
    console.log(srgb.CIEPerceivedLightness(Y) / 100 * 255 );
    console.log(srgb.CCIR601Luma(r, g, b));
    console.log(srgb.BT709Luma(r, g, b));
}

//compareBrightnessFunctions(77, 77, 77);
    