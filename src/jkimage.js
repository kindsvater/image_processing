const { RGB, RGBA } = require('./rgb.js');
const { relativeLuminence, linearize8Bit } = require('./srgb.js');
const { lightness } = require('./cie.js');
const { Tensor } = require('./tensor.js');

const JKImage = (function() {
    function JKImage(img, width, a) {
        this.colorIdx = 0;
        this.width = width;
        this.height = img.length / width / (a ? 4 : 3);
        Tensor.call(this, [this.height, width, this.tuple], img);
    }
    JKImage.prototype = Object.create(Tensor.prototype);
    JKImage.prototype.constructor = JKImage;
    const $JKI = JKImage.prototype;

    $JKI.tupleSize = function() {
        return this.shape[3];
    }

    $JKI.forEachPixel = function(callbackFn, a=false) {
        let pixel = [];
        let chanIndex;
        let lastIndex = a ? 3 : 2;
        this.forEachVal([[],[],[]], (value) => {
            chanIndex = pixel.length;
            pixel[chanIndex] = value;
            if (chanIndex === lastIndex) {
                callbackFn(pixel) //Helpful to pass along the tensorIndex and dataIndex?
                pixel = [];
            }
        });
    }

    $JKI.toPixels = function(a=false) {
        let pixelList = [];
        let endIndex = 0;
        this.forEachPixel((pixel) => {
            pixelList[endIndex++] = pixel;
        }, a);

        return pixelList;
    }

    $JKI.toLightness = function(range=255) {
        let lightnessList = [];
        let endIndex = 0;
        this.forEachPixel((pixel) => {
            lightnessList[endIndex++] = Math.round(
                (lightness(relativeLuminence(linearize8Bit(pixel)))) / 100 * range 
            )
        }, false);
        return lightnessList;
    }

    $JKI.lightnessDataIndices = function(range=255) {
        let lightnessList = this.toLightness(range);
        let lightDataIndices = [];
        for (let m = 0; m < lightnessList.length; m++) {
            if (!lightDataIndices[lightnessList[m]]) {
                lightDataIndices[lightnessList[m]] = [];
            }
            lightDataIndices[lightnessList[m]].push(m * this.tupleSize());
        }
        return lightDataIndices;
    }

    $JKI.pixelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex]);
    }
    $JKI.redChannelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex, 0]);
    }
    $JKI.greenChannelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex, 1]);
    }
    $JKI.blueChannelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex, 2]);
    }

    $JKI.getRedChannel = function(flat=true) {
        return this.get([[],[],0]);
    }
    $JKI.getGreenChannel = function(flat=true) {
        return this.get([[],[],1]);
    }
    $JKI.getBlueChannel = function(flat=true) {
        return this.get([[],[],2]);
    }
    $JKI.getAlphaChannel = function(flat=true) {
        if (this.tupleSize() < 4) return null;
        return this.get([[],[],3]);     
    }

    return JKImage;
})();

module.exports = {
    JKImage
}