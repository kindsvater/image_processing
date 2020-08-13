const { RGB, RGBA } = require('./rgb.js');
const { relativeLuminence, linearize8Bit } = require('./srgb.js');
const { lightness } = require('./cie.js');
const { Tensor } = require('./tensor.js');

const JKImage = (function() {
    function JKImage(img, width, a) {
        this.colorIdx = 0;
        this.width = width;
        this.height = img.length / width / (a ? 4 : 3);
        this.tupleSize = a ? 4 : 3;
        this.lightVector; //maybe choose object so you can cache different ranges?/
        Tensor.call(this, [this.height, width, a], img);
    }
    JKImage.prototype = Object.create(Tensor.prototype);
    JKImage.prototype.constructor = JKImage;
    const $JKI = JKImage.prototype;

    $JKI.areValidIndices = function(rowI, colI) {
        if (rowI >= this.heightRes) throw new Error("Row index " + rowI + " is out of bounds.");
        if (colI >= this.widthRes) throw new Error("Columnindex " + colI + " is our of bound.");
        return true;
    }
    $JKI.flatPixelIndex = function(rowI, colI) {
        areValidIndices(rowI, colI);
        return (rowI * this.widthRes * this.tupleSize) + (colI * this.tupleSize);
    } 
    $JKI.nextColor = function(a=false) {
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
    $JKI.eachColor = function(cb, a=false) {
        while(this.hasNextColor()) {
            let curr = this.colorIdx;
            let cont = cb(this.nextColor(a), curr);
            if (cont === false) break;
        }
        return;
    }
    $JKI.hasNextColor = function() {
        return this.colorIdx < this.data.length;
    }
    $JKI.toPixels = function(a=false) {
        //if (this.pixels) return this.pixels; could add caching
        let pixelVector = [];
        this.eachColor((color) => {
            pixelVector.push(color);
        });
        this.reset();
        //this.pixels = pixelVector;
        return pixelVector;
    }
    $JKI.toLightness = function(range=255) {
        //if (this.lightVector) ) Cache and also check range;
        let LVector = [];
        this.eachColor((color) => {
            LVector.push(
                Math.round(
                    (lightness(relativeLuminence(linearize8Bit(color)))) / 100 * range 
                )
            );   
        });
        this.reset();
        return LVector;
    }
    $JKI.getLightIdxs = function(range=255) {
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
    $JKI.reset = function() {
        this.colorIdx = 0;
    }
    $JKI.redChannelAt = function(rowI, colI) {
        return this.data[this.flatPixelIndex(rowI, colI)];
    }
    $JKI.greenChannelAt = function(rowI, colI) {
        return this.data[this.flatPixelIndex(rowI, colI) + 1];
    }
    $JKI.blueChannelAt = function(rowI, colI) {
        return this.data[this.flatPixelIndex(rowI, colI) + 2];
    }
    $JKI.pixelAt = function(rowI, colI) {
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
    $JKI.getRedChannel = function(flat) {
        return getChannel(this.data, this.heightRes, this.widthRes, 0, this.tupleSize)(flat);
    }
    $JKI.getGreenChannel = function(flat) {
        return getChannel(this.data, this.heightRes, this.widthRes, 1, this.tupleSize)(flat);
    }
    $JKI.getBlueChannel = function(flat) {
        return getChannel(this.data, this.heightRes, this.widthRes, 2, this.tupleSize)(flat);
    }
    $JKI.getAlphaChannel = function(flat) {
        if (this.tupleSize !== 4) {
            return null;
        }
        return getChannel(this.img, this.heightRes, this.widthRes, 3, this.tupleSize)(flat);     
    }
    return JKImage;
})();

module.exports = {
    JKImage
}