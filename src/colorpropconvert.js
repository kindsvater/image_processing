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
    grayValue = 255 * lightness / 100; //probably not a linear function but let's give it a go.
    return RGBA.color(grayValue, grayValue, grayValue);
}

PropConvert.RGBAGradient = (start, end, step) => {
    let grad = [];

    for (let i = 0; i < step; i++) {
        let intenseEnd = i;
        let intenseStrt = step - i;

        let color = RGBA.color(
            Math.round((intenseStrt * RGBA.redLevel(start) + intenseEnd * RGBA.redLevel(end)) / step),
            Math.round((intenseStrt * RGBA.greenLevel(start) + intenseEnd * RGBA.greenLevel(end)) / step),
            Math.round((intenseStrt * RGBA.blueLevel(start) + intenseEnd * RGBA.blueLevel(end)) / step)
        );

        grad.push(color);
    }

    return grad;
}