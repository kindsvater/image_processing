const { RGB, RGBA } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
const { lightness } = require('./cie');

const ImageReader = (function() {
    function ImageReader(img, a) {
        this.img = img;
        this.colorIdx = 0;
        this.a = a;
        //this.pixels = [];
        this.lightVector; //maybe choose object so you can cache different ranges?/
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
        this.colorIdx += this.a ? 4 : 3;
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
        let LVector = []
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
            lightIdxs[lVec[m]].push(m * this.a ? 4 : 3);
        }
        return lightIdxs;
    }
    ImageReader.prototype.reset = function() {
        this.colorIdx = 0;
    }
    return ImageReader;
})();

module.exports = {
    ImageReader
}