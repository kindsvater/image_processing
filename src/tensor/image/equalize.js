const { sRGBtoXYZ, XYZtosRGB } = require('../../colorspace/srgb.js');
const { XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('../../colorspace/cie.js');
const { FrequencyDist } = require('../../stat/histogram.js');
const { RGBImage } = require('./rgbimage.js');

//Given an RGBA image, equalizes the lightness of the image between the minimum and maximum values
function equalizeImgLight(realImage, min, max) {
    let histogram = new FrequencyDist(realImage.toLightness(), 64, min, max);
    let equalCDF = histogram.equalize(256);
    let equalizedImageData = [];

    realImage.forEachPixel((pixel) => {
        let lab = XYZtoLAB(sRGBtoXYZ(pixel));
        let l8bit = Math.floor(LAB.LVal(lab) / 100 * 255);

        if (l8bit >= min && l8bit < max) {
            let new8BitL = equalCDF[histogram.intervalIndex(l8bit)];
            let equalsrgb = XYZtosRGB(
                LABtoXYZ(
                    LAB.color(new8BitL / 255 * 100, LAB.AVal(lab), LAB.BVal(lab)
                ), undefined, true)
            );
            equalizedImageData.push(...equalsrgb);
        } else {
            equalizedImageData.push(...pixel);
        }
        equalizedImageData.push(255);
    });

    return new RGBImage(equalizedImageData, realImage.width, true);
}

module.exports = {
    equalizeImgLight
}
