(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{"./cie":3,"./rgb":9,"./srgb":12}],2:[function(require,module,exports){
const { invert, dot } = require('./lin.js');

const redLevel = (rgbColor) => rgbColor[0];
const greenLevel = (rgbColor) => rgbColor[1];
const blueLevel = (rgbColor) => rgbColor[2];

let rgb = module.exports

rgb.RGBA = {
    "color" : (r, g, b, a) => [r, g, b, a ? a : 255],
    redLevel,
    greenLevel,
    blueLevel,
    "alphaLevel" : (rgbaColor) => rgbaColor[3]
} 

rgb.RGB = {
    color : (r, g, b) => [r, g, b],
    redLevel,
    greenLevel,
    blueLevel
} 

rgb.averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
rgb.XYZconversionMatrix = (primaryCoords, XYZWhite) => {
    let primXYZ = [
        [primaryCoords[0][0],primaryCoords[1][0], primaryCoords[2][0]],
        [primaryCoords[0][1],primaryCoords[1][1], primaryCoords[2][1]],
        [primaryCoords[0][2],primaryCoords[1][2], primaryCoords[2][2]],
    ]

    let iPXYZ = invert(primXYZ);
    let XYZScalars = multiply(iPXYZ, XYZWhite);
    scaleMatrix = [[XYZScalars[0], 0, 0], [0, XYZScalars[1], 0], [0, 0, XYZScalars[2]]];
    return multiply(primXYZ, scaleMatrix);
}

function rgbWhiteToXYZ(whiteCoords) {
    whiteY = greenLevel(whiteCoords);
    return whiteCoords.map( cc => cc / whiteY);
}

rgb.createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);

},{"./lin.js":7}],3:[function(require,module,exports){
const { inNormalUI, clampTo } =  require('./valuetype.js');

//Device Invariant Representation of Color. The tristimulus values X, Y, and Z technically
// range from 0.0000 to infinity, but never exceed 1.2000 in practice. 
//One stimulus represents the intensity of the color
//Y : the relative luminance of the color (how bright it seems compared to the environment);
//The remaining two stimuluses represent the chromaticity or quality of the color 
//X : Mix of LMS cone response curves. Chosen to be non-negative
//Z : Approximation of the short cone response in the human eye.
//Stores the coordinates of standard illuminants in XYZ Colorspace.
const illuminant = {
    'a' : [1.0985, 1.0000, 0.3558], //Tungsten Filament Lighting.
    'c' : [0.9807, 1.0000, 1.1822], //Average Daylight.
    'e' : [1.000, 1.000, 1.000], //Equal energy radiator
    'D50' : [0.9642, 1.0000, 0.8249], // Horizon light at sunrise or sunset. ICC Standard Illuminant
    'D55' : [0.9568, 1.0000, 0.9214], //Mid-morning or mid-afternoon daylight.
    'D65' : [0.9505, 1.0000, 1.0890], //Daylight at Noon. 
    'none' : [2.0, 2.0, 2.0]
}

const XYZ = {
    color: (X, Y, Z, refWhite=illuminant.D65, clamp=false) => {
        if (clamp) {
            let cX = clampTo(X, 0, refWhite[0]),
                cY = clampTo(Y, 0, refWhite[1]),
                cZ = clampTo(Z, 0, refWhite[2]);
            return [cX, cY, cZ];
        } else {
            if (X < 0 || X > refWhite[0]) {
                throw new Error("X stimulus " + X + "out of range.");
            }
            if (Y < 0 || X > refWhite[1]) {
                throw new Error("Y stimulus " + Y + "out of range.");
            }
            if (Z < 0 || Z > refWhite[2]) {
                throw new Error("Z stimulus value " + Z + "out of range. ");
            }
            return [X, Y, Z];
        }
    },
    xStim : xyz => xyz[0],
    yStim : xyz => xyz[1],
    zStim : xyz => xyz[2],
}

//The CIE LAB color space is a device invariant representation of color that is designed to be
// perceptually uniform - there is a linear relationship between the apparent difference and the
// numerical differance of two colors. 
//L : 0 <= L <= 100. Pereceived lightness of the color (0=Black 100=Lightest White**)
    //** Lightest White is relative to an illuminant.
//a and b represent the chromaticity of the color.
//a : -128 <= a <= 128. Position between red and green (-128 = red, 128 = green)
//b : -128 <= b <= 128. Position between yellow and blue (-128 = yellow, 128 = blue)
const LAB = {
    color : (L, A, B) => {
        if ( Number.isNaN(L) || Number.isNaN(A) || Number.isNaN(B) ) {
            throw new TypeError("LAB value is NaN. Values provided must be numbers.");
        }
        if (!inNormalUI(L)) throw new Error( "Lightness value " + L + " must be in range 0 to 100");
        if (!(A >= -128 && A <= 128)) throw new Error("A value " + A + " must be in range -128 to 128 " + L + " " + B);
        if (!(B >= -128 && B <= 128)) throw new Error("A value " + B + " must be in range -128 to 128");

        return [L, A, B];
    }, 
    LVal : lab => lab[0],
    AVal : lab => lab[1],
    BVal : lab => lab[2],
}



//Given RGB tristimulus values in the unit interval, returns luminance  
//or brightness of the color relative to reference white D65. Luminence is a 
//float in the unit interval.
function relativeLuminence(r, g, b) {
    let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; //Second row of rgbToXYZ conversion matrix
    return Y;
}

//Normalizes relative luminence value in unit interval to float between 0.0 and 100.0.
function normalRLuminence(Y) {
    return Y * 100;
}

//Transforms single XYZ stimulus to its perceptually uniform value. This value is relative to corresponding
//stimulus of the referent white. 
function uniformPerception(XYZStim, whiteStim) {
    let r = XYZStim / whiteStim,
        e = 216 / 24389

    if ( r > e ) {
        return Math.pow(r, (1 / 3));
    }
    return ((841 / 108) * r) + (4 / 29);
}

function LABtoXYZ(lab, refWhite=illuminant.D65, clamp=false) {
    let Yf = (LAB.LVal(lab) + 16) / 116,
        Xf = (LAB.AVal(lab) / 500) + Yf,
        Zf = Yf - (LAB.BVal(lab) / 200),
        k = 24389 / 27,
        e = 216 / 24389,
        temp;
    
    let Yr = LAB.LVal(lab) > k * e ? Math.pow(Yf, 3) : LAB.LVal(lab) / k;
    temp = Math.pow(Xf, 3);
    let Xr = temp > e ? temp : (((116 * Xf) - 16) / k);
    temp = Math.pow(Zf, 3);
    let Zr = temp > e ? temp : (((116 * Zf) - 16) / k);

    return XYZ.color(Xr * XYZ.xStim(refWhite), Yr * XYZ.yStim(refWhite), Zr * XYZ.zStim(refWhite), refWhite, clamp);
}

//Converts normalized relative luminence to the perceived lightness or tone of that 
//luminence. Lightness values returned are floats in range 0.0 to 100.00 
function lightness(Y) {
    let Yn = 1.0000 //Y stimulus of the whitepoint. 

    let yr = uniformPerception(Y, Yn);
    return yr * 116 - 16;
}

function XYZtoLAB(xyz, refWhite=illuminant.D65) {
    let Xf = uniformPerception(XYZ.xStim(xyz), XYZ.xStim(refWhite));
    let Yf = uniformPerception(XYZ.yStim(xyz), XYZ.yStim(refWhite));
    let Zf = uniformPerception(XYZ.zStim(xyz), XYZ.zStim(refWhite));

    let L = 116 * Yf - 16;
    let a = 500 * (Xf - Yf);
    let b = 200 * (Yf - Zf)

    return LAB.color(L, a, b);
}

function adjustLight(lab, newLight) {
    let adjust =  newLight - LAB.LVal(lab);
    let a = (LAB.AVal(lab) - (500 * adjust / 116));
    let b = (LAB.BVal(lab) + (200 * adjust / 116));
 
    return LAB.color(newLight, a, b);;
}

module.exports = {
    relativeLuminence,
    normalRLuminence,
    lightness,
    XYZtoLAB,
    LABtoXYZ,
    adjustLight,
    illuminant,
    LAB,
    XYZ,
}

},{"./valuetype.js":13}],4:[function(require,module,exports){
const { zeros, initialize, round } = require("./valuetype");

const impulse = {
    "delta" : (n=16, shift=0, scale=1) => { 
        let d = zeros(n);
        d[shift] = scale;
        return d;
    },
    "step" : n => initialize(n, 1),
    "movingAverage" : n => initialize(n, 1 / n),
    "gauss" : (n, scale) => {
        let ir = [],
            x;
        for (let i = 0; i < n; i++) {
            x = Math.ceil(i - (n / 2));
            ir[i] = (1 / Math.sqrt(2 * Math.PI * scale)) * Math.exp(-((x * x) / (2 * scale * scale)));
        }
        return ir;
    }
}
function edgeEnhance(k) { return [[-k/8,-k/8,-k/8], [-k/8,k+1,-k/8], [-k/8,-k/8,-k/8]] }
const psf = {
    "box" : (rows, cols) => initialize(1, rows, cols),
    "delta" : edgeEnhance(0),
    "shiftSubtract" : [[0,0,0],[0,1,0],[0,0,-1]],
    "edgeDetect" : edgeEnhance(1),
    "edgeEnhance" : edgeEnhance,
    "gauss" : (m, n, scale) => {
        let psf = [],
        x,
        y;
        for (let r = 0; r < m; r++) {
            psf[r] = [];
            y = Math.ceil(r - (m / 2)); 
            for (let c = 0; c < n; c++) {
                x = Math.ceil(c - (n / 2));
                psf[r][c] = round((1 / (2 * Math.PI * scale * scale)) * Math.exp(-((x * x) + (y * y)) / (2 * scale * scale)), 4);
            }
        }
        return psf;
    }
}

// function makeFilter(freqResp, filterSize) {
//     let ReX = freqResp
//     let ftSize = 1024;

//     let ReX = [],
//         T = [];

//     //load frequency response
//     for (let i = 0; i < ftSize / 2 + 1; i++) {
//         if (i >= freqResp.length) {
//             ReX[i] = 0;
//         } else {
//             ReX[i] = freqResp[i];
//         }
//     }

//     //Shift signal filterSize / 2 points to the right
//     for (let i = 0; i < ftSize; i++) {
//         let ind = i + filterSize;
//         if (ind >= ftSize) {
//             ind = ind - ftSize;
//         }
//         T[ind] = ReX[i];
//     }

//     //Truncate and Window the Signal
//     for (let k = 0; k < filterSize; k++) {
//         if (k <= filterSize) ReX[k] *= (0.54 - 0.46 * Math.cos(2 * Math.PI * k / filterSize));
//         if (k > filterSize) ReX[k] = 0;
//     }

//     return ReX.slice(0, filterSize + 1);
// }

module.exports = {
    impulse,
    psf
}
},{"./valuetype":13}],5:[function(require,module,exports){
const { RGB, RGBA } = require('./RGB');
const { relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('./sRGB');
const { lightness, XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('./cie');
const { bankRound, zeros, isPowerOfTwo } = require('./valuetype');
const { ImageReader } = require('./ImageReader.js');
const { convolveComplex } = require('./signal.js');

//Given a flat array of RGB or RGBA image data and a function to calculate a property of a color: creates a 
//n-bin normalized histogram of the calculated property value for each color in the image as long as the value
//is within the specified range. The parameter a specifies the model for the image: true for RGBA and false for RGB
function histogram(img, calc, nbins, min, max, a=true) {
    if ((max - min + 1) % nbins !== 0) {
        throw new Error("Bin size is not an integer. Histogram range must be cleanly divisible by bin count");
    }
    let binSize = (max - min + 1) / nbins; 
    let total = 0; // Total colors with calculated values falling within range of histogram. 
    
    //Declare and initialize empty histogram
    let freqHist = [];
    for (let m = 0; m < nbins; m++) {
        freqHist[m] = 0;
    }

    let reader = new ImageReader(img, a);
    while(reader.hasNextColor()) {
        let L = calc(reader.nextColor())
        if (L >= min && L < max) {
            total = total + 1;
            freqHist[binIdx(L, min, binSize)] += 1;
        }
    }

    return freqHist.map((freq) => parseFloat((freq / total).toPrecision(4)));
}        

function binIdx(value, min, binSize) {
    return Math.floor((value - min) / binSize);
}

//Given an n-bin normalized histogram, returns its corresponding cumulative distribution. 
function cdf(normHist) {
    let cumProb = 0;
        c = [];
    for(let i = 0; i < normHist.length; i++) {
        cumProb += normHist[i];
        c[i] = parseFloat(cumProb.toPrecision(4));
    }
    return c;
}

//Given an n-bin Cumulative Distribution and a range of values, returns an n-index array of
//the equalized range. 
function equalizeHist(cdf, range) {
    let equal = [];
    for (let j = 0; j < cdf.length; j++) {
        equal[j] = cdf[j] * range;
    }
    return equal;
}

//Given an RGBA image, equalizes the lightness of the image between the minimum and maximum values
function equalizeImgLight(img, min, max) {
    let normHist = histogram(
        img,
        (rgbColor) => {
            return LAB.LVal(XYZtoLAB(sRGBtoXYZ(rgbColor))) / 100 * 255;
            },
        max - min + 1,
        min,
        max,
        true
    );

    let equalCDF = equalizeHist(cdf(normHist), 255);

    let read = new ImageReader(img, true);
    let labImg = [];
    while(read.hasNextColor()) {
        labImg.push(XYZtoLAB(sRGBtoXYZ(read.nextColor())));
    }

    XYZtoLAB([1.0378, 0.9509, 0.8658]);
    let equalImg = labImg.map(lab => {
        let L8Bit = Math.floor(LAB.LVal(lab) / 100 * 255);
        if (equalCDF[binIdx(L8Bit, min, 1)]) {
            L8Bit = equalCDF[binIdx(L8Bit, min, 1)];
        }
        let eqLAB = LAB.color(L8Bit / 255 * 100, LAB.AVal(lab), LAB.BVal(lab));
        let newXYZ = LABtoXYZ(eqLAB, undefined, true);
        let sRGB = XYZtosRGB(newXYZ);
        return sRGB;
    });
    let unclampedImg = [];
    for (let x = 0; x < equalImg.length; x++) {
        unclampedImg.push(RGB.redLevel(equalImg[x]), RGB.greenLevel(equalImg[x]), RGB.blueLevel(equalImg[x]), 255);
    }
    return new Uint8ClampedArray(unclampedImg);
}

//Use when performing a transfrom on multi-channel flat image in place.
//Translates the abstract index n in the input signal to its actual index in the image. 
function translateIndex(ind, chans, pOffset, from) {
    return from + (ind * chans * pOffset);
}

function radix2FFTImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (!to) to = ReX.length;
    let ccTotal = to - from,
        n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
        m = bankRound(Math.log2(n)),
        j = n / 2,
        tempR,
        tempI,
        c,
        tj,
        ti;

    //Sort in Reverse Bit order
    for (let i = 1; i < n; i++) {
        if (i < j) {
            ti = translateIndex(i, chans, pWidth, from);
            tj = translateIndex(j, chans, pWidth, from);
            for (c = 0; c < chans; c++) {
                tempR = ReX[tj + c];
                tempI = ImX[tj + c];
                ReX[tj + c] = ReX[ti + c];
                ImX[tj + c] = ImX[ti + c];
                ReX[ti + c] = tempR;
                ImX[ti + c] = tempI;
            }
        }
        let k = n / 2;
        while (k <= j) {
            j = j - k;
            k = k / 2;
        }
        j = j + k;
    }

    //Loop for each stage
    for (let stage = 1; stage <= m; stage++) {  
        let spectraSize = Math.pow(2, stage);      
        let halfSpectra = spectraSize / 2;
        let ur = 1;
        let ui = 0;
        //calculate sine and cosine values
        let sr = Math.cos(Math.PI / halfSpectra);
        let si = Math.sin(Math.PI / halfSpectra);

        //Loop for each Sub-DTF
        for (j = 1; j <= halfSpectra; j++) {
            //Loop for each Butterfly
            for (let i = j - 1; i < n; i += spectraSize) {
                let ip = translateIndex(i + halfSpectra, chans, pWidth, from);
                ti = translateIndex(i, chans, pWidth, from);
                //Butterfly calculation for each channel's signal
                for (c = 0; c < chans; c++) {
                    tempR = ReX[ip + c] * ur - ImX[ip + c] * ui;
                    tempI = ReX[ip + c] * ui + ImX[ip + c] * ur;
                    ReX[ip + c] = ReX[ti + c] - tempR;
                    ImX[ip + c] = ImX[ti + c] - tempI;
                    ReX[ti + c] = ReX[ti + c] + tempR;
                    ImX[ti + c] = ImX[ti + c] + tempI;
                }
            }
            tempR = ur;
            ur = tempR * sr - ui * si;
            ui = tempR * si + ui * sr;
        }
    }
    return {ReX, ImX};
}

function chirpZTransformImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (ReX.length !== ImX.length) throw new Error("Complex signal real and imaginary component lengths do not match");
    if (from < 0 || from >= ReX.length) throw new Error("From Index " + from + " is out of range");
    if (to > ReX.length) throw new Error("To Index " + to + " is out of range");
    if (!to) to = ReX.length;

    let ccTotal = to - from;
    let n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
    let m = 1;
    while (m < n * 2 + 1) m *= 2;
    //Perform the following Z-Transform for all channels
    for (let c = 0; c < chans; c++) {
        let tcos = [],
            tsin = [],
            ReA = [],
            ImA = [],
            ReB = [],
            ImB = [];

        for (let i = 0; i < n; i++) {
            let j = i * i % (n * 2),
                ti = translateIndex(i, chans, pWidth, from);
            tcos[i] = Math.cos(Math.PI * j / n);
            tsin[i] = Math.sin(Math.PI * j / n);
            ReA[i] = ReX[ti + c] * tcos[i] + ImX[ti + c] * tsin[i];
            ImA[i] = ImX[ti + c] * tcos[i] - ReX[ti + c] * tsin[i];
        }
        //Pad with zeros so that length is radix-2 number M
        for (let i = n; i < m; i++) {
            ReA[i] = 0;
            ImA[i] = 0;
        }

        ReB[0] = tcos[0];
        ImB[0] = tsin[0];
        for (let i = 1; i < n; i++) {
            ReB[i] = ReB[m - i] = tcos[i];
            ImB[i] = ImB[m - i] = tsin[i];
        }
        console.log(ReB);

        convolveComplex(ReA, ImA, ReB, ImB);
        for (let i = 0; i < n; i++) {
            let ti = translateIndex(i, chans, pWidth, from);
            ReX[ti + c] = ReA[i] * tcos[i] + ImA[i] * tsin[i];
            ImX[ti + c] = ImA[i] * tcos[i] - ReA[i] * tsin[i];
        }
    }
    return { ReX, ImX };
}

function FFT1DImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (ReX.length !== ImX.length) throw new Error("Complex signal component lengths do not match");
    if (from < 0 || from >= ReX.length) throw new Error("From Index " + from + " is out of range");
    if (to > ReX.length) throw new Error("To Index " + to + " is out of range");
    if (!to) to = ReX.length;
    let ccTotal = to - from;
    let n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
    if (n === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(n)) {
        radix2FFTImage(ReX, ImX, chans, from, to, pWidth, inPlace); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransformImage(ReX, ImX);
    }
}

/** Calculates Fourier Transform of a 2D image represented as a flat multi-channel array.
 * @param   {Array}   img     Flat array of pixel color channels. Length is number of pixels * number of channels.
 * @param   {Int}     pWidth  the width of the image in pixels.
 * @param   {Int}     chans   the number of color channels per pixel.
 * @param   {boolean} inPlace If true will alter the original image array in place.
 * @returns {Object} ComplexSignal     A complex representation of the flat image in the frequency domain.
 * @returns {Array}  ComplexSignal.ReX The real component of the signal in the freq domain.
 * @returns {Array}  ComplexSignal.ImX The imaginary component of the signal in the freq domain.
**/
function realFFT2DImage(img, pWidth, chans, inPlace=true) {
    let ReX = inPlace ? img : [];
        ImX = zeros(img.length);
        pHeight = img.length / pWidth / chans;
        console.log(img.length);
        console.log(pHeight);

    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < pHeight; row++) {
        FFT1DImage(ReX, ImX, chans, (row * pWidth * chans), ((row + 1) * pWidth * chans));
    }
    //Take FFT of each column
    for (let col = 0; col < pWidth; col++) {
        FFT1DImage(ReX, ImX, chans, col * chans, (((pHeight - 1) * pWidth) + (col + 1)) * chans, pWidth);
    }
    return {ReX, ImX};
}


module.exports = {
    histogram,
    cdf,
    equalizeHist,
    equalizeImgLight,
    realFFT2DImage,
    FFT1DImage
}
},{"./ImageReader.js":1,"./RGB":2,"./cie":3,"./sRGB":10,"./signal.js":11,"./valuetype":13}],6:[function(require,module,exports){
const { ImageReader } = require('./ImageReader.js');
const { histogram, cdf, equalizeImgLight, realFFT2DImage } = require('./imageProcessing');
const { RGB, RGBA } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
const { lightness } = require('./cie');
const { gaussGray } = require('./randGen');
const { zeros, round } = require('./valuetype');
const { randIntArray } = require('./randGen');
const { extendRealFreqDomain, FFT, inverseFFT } = require('./signal');
const { impulse, psf } = require('./filter');

// function checkFFT() {
//     let r = randIntArray(0, 10, 32);
//     let i = zeros(32);
//     console.log(r);
//     console.log(i);
//     FFT(r, i);
//     console.log(r);
//     console.log(i);
//     inverseFFT(r, i);
//     console.log(r);
//     console.log(i);
// }

let img = new Image();
let animate = false;
let odd = true;
const lValRange = 255;
const gradientSize = 25;
const gradOffset = 15;
const timestep = 30;
img.src = 'img/flowers.jpg';
img.onload = function() {
    //checkFFT();
    console.log(psf.gauss(5, 5, 1));
    let canvas = document.getElementById("manip");
    let context = canvas.getContext('2d');
    let whratio = this.height / this.width;

    let cwidth = 500;
    let cheight = whratio * cwidth;
    canvas.width = cwidth;
    canvas.height = cheight;
    context.drawImage(this, 0, 0, cwidth, cheight);
    let contextData = context.getImageData(0,0, cwidth, cheight);
    let rawImgData = contextData.data;
    console.log("image pix = " + rawImgData.length);
    console.log(rawImgData)
    let read = new ImageReader(rawImgData, cwidth, true);
    // console.log(read.getRedChannel());
    // console.log(read.widthRes);
    // console.log(read.heightRes);
    // console.log(read.widthRes * read.heightRes * 4);
    let LI = read.getLightIdxs();

    // convertImagetoASCII(rawImgData, cwidth, (textImage) => {
    //     document.getElementById('result').innerHTML = textImage;
    // });

    // convertImagetoGrayscale(rawImgData, cwidth, (gsImageData) => {
    //     contextData.data.set(gsImageData);
    //     context.putImageData(contextData, 0, 0); 
    // });
    // getRandomColorsOfLight(90000, 77, (randImageData) => {
    //     contextData.data.set(randImageData);
    //     context.putImageData(randImageData, 0, 0);
    // });

    // convertImgToRandBrightGradient(rawImgData, cwidth, (rImageData) => {
    //     console.log(rImageData);
    //     contextData.data.set(rImageData);
    //     context.putImageData(contextData, 0, 0); 
    // })
    let grays = gaussGray((10 * 10), 32);
    console.log(grays.length)
    let hist = [];
    for (let m = 0; m < 256; m++) {
        hist[m] = 0;
    }
    for (let g = 0; g < grays.length; g++) {
        hist[grays[g]] += 1;
    }

    let data = [];
    for (let i = 0; i < hist.length; i++) {
        data.push({name: i, value: hist[i] / grays.length})
    }
    displayHistogram('#old', data, "steelblue", 500, 1200)
    let grayImg = [];
    for (let g = 0; g < grays.length; g++) {
        grayImg.push(grays[g], grays[g], grays[g], 255);
    }
    console.log("Fourier");
    realFFT2DImage(grayImg, 10, 4, true);
    console.log(grayImg);
    contextData.data.set(new Uint8ClampedArray(grayImg));
    context.putImageData(contextData, 0, 0); 

    getLightnessValuesofImg(rawImgData, cwidth, (light) => {
        let lightIdxs = {};
        let original = {};
        for (let m = 1; m < light.length; m++) {
            if (!lightIdxs[light[m]]) {
                lightIdxs[light[m]] = [];
                original[light[m]] = [];
            }
            lightIdxs[light[m]].push(m * 4);
            original[light[m]].push([
                m * 4,
                rawImgData[m * 4],
                rawImgData[m * 4 + 1],
                rawImgData[m * 4 + 2],
                rawImgData[m * 4 + 3]
            ]);
        }
        // let eqimg = equalizeLightness(rawImgData);
        // console.log(eqimg)
        // contextData.data.set(eqimg);
        // context.putImageData(contextData, 0, 0); 
 
        console.log("light Indexes")
        console.log(lightIdxs)
        document.getElementById('stop').addEventListener('click', function() {
            if (animate) {
                animate = false;
                console.log("stop");
                setTimeout(function() {
                    console.log("stopping")
                    reverseCanvas(lightIdxs, context, cwidth, cheight);
                },
                gradientSize * timestep * 3);
            }
        });
        document.getElementById('start').addEventListener('click', function() {
            if (!animate) {
                //make so max does not overflow
                drawTheThing(0, gradOffset ? gradOffset : gradientSize, lightIdxs, cwidth, cheight, context);
                animate = true;
            }     
        });
    });
    getLightnessHistogram(rawImgData, (hst) => {
        displayHistogram('svg', hst, "steelblue", 500, 1200)
    })  
}


function getLightnessHistogram(rawImgData, next) {
    let binCount = 101,
    max = 100,
    min = 0,
    range = max - min,
    binSize = range / binCount;

    let hist = histogram(rawImgData, (rgbColor) => {
        let Y = relativeLuminence(linearize8Bit(rgbColor));
        return Math.round((lightness(Y) / 100) * (max));
    },
    binCount,
    min,
    max,
    true
    );
    
    next(hist.map((p, i) => {
        return {name: (i * binSize) + min, value : p}
    }));

    // let http = new XMLHttpRequest();
    // let url = "/lhist";
    // http.open('POST', url, true);
    // http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    // http.onreadystatechange = function() {
    //     if (http.readyState == 4 && http.status == 200) {
    //         next(JSON.parse(http.responseText));
    //     }
    // }
    // http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}

function equalizeLightness(rawImgData) {
    return equalizeImgLight(rawImgData, 0, 255);
}
function reverseCanvas(original, context, cwidth, cheight) {
    let imageData = context.getImageData(0,0, cwidth, cheight);
    for (let m = 0; m < lValRange + 1; m++) {
        setTimeout(function() {
            let L = lValRange - m;
            if (original[L]) {
                original[L].forEach( p => {
                    for (let c = 1; c < 5; c++) {
                        imageData.data[p[0] + c - 1] = p[c];
                    }
                });
            }
            context.putImageData(imageData, 0 , 0);
        },
       m * timestep);
    }
    console.log(imageData.data);
}
function updateLPixels(start, y, lightIdxs, grad, imageData, context, flip) {
    let L;
    if (flip) {
        L = y + start;
    } else {
        L = lValRange - (y + start);
    }
    if (lightIdxs[L]) {
        lightIdxs[L].forEach( p => {
            for (let c = 0; c < 4; c++) {
                imageData.data[p + c] = grad[y * 4 + c];
            }
        });
    }
    context.putImageData(imageData, 0, 0);
}

function drawTheThing(min, max, lightIdxs, cwidth, cheight, context) {
    getRandomLightGradient(min, max, function(grad) {
        let imageData = context.getImageData(0,0, cwidth, cheight);
        for (let y = 0; y < max - min; y++) {
            setTimeout(function() {
                updateLPixels(min, y, lightIdxs, grad, imageData, context, odd);
            }, timestep * y)
        }
    
        if (animate) {
            setTimeout(function() {
                let nxtMin = max;
                let nxtMax = nxtMin + gradientSize;
                if (nxtMin >= lValRange) {
                    nxtMin = 0;
                    nxtMax = gradOffset === 0 ? gradientSize : nxtMin + gradOffset;
                    odd = !odd;
                }
                if (nxtMax > lValRange) {
                    nxtMax = lValRange;
                }
                drawTheThing(nxtMin, nxtMax, lightIdxs, cwidth, cheight, context)
            },
                timestep * (max - min)
            );    
        }
    });    
}
function filterImage(route, rawImgData, imageWidth, next) {
    let http = new XMLHttpRequest();
    let url = route;
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let filtrdImgData = new Uint8ClampedArray(unclampedData);
            next(filtrdImgData);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}
function convertImagetoASCII(rawImgData, imageWidth, next) {
    let http = new XMLHttpRequest();
    let url = "/ascii";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            next(http.responseText);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}
function convertImagetoGrayscale(rawImgData, imageWidth, next) {
    filterImage('/gray', rawImgData, imageWidth, next);
}
function convertImageToRand(rawImgData, imageWidth, next) {
    filterImage('/randimg', rawImgData, imageWidth, next);
}
function convertImageToRandomColorLayers(rawImgData, imageWidth, next) {
    filterImage('/randlayer', rawImgData, imageWidth, next);
}
function convertImgToRandBrightGradient(rawImgData, imageWidth, next) {
    filterImage('/randgradient', rawImgData, imageWidth, next);
}
function getLightnessValuesofImg(rawImgData, imageWidth, next) {
    filterImage('/light', rawImgData, imageWidth, next);
}

function getRandomLightGradient(Lstart, Lend, next) {
    let http = new XMLHttpRequest();
    let url = "/randlgrad";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let grad = new Uint8ClampedArray(unclampedData);
            next(grad);
        }
    }
    http.send('start=' + Lstart + "&end=" + Lend);
}
function getRandomColorsOfLight(x, L, next) {
    let http = new XMLHttpRequest();
    let url = "/rand";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let randImgData = new ImageData( new Uint8ClampedArray(unclampedData), 300);
            next(randImgData);
        }
    }
    http.send('pixels=' + x + '&' + 'light=' + L);
}

function displayHistogram(selector, data, color, height, width) {
    let svg = d3.select(selector);
    let margin = ({top: 30, right: 0, bottom: 30, left: 40});
    let yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(null, data.format))
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

    let xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(i => data[i].name).tickSizeOuter(0))

    let x = d3.scaleBand()
    .domain(d3.range(data.length))
    .range([margin.left, width - margin.right])
    .padding(0.1)

    let y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top])

    

    svg.append('g').attr("fill", color)
        .selectAll("rect")
        .data(data)
        .join("rect")
            .attr("x", (d, i) => x(i))
            .attr("y", d => y(d.value))
            .attr("height", d => y(0) - y(d.value))
            .attr("width", x.bandwidth());

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);
}

},{"./ImageReader.js":1,"./cie":3,"./filter":4,"./imageProcessing":5,"./randGen":8,"./rgb":9,"./signal":11,"./srgb":12,"./valuetype":13}],7:[function(require,module,exports){
//Calculates and returns the magnitude (spatial length) of a vector.
const mag = vector => Math.sqrt(vector.reduce((acc, curr) => acc + (curr * curr)));
//A and B are both N length vectors. Returns the angle in Radians between them.
const angle = (A, B) => Math.acos(dot(A, B) / (mag(A) * mag(B)));
//A and B are both vectors of length 3. Returns vector C of length 3 that is orthogonal to A and B.
const cross = (A, B) => [
    (A[1] * B[2]) - (A[2] * B[1]),
    (A[2] * B[0]) - (A[0] * B[2]),
    (A[0] * B[1]) - (A[1] * B[0])];
//Calculates and returns the inverse of a square matrix. If matrix is not valid or not square, returns false.
function invert(square) {
    let sDim = dim(square);
    if (!(sDim && sDim.rows === sDim.cols)) {
        throw new err("Given Matrix must be square.")
    } 
    
    let I = [];
    let C = [];
    for(let i = 0; i < sDim.rows; i++) {
        I.push([]);
        C.push([]);
        for (let m = 0; m < sDim.rows; m++) {
            I[i][m] = i === m ? 1 : 0;
            C[i][m] = square[i][m];
        }
    }

    let diag;
    for (let r = 0; r < sDim.rows; r++) {
        diag = C[r][r];
        if (diag === 0) {
            for (let s = r + 1; s < sDim.rows; s++) {
                if (C[s][r] !== 0) {
                    let temp = C[r];
                    C[r] = C[s];
                    C[s] = temp;
                    temp = I[r];
                    I[r] = I[s];
                    I[s] = temp;
                }
            }
            diag = C[r][r];
            if (diag === 0) {
                return false;
            }
        }

        for (let i = 0; i < sDim.rows; i++) {
            C[r][i] = C[r][i] / diag;
            I[r][i] = I[r][i] / diag;
        }
        for (let g = 0; g < sDim.rows; g++) {
            if (g === r) {
                continue;
            }

            let h = C[g][r];

            for (let j = 0; j < sDim.rows; j++) {
                C[g][j] -= h * C[r][j];
                I[g][j] -= h * I[r][j];
            }
        }
    }

    return I;
}

//Returns the rows and columns of given matrix. If matrix is not valid, returns null.
function dim(matrix) {
    if (Array.isArray(matrix) && matrix.length > 0) {
        let rows = matrix.length;
        if (matrix[0] === undefined || matrix[0] === null) {
            return null;
        } else if (!Array.isArray(matrix[0])) {
            return { "rows": rows, "cols" : 1 }
        }
        let cols = matrix[0].length;
        for (let r = 0; r < matrix.length; r++) {
            if (Array.isArray(matrix[r])) {
                if (matrix[r].length !== cols) {
                    return null;
                }
            } else {
                return null;
            }
        }
        return {rows, cols}
    }
    return null;
}


function determinant(matrix) {
    let dimM = dim(matrix);
    if (dimM && dimM.rows !== dimM.cols) {
        return null;
    }
    let det = null;

    if (dimM.rows === 2) {
        det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    } else {
        det = 0;
        let even = false;
        for(let c = 0; c < dimM.rows; c++) {
            let scalar = matrix[0][c];
            let subMatrix = [];
            for (let r = 1; r < dimM.rows; r++) {
                let smRow = [];
                for (let col = 0; col < dimM.rows; col++) {
                    if (col !== c) {
                        smRow.push(matrix[r][col]);
                    }
                }
                subMatrix.push(smRow);
            }
            
            let subDet = determinant(subMatrix);
            if (even) {
                det -= scalar * subDet;
            } else {
                det += scalar * subDet;
            }
            even = !even;
        }
    }
    return det;
}

//Given two vectors of length n, returns the dot-product of their entries
function dot(A, B) {
    if (!(A && B) || A.length === 0 || A.length !== B.length) {
        throw new Error("Vectors A and B must be Arrays of the same length.");
    }
    let product = 0;
    for (let i = 0; i < A.length; i++) {
        product += A[i] * B[i];
    }
    return product;
}

function multiply(A, B) {
    let dimA = dim(A);
    let dimB = dim(B);
    if (!(dimA && dimB)) {
        console.log(dimA);
        console.log(dimB);
        throw new Error("A and B must be valid matrices.");

    }
    if (dimA.cols !== dimB.rows) {
        throw new Error(
            "The column count of Matrix A (" + dimA.cols +
            ") and the row count of B (" + dimB.rows + ") must match."
        );
    }

    let C = []; 
    //Set up C to be a dimA.rows x dimB.cols matrix
    //only perform if product is not a vector
    if (dimB.cols > 1) {
        for (let s = 0; s < dimA.rows; s++) {
            C.push([]);
        }
    }

    for (let i = 0; i < dimA.rows; i++) {
        for (let j = 0; j < dimB.cols; j++) {
            let sum = 0;
            for (let k = 0; k < dimA.cols; k++) {
                let av, bv;
                av = dimA.cols === 1 ? A[i] : A[i][k];
                bv = dimB.cols === 1 ? B[k] : B[k][j];
                
                sum = sum + av * bv;
            }
            if (dimB.cols > 1) {
                C[i][j] = sum;
            } else {
                C[i] = sum;
            }          
        }
    }
    return C;
}

module.exports = {
    dim,
    invert,
    multiply,
    dot,
    mag,
    angle,
    cross
}
},{}],8:[function(require,module,exports){
const { clampTo } = require('./valuetype.js');
//Creates a uniform histogram of 'bins' of height a = 1/n that are the sum of 
//probabilities of two outcomes. Probability in excess of a is distributed evenly 
//using a RobinHood algorithm. Returns arrays K and V where K is indices of
//the outcomes in the upper halves of each bin and V is the probability of the
//outcome in the lower halves of the bins. 
function robinHoodSquaredProbHistogram(p) {
    let K = []; //Indices corresponding to top of bar
    let V = []; //Bar division point
    let n = p.length;
    let a = 1 / n;
    let i = 0
    let j = 0; //i is index of min p. j is index of max p

    for (let y = 0; y < n; y++) {
        K[y] = y;
        V[y] = (y + 1) * a;
    }

    for (let m = 0; m < n - 1; m++) {

        //1. Find the indices i of minimum probability and j of maximum probability
        for (let s = 0; s < p.length; s++) {
            if (p[s] < p[i]) {
                i = s;
            } else if (p[s] > p[j]) {
                j = s;
            }
        }
        //2. Distribute probability above a from maximum bar to minimum bar
        K[i] = j;
        V[i] = (i * a) + p[i];
        p[j] = p[j] - (a - p[i]);
        p[i] = a;
    }

    return {'K': K, 'V': V}
}

//Generates a random index from a probability histogram. 
//A probability histogram is represented by the arrays K and V
//First generates a random float from 0 through 1. 
//stored in arr
function randProbHistogramInt(K, V) {
    //check that K and V are arrays of the same length
    let n = K.length;
    let U = Math.random();
    let j = Math.floor(n * U);
    if (U < V[j]) {
        return j;
    }
    return K[j];
}

//Returns an integer >= min and < min + range
function randInt(min, range) {
    return Math.floor(Math.random() * range) + min;
}

//Generates N-length array of random integers between min and min + range.
function randIntArray(min, range, n=1) {
    let ra = [];
    for (let i = 0; i < n; i++) {
        ra[i] = randInt(min, range);
    }
    return ra;
}

//Generates random values in the normal distribution from two uniform random numbers from the unit interval.
//Set xy argument to true to generate two random normal values at once. 
function BoxMuller(xy=false) {
    let U1 = Math.random(),
        U2 = Math.random(),
        x;
    if (U1 === 0) { x = 0 }
    else { x = Math.sqrt(-2 * Math.log(U1)) * Math.cos(2 * Math.PI * U2)}
    
    if (Number.isNaN(x)) {
        throw new Error("Generated values " + U1 + " " + U2 + "are undefined for BoxMuller method");
    }

    if (xy) {
        let y = Math.sqrt(-2 * Math.log(U1)) * Math.sin(2 * Math.PI * U2);
        return [x, y]
    }
    return x;  
}

//Uses the boxmuller method to generate random values in a gaussian distribution with specified mean and standard
//deviation. Set xy argument to true to generate two random gaussians at once. 
function gaussBoxMuller(mean, stdDev, xy=false) {
    let normRand = BoxMuller(xy);

    if (xy) return [normRand[0] * stdDev + mean, normRand[1] * stdDev + mean];
    return normRand * stdDev + mean;
}

//Generates random gray value from gaussian distribution. Suggested stdDeviations: 16, 32, 54
function gaussGray(res, stdDev, mean=128) {
    let randGray = [],
        p = 0,
        gVal;

    if (res % 2 === 1) {
       gVal = clampTo(Math.round(gaussBoxMuller(mean, stdDev, false)),0, 255, false);
       randGray.push(gVal);
       p++;
    }
    while (p < res) {
        gVal = gaussBoxMuller(mean, stdDev, true);
        randGray.push(Math.round(clampTo(gVal[0], 0, 255, true)));
        randGray.push(Math.round(clampTo(gVal[1], 0, 255, true)));
        p += 2;
    }
    return randGray;
}



module.exports.rhSquaredProbHist = robinHoodSquaredProbHistogram;
module.exports.randPHistInt = randProbHistogramInt;
module.exports.randInt = randInt;
module.exports.gaussGray = gaussGray;
module.exports.randIntArray = randIntArray;


},{"./valuetype.js":13}],9:[function(require,module,exports){
const { invert, dot } = require('./lin.js');
const redLevel = (rgbColor) => rgbColor[0];
const greenLevel = (rgbColor) => rgbColor[1];
const blueLevel = (rgbColor) => rgbColor[2];
const rgb = module.exports

rgb.RGBA = {
    "color" : (r, g, b, a) => [r, g, b, a ? a : 255],
    redLevel,
    greenLevel,
    blueLevel,
    "alphaLevel" : (rgbaColor) => rgbaColor[3]
} 
rgb.RGB = {
    color : (r, g, b) => [r, g, b],
    redLevel,
    greenLevel,
    blueLevel
} 
rgb.averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
rgb.XYZconversionMatrix = (primaryCoords, XYZWhite) => {
    let primXYZ = [
        [primaryCoords[0][0],primaryCoords[1][0], primaryCoords[2][0]],
        [primaryCoords[0][1],primaryCoords[1][1], primaryCoords[2][1]],
        [primaryCoords[0][2],primaryCoords[1][2], primaryCoords[2][2]],
    ]

    let iPXYZ = invert(primXYZ);
    let XYZScalars = multiply(iPXYZ, XYZWhite);
    scaleMatrix = [[XYZScalars[0], 0, 0], [0, XYZScalars[1], 0], [0, 0, XYZScalars[2]]];
    return multiply(primXYZ, scaleMatrix);
}

function rgbWhiteToXYZ(whiteCoords) {
    whiteY = greenLevel(whiteCoords);
    return whiteCoords.map( cc => cc / whiteY);
}

rgb.createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);

},{"./lin.js":7}],10:[function(require,module,exports){
const { is8BitInt, inUnitInterval } = require('./valuetype.js');
const { multiply } = require('./lin.js');
const { createRGBRelativeLuminance } = require('./rgb.js');

//This matrix is used to convert linearized sRGB color to its corresponding color
//in the XYZ colorspace. The XYZ color is the matrix product of the 
//linearized sRGB color vector and the conversion matrix. 
const sRGBtoXYZMatrix = [
    [0.41239079926595923, 0.35758433938387785, 0.1804807884018343],
    [0.21263900587151022, 0.7151686787677557, 0.07219231536073371],
    [0.019330818715591835,0.11919477979462596, 0.9505321522496606]
]

const XYZtosRGBMatrix = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660,  1.8760108,  0.0415560],
    [0.0556434, -0.2040259,  1.0572252]
]

//Coordinates of sRGB red green and blue primary colors in linearized 3D space. 
const primaryChromaticityCoordinates = {
    matrix : [
        [0.64, 0.33, 0.03],
        [0.30, 0.60, 0.10],
        [0.15, 0.06, 0.79]
    ],
    obj : {
        r : {
            x : 0.64,
            y : 0.33,
            z : 0.03
        },
        g : {
            x : 0.30,
            y : 0.60,
            z : 0.10
        },
        b : {
            x : 0.15,
            y : 0.06,
            z : 0.79
        }
    }
}

//Chromaticity Coordinates of sRGB reference white (CIE Illuminant D65) in linear 3D space.
const whitepointChroma = {
    matrix : [0.3127, 0.3290, 0.3583],
    obj : {
        x : 0.3127,
        y : 0.3290,
        z : 0.3583
    }
}

//Given a linearized sRGB color, calculates the Relative Luminence of the color. 
//Relative Luminence is the Y stimulus in the XYZ colorspace.
const relativeLuminence = createRGBRelativeLuminance(sRGBtoXYZMatrix);

//Linearizes sRGB gamma-encoded color channel value in unit interval by applying
// sRGGB gamma decoding step-function. Value returned is in unit interval. 
function decodeGammaUI(stimulus) {
    if (stimulus < 0.04045) {
        return stimulus / 12.92;
    } else {
        return Math.pow(((stimulus + 0.055) / 1.055), 2.4);
    }
}

//Linearizes sRGB gamma-encoded  8bit color channel value by applying
// sRGB gamma decoding step function. Value returned is in unit interval.
function decodeGamma8Bit(colorChannel) {
    let uiCC = colorChannel / 255;
    return decodeGammaUI(uiCC);
}

//From linear stimulus in unit Interval applies sRGB piecewise gamma encoding function .
// Returned value is in Unit Interval.
function encodeGammaUI(linStim) {
    if (linStim < 0.00313080495) {
        return linStim * 12.92;
    } else {
        return Math.pow(linStim, 1 / 2.4) * 1.055 - 0.055;
    }
}

//From linear stimulus in unit interval applies sRGB piecewise gamma encoding function .
// Returned value is 8Bit Integer.
function encodeGamma8Bit(linStim) {
    let uiCC = encodeGammaUI(linStim);
    return Math.round(uiCC * 255); 
}

//Converts sRGB color to XYZ colorspace.
function sRGBtoXYZ(rgb) {
    let linRGB = linearize8Bit(rgb);
    return multiply(sRGBtoXYZMatrix, linRGB);
}

function linearize8Bit(rgb) {
    return rgb.map(cc => decodeGamma8Bit(cc));
}

function delinearize8Bit(rgb) {
    return rgb.map(cc => encodeGamma8Bit(cc));
}

function XYZtosRGB(xyz) {
    let linRGB = multiply(XYZtosRGBMatrix, xyz);
    return delinearize8Bit(linRGB);
}
//Not a proper luma conversion for sRGB, 
//relies on primaries and white point in NTSC color spaces like YIQ an YUV
// function lumaCCIR601(rPrime, gPrime, bPrime) {
//     let YPrime = 0.299 * rPrime + 0.587 * gPrime + 0.114 * bPrime;
//     return YPrime;
// }

//Again not a proper luma function for sRGB, output should be luma values between 16 and 235
//This function produces values from 0 to 255 which must be clamped.
// function lumaBT709(rPrime, gPrime, bPrime) {
//     let luma = 0.2126 * rPrime + 0.7152 * gPrime + 0.0722 * bPrime;
//     return luma;
// }

module.exports = {
    decodeGammaUI,
    decodeGamma8Bit,
    encodeGammaUI,
    encodeGamma8Bit,
    linearize8Bit,
    'primaryChroma' : primaryChromaticityCoordinates.matrix,
    'whitepointChroma' : whitepointChroma.matrix,
    relativeLuminence,
    sRGBtoXYZ,
    XYZtosRGB
}

},{"./lin.js":7,"./rgb.js":9,"./valuetype.js":13}],11:[function(require,module,exports){
'use strict';
const { dim } = require('./lin');
const { zeros, bankRound, isPowerOfTwo } = require('./valuetype');

const displayRefA = 1;
const audioRefA = 0.00001;
const dBFromAmp = (sigA, refA) => 20 * Math.log10(sigA / refA);
const dBFromPow = (sigP, refP) => 10 * Math.log10(sigP / refP);
//Extend the real frequency domain from N / 2 + 1 to N. 
//Useful when you want to calculate the Inverse Fast Fourier Transform 
//but your frequency signals ReX and ImX only cover the real domain. 
function extendRealFreqDomain(ReX, ImX, inPlace=false) {
    let ReEX = inPlace ? ReX : ReX.slice(0),
        ImEX = inPlace ? ImX : ImX.slice(0),
        n = (ReX.length - 1) * 2;

    for (let i = (n / 2) + 1; i < n; i++) {
        ReEX[i] = ReEX[n - i];
        ImEX[i] = -1 * ImEX[n - i];
    }
    return { ReEX, ImEX };
}

//Multiply two N length complex signals in the frequency domain, X and H, by one another. 
function multiplyFreq(ReX, ImX, ReH, ImH, min=0, max=0, inPlace=false) {
    if (!max) max = ReX.length;
    let ReY = inPlace ? ReX : [],
        ImY = inPlace ? ImX : [];

    if (inPlace) {
        let temp;
        for (let i = min; i < max; i++) {
            temp = ReX[i] * ReH[i] - ImX[i] * ImH[i]; 
            ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
            ReY[i] = temp;
        }
    } else {
        for (let i = min; i < max; i++) {
            ReY[i] = ReX[i] * ReH[i] - ImX[i] * ImH[i];
            ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
        }
    }
    return { "ReX" : ReY, "ImX" : ImY }
}

//Divide two n length complex signals in the frequency domain, X / Y.
function divideFreq(ReX, ImX, ReY, ImY) {
    //TODO: rewrite for in-place computation
    let ReH = [],
        ImH = [];
    
    for (let i = 0; i < ReX.length; i++) {
        ReH[i] = (ReY[i] * ReX[i] + ImY[i] * ImX[i])
            / (ReX[i] * ReX[i] + ImX[i] * ImX[i]);
        ImH[i] = (ImY[i] * ReX[i] - ReY[i] * ImX[i])
            / (ReX[i] * ReX[i] + ImX[i] * ImX[i]);
    }
    return { "ReX" : ReH, "ReY" : ImH }
}

//Convolve n-sample time-domain signal with m-sample impulse response. Output sample calculations
//are distributed across multiple input samples.
function convolveInput(sig, ir) {
    let n = sig.length,
        m = ir.length,
        Y = [];

    for (let i = 0; i < n + m; i++) {
        Y[i] = 0;
    }

    for (let i = 0; i < n; i++) {
        for (j = 0; j < m; j++) {
            Y[i + j] = Y[i + j] + (sig[i] * ir[j]);
        }
    }
    return Y;  
}

//Convolve n-sample time-domain signal with m-sample impulse response. Output sample calculations
//are performed independently of one another. Ouput: n * m - 1 length output signal.
function convolveOutput(sig, ir) {
    let n = sig.length,
        m = ir.length,
        Y = [];

    for (let i = 0; i < n + m; i++) {
        Y[i] = 0
        for (let j = 0; j < m; j++) {
            if (i - j < 0) continue;
            if (i - j > n) continue;
            Y[i] = Y[i] + (ir[j] * sig[i - j]);
        }
    }
    return Y;
}

//Given two time-domain signals, returns a third signal, the cross-correlation. The cross-correlation
//signal's amplitude is a measure of the resemblance of the target signal to the received signal at 
//a time-point x.
function correlate(receivedSig, targetSig) {
    let preFlip = targetSig.reverse();
    return convolveOutput(receivedSig, preFlip);
}

//Load origin signal spanning from fromInd up to toInd into dest array and pad the rest of
// dest with zeros up to destN. If fromInd is out of range of origin signal, pads eith zeros.
function loadSignal(dest, destN, origin, fromInd, toInd) {
    let padding = (toInd > origin.length) ? toInd - origin.length : 0;
    let loadRange = toInd - fromInd - padding;
    
    for (let i = 0; i < loadRange; i++) {
        dest[i] = origin[fromInd + i];
    }
    for (let j = loadRange; j < destN; j++) {
        dest[j] = 0;
    }
    return dest;
}

function convolveReal(signal, ir, fftSize=0) {
    if (fftSize === 0) {
        fftSize = 1;
        while (fftSize < ir.length) {
            fftSize *= 2;
        }
        fftSize *= 2;
    }
    let n = signal.length,
        m = ir.length,
        segSize = fftSize + 1 - m,
        segCount = Math.ceil( n / segSize),
        overlapSize = fftSize - segSize,
        overlap = zeros(overlapSize),
        XX = [],
        output = [];
    //load impulse response signal into XX
    loadSignal(XX, fftSize, ir, 0, m);

    //Get Real DFT of the filter's impulse response
    let { ReX, ImX } = realFFT(XX, true);
    let ReFR = ReX.slice(0),
        ImFR = ImX.slice(0);
        
    for (let seg = 0; seg < segCount; seg++) {
        loadSignal(XX, fftSize, signal, seg * segSize, (seg + 1) * segSize);
        //Analyze frequency of segment
        ({ ReX, ImX } = realFFT(XX, true)); 
        //Multiply segment freq signal by kernel freq signal
        ({ ReX, ImX } = multiplyFreq(ReX, ImX, ReFR, ImFR, 0, fftSize / 2 + 1));
        //Extend Real and Imaginary signal from N / 2 + 1 to N
        let { ReEX, ImEX } = extendRealFreqDomain(ReX, ImX)
        //Take the inverse FFT of the now convolved segment
        XX = inverseFFT(ReEX, ImEX)["ReX"];
        //Add the prior segment's overlap to this segment
        for (let i = 0; i < overlapSize; i++) {
            XX[i] = XX[i] + overlap[i];
        }
        //Save the samples that will overlap with the next segment
        for (let i = segSize; i < fftSize; i++) {
            overlap[i - segSize] = XX[i];
        }
        //concatenate convolved segment to output
        output.push(...XX.slice(0, segSize));
    }
    //Concatenate remaining overlap to output
    output.push(...overlap);
    return output;
}


//Given one N-point time domain signal, the Discrete Fourier Transform decomposesas the signal into
//two N/2-point frequency domain signals ReX and ImX. These are returned as key-value pairs of an object.
//The values of ReX and ImX are scalars that scale a sinusoid function (Cosine for ReX and Sine for ImX)
//whose frequency, relative to the original signal, is the domain value of the frequency signal.
function realDFT(sig) {
    if  (sig.length % 2 !== 0) throw new Error("Length of signal must be even");
    let ReX = [],
        ImX = [],
        i,
        j;
    
    for (i = 0; i < sig.length / 2; i++) {
        ReX[i] = 0;
        ImX[i] = 0;
    }
    
    for (i = 0; i < sig.length / 2; i++) {
        for (j = 0; j < sig.length; j++) {
            ReX[i] += sig[j] * Math.cos(2 * Math.PI * i * j / sig.length);
            ImX[i] -= sig[j] * Math.sin(2 * Math.PI * i * j / sig.length);
        }
    }

    return { ReX, ImX }
}
//From two N / 2 + 1 sized vectors of real and imaginary components. Synthesizes N point signal.
function inverseRealDFT(ReX, ImX) {
    if (ReX.length !== ImX.length) throw new Error("Real and Imaginary vectors must be the same length");
    let X = [],
        cosX = [],
        sinX = [],
        n = ReX.length + ImX.length - 2;
        i,
        j;

    for (i = 0; i < (n / 2) + 1; i++) {
        cosX[i] = ReX[i] / (n / 2); //convert real signal to cos amplitude scalars
        sinX[i] = - ImX[i] / (n / 2); //convert imaginary signal to sin amplitude scalars
    }
    cosX[0] = ReX[0] / n;
    cosX[ReX.length - 1] = ReX[ReX.length - 1] / n;

    for (i = 0; i < n; i++) {
        X[i] = 0; //Initialize time-domain signal 
        //Sum scaled basis functions for each frequency
        for (j = 0; j < (n / 2) + 1; j++) {
            X[i] = X[i] + cosX[j] * Math.cos(2 * Math.PI * j * i / n);
            X[i] = X[i] + sinX[j] * Math.sin(2 * Math.PI * j * i / n);
        }
    }
    return X;
}

//Fast Fourier Transform of a Complex Signal in the time domain. 
function FFT(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary signal component lengths do not match");
    if (n === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(n)) {
        radix2FFT(ReX, ImX); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransform(ReX, ImX);
    }
}

function radix2FFT(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary signal component lengths do not match");
    if (!isPowerOfTwo(n)) throw new Error("Signal length must be a power of 2 to perform radix-2 transform");
    if (n === 1) return { ReX, ImX };
    let m = bankRound(Math.log2(n)),
        j = n / 2,
        tempR,
        tempI;

    //Sort in Reverse Bit order
    for (let i = 1; i < n; i++) {
        if (i < j) {
            tempR = ReX[j];
            tempI = ImX[j];
            ReX[j] = ReX[i];
            ImX[j] = ImX[i];
            ReX[i] = tempR;
            ImX[i] = tempI;
        }
        let k = n / 2;
        while (k <= j) {
            j = j - k;
            k = k / 2;
        }
        j = j + k;
    }
    let g = 0;
    //Loop for each stage
    for (let stage = 1; stage <= m; stage++) {  
        let spectraSize = Math.pow(2, stage);      
        let spectraSize2 = spectraSize / 2;
        let ur = 1;
        let ui = 0;
        //calculate sine and cosine values
        let sr = Math.cos(Math.PI / spectraSize2);
        let si = Math.sin(Math.PI / spectraSize2);

        //Loop for each Sub-DTF
        for (j = 1; j <= spectraSize2; j++) {
            //Loop for each Butterfly
            for(let i = j - 1; i < n; i += spectraSize) {
                let ip = i + spectraSize2;
                //Butterfly calculation
                tempR = ReX[ip] * ur - ImX[ip] * ui;
                tempI = ReX[ip] * ui + ImX[ip] * ur;
                ReX[ip] = ReX[i] - tempR;
                ImX[ip] = ImX[i] - tempI;
                ReX[i] = ReX[i] + tempR;
                ImX[i] = ImX[i] + tempI;
            }
            tempR = ur;
            ur = tempR * sr - ui * si;
            ui = tempR * si + ui * sr;
        }
    }
    return { ReX, ImX };
}

//Transforms complex signal in frequency domain to complex signal in the time domain
function inverseFFT(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary signal component lengths do not match");
    for (let k = 0; k < n; k++) {
        ImX[k] *= -1;
    }

    FFT(ReX, ImX);

    for (let i = 0; i < n; i++) {
        ReX[i] = ReX[i] / n;
        ImX[i] = -1 * ImX[i] / n;
    }

    return { ReX, ImX };
}

//From N-point time-domain signal, calculate the Real Frequency Spectrum using the 
//Fast Fourier Transform. The real spectrum is composed of ReX and ImX, which are both 
//N / 2 + 1 length signals.
function realFFT(signal, realOutput=false) {
    let n = signal.length,
        ReX = signal.slice(0), //Initialize Real part of signal
        ImX = zeros(n); //Initialize Imaginary part of signal

    FFT(ReX, ImX); //Take Fast Fourier Transform
    
    if (realOutput) {
        //Return Real DFT spectrum 
        return { 
            "ReX" : ReX.slice(0, n / 2 + 1),
            "ImX" : ReX.slice(0, n / 2 + 1)
        }
    } else {
        //Return complex spectrum
        return { ReX, ImX };
    }
}
//For 2-Dimensional spatial domain signal. Returns complex 2D signal in frequency domain. 
function FFT2D(signal) {
    let rn = signal.length,
        cn = signal[0].length,
        ReImg = [],
        ImImg = [],
        freq;
    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < rn; row++) {
        freq = realFFT(signal[row], false);
        ReImg[row] = freq.ReX;
        ImImg[row] = freq.ImX;
    }
    let ReColFreqs,
        ImColFreqs;
    //Take FFT of each column
    for (let col = 0; col < cn; col++) {
        ReColFreqs = [];
        ImColFreqs = [];
        for (let row = 0; row < rn; row++) {
            ReColFreqs[row] = ReImg[row][col];
            ImColFreqs[row] = ImImg[row][col];
        }
        FFT(ReColFreqs, ImColFreqs);
        //Store Results back in column
        for (let row = 0; row < rn; row++) {
            ReImg[row][col] = ReColFreqs[row];
            ImImg[row][col] = ImColFreqs[row];
        }
    }
    return {ReImg, ImImg};
}

function chirpZTransform(ReX, ImX) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary components must have same number of elements.");
    let m = 1;
    while (m < n * 2 + 1) m *= 2;
    let tcos = [],
        tsin = [],
        ReA = [],
        ImA = [],
        ReB = [],
        ImB = [];

    for (let i = 0; i < n; i++) {
        let j = i * i % (n * 2);
        tcos[i] = Math.cos(Math.PI * j / n);
        tsin[i] = Math.sin(Math.PI * j / n);
        ReA[i] = ReX[i] * tcos[i] + ImX[i] * tsin[i];
        ImA[i] = ImX[i] * tcos[i] - ReX[i] * tsin[i];
    }
    //Pad with zeros so that length is radix-2 number M
    for (let i = n; i < m; i++) {
        ReA[i] = 0;
        ImA[i] = 0;
    }

    ReB[0] = tcos[0];
    ImB[0] = tsin[0];
    for (let i = 1; i < n; i++) {
        ReB[i] = ReB[m - i] = tcos[i];
        ImB[i] = ImB[m - i] = tsin[i];
        console.log(ReB[n]);
    }

    radix2FFT(ReA, ImA)
    radix2FFT(ReB, ImB)
    multiplyFreq(ReA, ImA, ReB, ImB);
    for (let i = 0; i < n; i++) {
        ReX[i] = ReA[i] * tcos[i] + ImA[i] * tsin[i];
        ImX[i] = ImA[i] * tcos[i] - ReA[i] * tsin[i];
    }
    return ReX, ImX;
}

function convolveComplex(ReX, ImX, ReY, ImY) {
    let n = ReX.length;
    if (n !== ImX.length || n !== ReY.length || n !== ImY.length) {
        throw new Error("Complex signals and their component's lengths must match.");
    }
    FFT(ReX, ImX);
    FFT(ReY, ImY);
    multiplyFreq(ReX, ImX, ReY, ImY, 0, n, true);
    inverseFFT(ReX, ImX);
    return { ReX, ImX }
}   

function convolve2D(signal, psf) {
    let { rows, cols } = dim(psf);
    // if (rows === 3 && rows === cols ) {
    //     //Naive 2d convolution
    // }
    // if (filterKernelIsSeperable) {
    //     //Decompose Kernel into horizontal and vertical projections
    //     //convolve rows with horizontal projection
    //     //convolve columns of intermediate image with vertical projection
    // } else {
    //     //convolveFFT2D
    // }
}

function InverseFFT2D(ReX, ImX) {
    //Take Inverse FFt of the Rows
    //Take Inverse FFT of the cols
}
const freqResolution = (fftSize, sampleRate) => sampleRate / fftSize;

const timeResolution = (fftSize, sampleRate) => fftSize / sampleRate;

module.exports = {
    "convolve" : convolveOutput,
    correlate,
    extendRealFreqDomain,
    convolveComplex,
    convolveReal,
    multiplyFreq,
    divideFreq
}
},{"./lin":7,"./valuetype":13}],12:[function(require,module,exports){
const { is8BitInt, inUnitInterval } = require('./valuetype.js');
const { multiply } = require('./lin.js');
const { createRGBRelativeLuminance, RGBA, RGB } = require('./rgb.js');

//This matrix is used to convert linearized sRGB color to its corresponding color
//in the XYZ colorspace. The XYZ color is the matrix product of the 
//linearized sRGB color vector and the conversion matrix. 
const sRGBtoXYZMatrix = [
    [0.41239079926595923, 0.35758433938387785, 0.1804807884018343],
    [0.21263900587151022, 0.7151686787677557, 0.07219231536073371],
    [0.019330818715591835,0.11919477979462596, 0.9505321522496606]
]

const XYZtosRGBMatrix = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660,  1.8760108,  0.0415560],
    [0.0556434, -0.2040259,  1.0572252]
]

//Coordinates of sRGB red green and blue primary colors in linearized 3D space. 
const primaryChromaticityCoordinates = {
    matrix : [
        [0.64, 0.33, 0.03],
        [0.30, 0.60, 0.10],
        [0.15, 0.06, 0.79]
    ],
    obj : {
        r : {
            x : 0.64,
            y : 0.33,
            z : 0.03
        },
        g : {
            x : 0.30,
            y : 0.60,
            z : 0.10
        },
        b : {
            x : 0.15,
            y : 0.06,
            z : 0.79
        }
    }
}

//Chromaticity Coordinates of sRGB reference white (CIE Illuminant D65) in linear 3D space.
const whitepointChroma = {
    matrix : [0.3127, 0.3290, 0.3583],
    obj : {
        x : 0.3127,
        y : 0.3290,
        z : 0.3583
    }
}

//Given a linearized sRGB color, calculates the Relative Luminence of the color. 
//Relative Luminence is the Y stimulus in the XYZ colorspace.
const relativeLuminence = createRGBRelativeLuminance(sRGBtoXYZMatrix);

//Linearizes sRGB gamma-encoded color channel value in unit interval by applying
// sRGGB gamma decoding step-function. Value returned is in unit interval. 
function decodeGammaUI(stimulus) {
    if (stimulus < 0.04045) {
        return stimulus / 12.92;
    } else {
        return Math.pow(((stimulus + 0.055) / 1.055), 2.4);
    }
}

//Linearizes sRGB gamma-encoded  8bit color channel value by applying
// sRGB gamma decoding step function. Value returned is in unit interval.
function decodeGamma8Bit(colorChannel) {
    let uiCC = colorChannel / 255;
    return decodeGammaUI(uiCC);
}

//From linear stimulus in unit Interval applies sRGB piecewise gamma encoding function .
// Returned value is in Unit Interval.
function encodeGammaUI(linStim) {
    if (linStim < 0.00313080495) {
        return linStim * 12.92;
    } else {
        return Math.pow(linStim, 1 / 2.4) * 1.055 - 0.055;
    }
}

//From linear stimulus in unit interval applies sRGB piecewise gamma encoding function .
// Returned value is 8Bit Integer.
function encodeGamma8Bit(linStim) {
    let uiCC = encodeGammaUI(linStim);
    return Math.round(uiCC * 255); 
}

//Converts sRGB color to XYZ colorspace.
function sRGBtoXYZ(rgb) {
    let linRGB = linearize8Bit(rgb);
    return multiply(sRGBtoXYZMatrix, linRGB);
}
//Linearizes the 8Bit color channels of a gamm-encoded sRGB color.
function linearize8Bit(rgb) {
    return rgb.map(cc => decodeGamma8Bit(cc));
}
//Gamma-encodes each color channel of a linear sRGB color to 8Bit values.
function delinearize8Bit(rgb) {
    return rgb.map(cc => encodeGamma8Bit(cc));
}
//Converts XYZ color to Gamma-encoded sRGB
function XYZtosRGB(xyz) {
    let linRGB = multiply(XYZtosRGBMatrix, xyz);
    return delinearize8Bit(linRGB);
}

//Creates gray sRGB color from gray value between 0 and 256. 
//Set a to true if an RGBA output is desired.
function gray(gVal, a=false) {
    return a ? RGBA.color(gVal, gVal, gVal) : RGBA.color(gVal, gVal, gVal);
}
//Not a proper luma conversion for sRGB, 
//relies on primaries and white point in NTSC color spaces like YIQ an YUV
// function lumaCCIR601(rPrime, gPrime, bPrime) {
//     let YPrime = 0.299 * rPrime + 0.587 * gPrime + 0.114 * bPrime;
//     return YPrime;
// }

//Again not a proper luma function for sRGB, output should be luma values between 16 and 235
//This function produces values from 0 to 255 which must be clamped.
// function lumaBT709(rPrime, gPrime, bPrime) {
//     let luma = 0.2126 * rPrime + 0.7152 * gPrime + 0.0722 * bPrime;
//     return luma;
// }

module.exports = {
    decodeGammaUI,
    decodeGamma8Bit,
    encodeGammaUI,
    encodeGamma8Bit,
    linearize8Bit,
    'primaryChroma' : primaryChromaticityCoordinates.matrix,
    'whitepointChroma' : whitepointChroma.matrix,
    relativeLuminence,
    sRGBtoXYZ,
    XYZtosRGB,
    gray
}

},{"./lin.js":7,"./rgb.js":9,"./valuetype.js":13}],13:[function(require,module,exports){
function is8BitInt(value) {
    return (!isNaN(channelValue)
        && Number.isInteger(+channelValue)
        && channelValue < 256
        && channelValue >= 0);
}

function inUnitInterval(value) {
    return (!isNaN(value)
    && value >= 0.0 
    && value <= 1.0)
}

function inNormalUI(value) {
    return value >= 0 && value <= 100;
}

function clampTo(value, min, max, alias=false) {
    if (value < min) return alias ? min + ((min - value) % (max - min)) : min;
    if (value > max) return alias ? max - (value % (max - min)) : max;
    return value;
}

//From User Tim Down.
//https://stackoverflow.com/questions/3108986/gaussian-bankers-rounding-in-javascript
function bankRound(num, decimalPlaces=0) {
    let m = Math.pow(10, decimalPlaces);
    let n = +(decimalPlaces ? num * m : num).toFixed(8); //Avoid Rounding Errors
    let i = Math.floor(n), f = n - i;
    let e = 1e-8; //Allow for rounding errors in f
    let r = (f > 0.5 - e && f < 0.5 + e) ? 
        ((i % 2 === 0) ? i : i + 1) : Math.round(n);
    return decimalPlaces ? r / m : r;
}

function initialize(value, n, m=0) {
    let z = [];
    for (let i = 0; i < n; i++) {
        if (m > 0) { 
            z[i] = [];
        } else {
            z[i] = 0;
            for (let j = 0; j < m; j++) {
                z[i][j] = 0;
            }
        } 
    }
    return z;
}

function zeros(n, m=0) {
    return initialize(0, n, m);
}

function round(n, digits=0) {
    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    return Math.round(n) / multiplicator;
}

function isPowerOfTwo(num) {
    return (num & ( num - 1)) == 0;
}

module.exports = {
    is8BitInt,
    inUnitInterval,
    inNormalUI,
    clampTo,
    bankRound,
    zeros,
    initialize,
    round,
    isPowerOfTwo
}
},{}]},{},[6]);
