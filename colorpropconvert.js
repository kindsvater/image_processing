const { rgba } = require('./rgb.js');
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
    return rgba(grayValue, grayValue, grayValue);
}

PropConvert.rgbaGradient = (start, end, step) => {
    let grad = [];

    for (let i = 0; i < step; i++) {
        let intenseEnd = i;
        let intenseStrt = step - i;

        let color = rgba.color(
            Math.round((intenseStrt * rgba.redLevel(start) + intenseEnd * rgba.redLevel(end)) / step),
            Math.round((intenseStrt * rgba.greenLevel(start) + intenseEnd * rgba.greenLevel(end)) / step),
            Math.round((intenseStrt * rgba.blueLevel(start) + intenseEnd * rgba.blueLevel(end)) / step)
        );

        grad.push(color);
    }

    return grad;
}