const { RGB, RGBA } = require('../colorspace/rgb.js');
const { relativeLuminence, linearize8Bit } = require('../colorspace/srgb.js');
const { lightness } = require('../colorspace/cie.js');

const ImageReader = (function() {
    function ImageReader(img, a=false) {
        this.data = img;
        this.tupleSize = a ? 4 : 3;
        this.colorIdx = 0;
    }
    const $IR = ImageReader.prototype;

    $IR.areValidIndices = function(rowI, colI) {
        if (rowI >= this.heightRes) throw new Error("Row index " + rowI + " is out of bounds.");
        if (colI >= this.widthRes) throw new Error("Columnindex " + colI + " is our of bound.");
        return true;
    }

    $IR.flatPixelIndex = function(rowI, colI) {
        areValidIndices(rowI, colI);
        return (rowI * this.widthRes * this.tupleSize) + (colI * this.tupleSize);
    }

    $IR.nextColor = function(a=false) {
        let color;
        if (a) {
            color = RGBA.color(
                this.data[this.colorIdx], this.data[this.colorIdx + 1],
                this.data[this.colorIdx + 2], this.data[this.colorIdx + 3]
            );
        } else {
            color = RGB.color(
                this.data[this.colorIdx], this.data[this.colorIdx + 1], this.data[this.colorIdx + 2]
            );
        }
        this.colorIdx += this.tupleSize;
        return color;
    } 

    $IR.eachColor = function(cb, a=false) {
        while(this.hasNextColor()) {
            let curr = this.colorIdx;
            let cont = cb(this.nextColor(a), curr);
            if (cont === false) break;
        }
        return;
    }

    $IR.hasNextColor = function() {
        return this.colorIdx < this.data.length;
    }

    $IR.toPixels = function(a=false) {
        let pixelVector = [];
        this.eachColor((color) => {
            pixelVector.push(color);
        }, a);
        this.reset();
        return pixelVector;
    }

    $IR.toLightness = function(range=255) {
        let lightnessList = [];
        let endIndex = 0;
        this.eachColor((color) => {
            lightnessList[endIndex++] = Math.round(
                (lightness(relativeLuminence(linearize8Bit(color)))) / 100 * range 
            )
        }, false);
        return lightnessList;
    }

    $IR.getLightIdxs = function(range=255) {
        let lVec = this.lightVector ? this.lightVector : this.toLightness(range);
        let lightIdxs = [];
        for (let m = 0; m < lVec.length; m++) {
            if (!lightIdxs[lVec[m]]) {
                lightIdxs[lVec[m]] = [];
            }
            lightIdxs[lVec[m]].push(m * this.tupleSize);
        }
        return lightIdxs;
    }

    $IR.reset = function() {
        this.colorIdx = 0;
    }

    $IR.redChannelAt = function(rowI, colI) {
        return this.data[this.flatPixelIndex(rowI, colI)];
    }
    $IR.greenChannelAt = function(rowI, colI) {
        return this.data[this.flatPixelIndex(rowI, colI) + 1];
    }
    $IR.blueChannelAt = function(rowI, colI) {
        return this.data[this.flatPixelIndex(rowI, colI) + 2];
    }
    $IR.pixelAt = function(rowI, colI) {
        let pixelI = this.flatPixelIndex(rowI, colI);
        return RGB.color(this.data[pixelI], this.data[pixelI + 1], this.data[pixelI + 2]);
    }

    function getChannel(img, heightRes, widthRes, channel, tupleSize) {
        return function(flat=true) {
            let cc = [];
            let flatIndex = 0;
            if (flat) {
                let pi = 0;
                for (flatIndex = 0; flatIndex < img.length; flatIndex += tupleSize) {
                    cc[pi] = img[flatIndex + channel];
                    pi++
                }
            } else {
                for (let r = 0; r < heightRes; r++) {
                    cc[r] = [];
                    for (let c = 0; c < widthRes; c++) {
                        cc[r][c] = img[flatIndex + channel];
                        flatIndex += tupleSize;
                    }
                }
            }
            return cc;
        }
    }

    $IR.getRedChannel = function(flat) {
        return getChannel(this.data, this.heightRes, this.widthRes, 0, this.tupleSize)(flat);
    }
    $IR.getGreenChannel = function(flat) {
        return getChannel(this.data, this.heightRes, this.widthRes, 1, this.tupleSize)(flat);
    }
    $IR.getBlueChannel = function(flat) {
        return getChannel(this.data, this.heightRes, this.widthRes, 2, this.tupleSize)(flat);
    }
    $IR.getAlphaChannel = function(flat) {
        if (this.tupleSize !== 4) {
            return null;
        }
        return getChannel(this.img, this.heightRes, this.widthRes, 3, this.tupleSize)(flat);     
    }
    return ImageReader;
})();

module.exports = {ImageReader};