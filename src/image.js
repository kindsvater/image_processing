const { RGB, RGBA } = require('./rgb.js');
const { relativeLuminence, linearize8Bit } = require('./srgb.js');
const { lightness } = require('./cie.js');
const { Tensor } = require('./tensor.js');

const Image = (function() {
    function ImageReader(img, width, a) {
        this.img = img;
        this.colorIdx = 0;
        this.widthRes = width;
        this.heightRes = img.length / width / (a ? 4 : 3);
        this.tupleSize = a ? 4 : 3;
        this.lightVector; //maybe choose object so you can cache different ranges?/
    }
    Image.prototype = Object.create(Tensor.prototype);
    Image.prototype.constructor = Image;
    const $IR = Image.prototype;

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
                this.img[this.colorIdx], this.img[this.colorIdx + 1],
                this.img[this.colorIdx + 2], this.img[this.colorIdx + 3]
            );
        } else {
            color = RGB.color(
                this.img[this.colorIdx], this.img[this.colorIdx + 1], this.img[this.colorIdx + 2]
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
        return this.colorIdx < this.img.length;
    }
    $IR.toPixels = function(a=false) {
        //if (this.pixels) return this.pixels; could add caching
        let pixelVector = [];
        this.eachColor((color) => {
            pixelVector.push(color);
        });
        this.reset();
        //this.pixels = pixelVector;
        return pixelVector;
    }
    $IR.toLightness = function(range=255) {
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
        return this.img[this.flatPixelIndex(rowI, colI)];
    }
    $IR.greenChannelAt = function(rowI, colI) {
        return this.img[this.flatPixelIndex(rowI, colI) + 1];
    }
    $IR.blueChannelAt = function(rowI, colI) {
        return this.img[this.flatPixelIndex(rowI, colI) + 2];
    }
    $IR.pixelAt = function(rowI, colI) {
        let pixelI = this.flatPixelIndex(rowI, colI);
        return RGB.color(this.img[pixelI], this.img[pixelI + 1], this.img[pixelI + 2]);
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
        return getChannel(this.img, this.heightRes, this.widthRes, 0, this.tupleSize)(flat);
    }
    $IR.getGreenChannel = function(flat) {
        return getChannel(this.img, this.heightRes, this.widthRes, 1, this.tupleSize)(flat);
    }
    $IR.getBlueChannel = function(flat) {
        return getChannel(this.img, this.heightRes, this.widthRes, 2, this.tupleSize)(flat);
    }
    $IR.getAlphaChannel = function(flat) {
        if (this.tupleSize !== 4) {
            return null;
        }
        return getChannel(this.img, this.heightRes, this.widthRes, 3, this.tupleSize)(flat);     
    }
    return Image;
})();

module.exports = {
    Image
}