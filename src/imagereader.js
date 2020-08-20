const ImageReader = (function() {
    function ImageReader(img, a=false) {
        this.data = img;
        this.tupleSize = a ? 4 : 3;
        this.colorIdx = 0;
    }
    const $IR = ImageReader.prototype;

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
        //if (this.pixels) return this.pixels; could add caching
        let pixelVector = [];
        this.eachColor((color) => {
            pixelVector.push(color);
        });
        this.reset();
        //this.pixels = pixelVector;
        return pixelVector;
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

    return ImageReader;
})();

module.exports = {ImageReader};