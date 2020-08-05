const { RGBA } = require('./rgb.js');
const PropConvert = module.exports;

PropConvert.lightnessToASCII = (lightness) => {
    let ASCIIByDensity = "`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
    let maxLightness = 101;
    if (lightness >= 0 && lightness <= maxLightness) {
        return ASCIIByDensity.charAt(Math.floor((lightness * ASCIIByDensity.length) / maxLightness));
    } else {
        console.log("help " + lightness)
    }
}

PropConvert.lightnessToGrayscale = (lightness) => {
    grayValue = 255 * lightness / 100; 
    return RGBA.color(grayValue, grayValue, grayValue);
}
