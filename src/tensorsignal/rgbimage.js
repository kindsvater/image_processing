const { relativeLuminence, linearize8Bit } = require('./../colorspace/srgb.js');
const { lightness } = require('./../colorspace/cie.js');
const { Tensor } = require('./../tensor/tensor.js');

const RGBImage = (function() {
    function RGBImage(img, width, a) {
        this.colorIdx = 0;
        this.width = width;
        this.height = img.length / width / (a ? 4 : 3);
        Tensor.call(this, [this.height, width, a ? 4 : 3], img);
    }
    RGBImage.prototype = Object.create(Tensor.prototype);
    RGBImage.prototype.constructor = RGBImage;
    const $RGBI = RGBImage.prototype;

    $RGBI.tupleSize = function() {
        return this.shape[3];
    }
    $RGBI.imageSize = function() {
        return this.width * this.height;
    }
    $RGBI.forEachPixel = function(callbackFn, a=false) {
        let pixel = [];
        let chanIndex = 0;
        let totalChans = this.a && a ? 4 : 3;
        let range = [[],[],[0, [], totalChans - 1]];

        this.forEachVal(range, (value, dataIndex) => {
            pixel[chanIndex++] = value;
            if (chanIndex === totalChans) {
                callbackFn(pixel, dataIndex - chanIndex + 1); //Helpful to pass along the tensorIndex?
                pixel = [];
                chanIndex = 0;
            }
        });
    }

    $RGBI.toPixels = function(a=false) {
        let pixelList = [];
        let endIndex = 0;
        this.forEachPixel((pixel) => {
            pixelList[endIndex++] = pixel;
        }, a);

        return pixelList;
    }

    $RGBI.toLightness = function(range=255) {
        let lightnessList = [];
        let endIndex = 0;
        this.forEachPixel((pixel) => {
            lightnessList[endIndex++] = Math.round(
                (lightness(relativeLuminence(linearize8Bit(pixel)))) / 100 * range 
            )
        }, false);
        return lightnessList;
    }

    $RGBI.lightnessDataIndices = function(range=255) {
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

    $RGBI.pixelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex]);
    }
    $RGBI.redChannelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex, 0]);
    }
    $RGBI.greenChannelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex, 1]);
    }
    $RGBI.blueChannelAt = function(rowIndex, colIndex) {
        return this.getExplicit([rowIndex, colIndex, 2]);
    }

    $RGBI.getRedChannel = function(flat=true) {
        return this.get([[],[],0]);
    }
    $RGBI.getGreenChannel = function(flat=true) {
        return this.get([[],[],1]);
    }
    $RGBI.getBlueChannel = function(flat=true) {
        return this.get([[],[],2]);
    }
    $RGBI.getAlphaChannel = function(flat=true) {
        if (this.tupleSize() < 4) return null;
        return this.get([[],[],3]);     
    }

    return RGBImage;
})();

// const ComplexImage = (function() {
//     function ComplexImage(ReX, ImX=null, width, a) {
//         this.ReX = ReX;
//         this.ImX = ImX ? ImX : zeros([ReX.shape])
//     }
// })
module.exports = {
    RGBImage
}