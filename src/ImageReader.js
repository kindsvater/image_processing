const { RGB, RGBA } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
const { lightness } = require('./cie');

const ImageReader = (function() {
    function ImageReader(img, width, a) {
        this.img = img;
        this.colorIdx = 0;
        this.widthRes = width;
        this.heightRes = img.length / width / (a ? 4 : 3);
        this.tupleSize = a ? 4 : 3;
        this.lightVector; //maybe choose object so you can cache different ranges?/
    }
    ImageReader.prototype.areValidIndices = function(rowI, colI) {
        if (rowI >= this.heightRes) throw new Error("Row index " + rowI + " is out of bounds.");
        if (colI >= this.widthRes) throw new Error("Columnindex " + colI + " is our of bound.");
        return true;
    }
    ImageReader.prototype.flatPixelIndex = function(rowI, colI) {
        areValidIndices(rowI, colI);
        return (rowI * this.widthRes * this.tupleSize) + (colI * this.tupleSize);
    } 
    ImageReader.prototype.nextColor = function(a=false) {
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
    ImageReader.prototype.eachColor = function(cb, a=false) {
        while(this.hasNextColor()) {
            let curr = this.colorIdx;
            let cont = cb(this.nextColor(a), curr);
            if (cont === false) break;
        }
        return;
    }
    ImageReader.prototype.hasNextColor = function() {
        return this.colorIdx < this.img.length;
    }
    ImageReader.prototype.toPixels = function(a=false) {
        //if (this.pixels) return this.pixels; could add caching
        let pixelVector = [];
        this.eachColor((color) => {
            pixelVector.push(color);
        });
        this.reset();
        //this.pixels = pixelVector;
        return pixelVector;
    }
    ImageReader.prototype.toLightness = function(range=255) {
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
    ImageReader.prototype.getLightIdxs = function(range=255) {
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
    ImageReader.prototype.reset = function() {
        this.colorIdx = 0;
    }
    ImageReader.prototype.redChannelAt = function(rowI, colI) {
        return this.img[this.flatPixelIndex(rowI, colI)];
    }
    ImageReader.prototype.greenChannelAt = function(rowI, colI) {
        return this.img[this.flatPixelIndex(rowI, colI) + 1];
    }
    ImageReader.prototype.blueChannelAt = function(rowI, colI) {
        return this.img[this.flatPixelIndex(rowI, colI) + 2];
    }
    ImageReader.prototype.pixelAt = function(rowI, colI) {
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
    ImageReader.prototype.getRedChannel = function(flat) {
        return getChannel(this.img, this.heightRes, this.widthRes, 0, this.tupleSize)(flat);
    }
    ImageReader.prototype.getGreenChannel = function(flat) {
        return getChannel(this.img, this.heightRes, this.widthRes, 1, this.tupleSize)(flat);
    }
    ImageReader.prototype.getBlueChannel = function(flat) {
        return getChannel(this.img, this.heightRes, this.widthRes, 2, this.tupleSize)(flat);
    }
    ImageReader.prototype.getAlphaChannel = function(flat) {
        if (this.tupleSize !== 4) {
            return null;
        }
        return getChannel(this.img, this.heightRes, this.widthRes, 3, this.tupleSize)(flat);     
    }
    return ImageReader;
})();

module.exports = {
    ImageReader
}