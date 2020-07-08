const {rgba, redLevel, greenLevel, blueLevel} = require('./rgba.js');
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

        let color = rgba(
            Math.round((intenseStrt * redLevel(start) + intenseEnd * redLevel(end)) / step),
            Math.round((intenseStrt * greenLevel(start) + intenseEnd * greenLevel(end)) / step),
            Math.round((intenseStrt * blueLevel(start) + intenseEnd * blueLevel(end)) / step)
        );

        grad.push(color);
    }

    return grad;
}