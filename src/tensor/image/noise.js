const { sRGBtoXYZ, XYZtosRGB } = require("../../colorspace/srgb");
const { XYZ, illuminant } = require("../../colorspace/cie.js");
const { randNormal } = require("../../stat/randomgeneration");
const { clampTo } = require("../../utility/num_util.js");
const srgb = require("../../colorspace/srgb");

//only does monochromatic for sRGB images at the moment.
function addNoise(image, density, monochromatic=false) {
    console.log("LAB WHITE")
    console.log(illuminant.D65);
    console.log(sRGBtoXYZ([255, 0, 0]));
    if (density <= 0) return image;
    if (monochromatic) {
        image.forEachPixel((pixel, row, column) => {
            if (Math.random() < density) {
                let xyz = sRGBtoXYZ(pixel);
                XYZ.setY(xyz, clampTo(XYZ.yStim(xyz) + randNormal(), 0, 1.0));
                //console.log(xyz);
                let sRGB = XYZtosRGB(xyz);
                //console.log(sRGB);
                image.setPixelAt(row, column, sRGB);
            }
        })
    } else {
        image.forEachPixel((pixel, row, column) => {
            if (Math.random() < density) {
                let r = randNormal();
                for (let i = 0; i < 3; i++) {
                    pixel[i] = pixel[i] * r;
                }
                image.setPixel(row, column, pixel);
            }
        })
    }
    return image;
}

module.exports = {
    addNoise
}