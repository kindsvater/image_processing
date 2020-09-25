(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { clampTo } =  require('./utility/num_util.js');
const { inNormalUnitInterval } = require('./utility/type_util.js');

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
        if (!inNormalUnitInterval(L)) throw new Error( "Lightness value " + L + " must be in range 0 to 100");
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

},{"./utility/num_util.js":14,"./utility/type_util.js":16}],2:[function(require,module,exports){
const { zeros, initArray } = require("./utility/array_util.js");
const { roundTo } = require('./utility/num_util.js');

const impulse = {
    "delta" : (n=16, shift=0, scale=1) => { 
        let d = zeros([n], true);
        d[shift] = scale;
        return d;
    },
    "step" : n => initArray(1, [n]),
    "movingAverage" : n => initArray(1 / n, [n]),
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
    "box" : (rows, cols) => initArray(1, [rows, cols]),
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
                psf[r][c] = roundTo((1 / (2 * Math.PI * scale * scale)) * Math.exp(-((x * x) + (y * y)) / (2 * scale * scale)), 4);
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
},{"./utility/array_util.js":13,"./utility/num_util.js":14}],3:[function(require,module,exports){
//Calculates and returns the magnitude (spatial length) of a vector.
const mag = vector => Math.sqrt(vector.reduce((acc, curr) => acc + (curr * curr), 0));
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

//Returns the rows and columns of a Matrix represented as a nested array.
//If matrix is not well-formed, returns null.
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
},{}],4:[function(require,module,exports){
const { zeros } = require('./utility/array_util.js');

const DiscreteDistribution = (function() {
    function DiscreteDistribution(data, intervalCount, min, max) {
        this.dist = data;
        this.intervalCount = intervalCount;
        this.intervalSize = (max - min + 1) / intervalCount;
        this.min = min;
        this.max = max;
    }
    const $DD = DiscreteDistribution.prototype;

    $DD.intervalIndex = function(value) {
        let index = Math.floor((value - this.min) / this.intervalSize);
        if (this.dist[index] === undefined) return null;
        return index;
    }

    // $DD.midpointArea = function(intervalIndex) {
    //     return this.dist[intervalIndex] * this.intervalSize;
    // }
    // $DD.trapezoidArea = function(intervalIndex) {
    //     let sideA = intervalIndex === 0 ? 0 : ((this.dist[intervalIndex] - this.dist[intervalIndex - 1]) / 2) + this.dist[intervalIndex];
    //     let sideB = intervalIndex === this.dist.length - 1;
    // }
    return DiscreteDistribution;
})();

const ProbabilityDist = (function() {
    function ProbabilityDist(probabilities, min, max) {
        DiscreteDistribution.call(this, probabilities, probabilities.length, min, max);
    }
    ProbabilityDist.prototype = Object.create(DiscreteDistribution.prototype);
    ProbabilityDist.prototype.constructor = ProbabilityDist;
    const $PD = ProbabilityDist.prototype;

    $PD.mean = function() {
        return this.dist.reduce((acc, prob, i) => acc + ((i + 1) * this.intervalSize + this.min) * prob, 0);
    }

    $PD.pdf = function() {
        return this.dist.map(prob => parseFloat(prob / this.intervalSize).toPrecision(4));
    }

    $PD.cdf = function() {
        let acc = 0;
        return this.dist.map((acc => prob => parseFloat(acc += prob).toPrecision(4))(0));
    }
    return ProbabilityDist;
})();

const FrequencyDist = (function() {
    function FrequencyDist(outcomes, intervalCount, min, max) {
        this.totalOutcomes = 0;

        DiscreteDistribution.call(this, zeros([intervalCount]), intervalCount, min, max);
        this.populate(outcomes);
    }
    FrequencyDist.prototype = Object.create(DiscreteDistribution.prototype);
    FrequencyDist.prototype.constructor = FrequencyDist;
    const $FD = FrequencyDist.prototype;

    $FD.populate = function(outcomes) {
        for (let oc of outcomes) {
            if (oc >= this.min && oc < this.max) {
                this.totalOutcomes++;
                this.dist[this.intervalIndex(oc)] += 1;
            }
        }
    }
    $FD.mean = function() {
        return this.dist.reduce((acc, freq) => 
            acc + (freq * ((i + 1) * this.intervalSize + this.min)),
            0
        ) / this.totalOutcomes;
    }
    //Returns the cumulative frequency districution as a list A, where each element j is the sum of the 
    //frequencies of the distribution from 0 through j - 1.
    $FD.cumulativeFrequency = function() {
        return this.dist.map((acc => freq => acc += freq)(0));
    }
    //Calculates the probability of each outcome interval and returns the corresponding probability distribution object.
    $FD.toProbabilityDist = function() {
        let probData = this.dist.map(freq => freq / this.totalOutcomes);
        return new ProbabilityDist(probData, this.min, this.max);
    }

    $FD.pdf = function() {
        return this.dist.map(freq => parseFloat(freq / this.totalOutcomes / this.intervalSize).toPrecision(4));
    }

    $FD.cdf = function() {
        return this.dist.map((acc => freq => parseFloat(acc + freq))(0));
    }
    //Given a numerical range, equalizes the probabilities of the distribution's outcomes across the new range. 
    //Returns list of equalized value of each interval. 
    $FD.equalize = function(toRange, withMin=0) {
        let range = toRange - 1;
        let cumHist = this.cumulativeFrequency();
        let cumMin = 0;
        for (let i = 0; i < cumHist.length; i++) {
            if (cumHist[i] > 0) {
                cumMin = cumHist[i];
                break;
            }
        }
        let cumTotal = this.totalOutcomes - cumMin;
        let outcome = cumHist.map(cumFreq => withMin + Math.round((cumFreq - cumMin) / cumTotal * range));
        for (let i = 0; i < outcome.length; i++) {
            if (outcome[i] < withMin) {
                outcome[i] = withMin;
            } else {
                break;
            }
        }
        return outcome;
    }
    return FrequencyDist;
})();

module.exports = { 
    DiscreteDistribution,
    FrequencyDist,
    ProbabilityDist,
};
},{"./utility/array_util.js":13}],5:[function(require,module,exports){
'use strict';
const { RGB, RGBA } = require('./rgb.js');
const { relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('./srgb.js');
const { lightness, XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('./cie.js');
const { bankRound, nextPowerOf2 } = require('./utility/num_util.js');
const { zeros } = require('./utility/array_util.js');
const { isPowerOfTwo } = require('./utility/type_util.js');
const { RGBImage } = require('./rgbimage.js');
const { convolveComplex } = require('./signal.js');
const { FrequencyDist } = require('./histogram.js');

//Given an RGBA image, equalizes the lightness of the image between the minimum and maximum values
function equalizeImgLight(realImage, min, max) {
    let histogram = new FrequencyDist(realImage.toLightness(), 64, min, max);
    let equalCDF = histogram.equalize(256);
    let equalData = [];

    realImage.forEachPixel((pixel) => {
        let lab = XYZtoLAB(sRGBtoXYZ(pixel));
        let l8bit = Math.floor(LAB.LVal(lab) / 100 * 255);

        if (l8bit >= min && l8bit < max) {
            let new8BitL = equalCDF[histogram.intervalIndex(l8bit)];
            let equalsrgb = XYZtosRGB(
                LABtoXYZ(
                    LAB.color(new8BitL / 255 * 100, LAB.AVal(lab), LAB.BVal(lab)
                ), undefined, true)
            );
            equalData.push(...equalsrgb);
        } else {
            equalData.push(...pixel);
        }
        equalData.push(255);
    });

    return new RGBImage(equalData, realImage.width, true);
}

// //Use when performing a transfrom on multi-channel flat image in place.
// //Translates the abstract index n in the input signal to its actual index in the image. 
// function makeFFTIndex(si, dimIndex, isCol, chan) {
//     let tensorIndex = [0,0,chan];
//     tensorIndex[+isCol] = dimIndex;
//     tensorIndex[+!isCol] = si;
//     return tensorIndex;
// }

// function radix2FFTImage(complexImage, dimIndex, isCol=false, chans=3) {
//     let ReX = complexImage.real,
//         ImX = complexImage.imag,
//         signalLength = isCol ? complexImage.height() : complexImage.width(),
//         power = bankRound(Math.log2(signalLength)),
//         j = signalLength / 2,
//         tempR,
//         tempI,
//         c;

//     //Sort in Reverse Bit order
//     for (let i = 1; i < signalLength; i++) {
//         if (i < j) {
//             let ti = ReX._toDataIndex(makeFFTIndex(i, dimIndex, isCol, 0));
//             let tj = ReX._toDataIndex(makeFFTIndex(j, dimIndex, isCol, 0));
//             for (c = 0; c < chans; c++) {
//                 tempR = ReX.getAtDI(tj);
//                 tempI = ImX.getAtDI(tj);
//                 ReX.getAtDI(tj) = ReX.getAtDI(ti);
//                 ImX.getAtDI(tj) = ImX.getAtDI(ti);
//                 ReX.getAtDI(ti) = tempR;
//                 ImX.getAtDI(ti) = tempI;
//                 ti = ReX._incrementDataIndex(ti, 1, 2);
//                 tj = ReX._incrementDataIndex(tj, 1, 2);
//             }
//         }
//         let k = signalLength / 2;
//         while (k <= j) {
//             j = j - k;
//             k = k / 2;
//         }
//         j = j + k;
//     }

//     //Loop for each stage
//     for (let stage = 1; stage <= power; stage++) {  
//         let spectraSize = Math.pow(2, stage);      
//         let halfSpectra = spectraSize / 2;
//         let ur = 1;
//         let ui = 0;
//         //calculate sine and cosine values
//         let sr = Math.cos(Math.PI / halfSpectra);
//         let si = Math.sin(Math.PI / halfSpectra);

//         //Loop for each Sub-DTF
//         for (j = 1; j <= halfSpectra; j++) {
//             //Loop for each Butterfly
//             for (let i = j - 1; i < signalLength; i += spectraSize) {
//                 let ip = ReX._toDataIndex(makeFFTIndex(i + halfSpectra, dimIndex, isCol, 0));
//                 let ti = ReX._toDataIndex(makeFFTIndex(i, dimIndex, isCol, 0));
//                 //Butterfly calculation for each channel's signal
//                 for (c = 0; c < chans; c++) {
//                     tempR = ReX.getAtDI(ip) * ur - ImX.getAtDI(ip) * ui;
//                     tempI = ReX.getAtDI(ip) * ui + ImX.getAtDI(ip) * ur;
//                     ReX.getAtDI(ip) = ReX.getAtDI(ti) - tempR;
//                     ImX.getAtDI(ip) = ImX.getAtDI(ti) - tempI;
//                     ReX.getAtDI(ti) = ReX.getAtDI(ti) + tempR;
//                     ImX.getAtDI(ti) = ImX.getAtDI(ti) + tempI;
//                     ip = ReX._incrementDataIndex(ip, 1, 2);
//                     ti = ReX._incrementDataIndex(ti, 1, 2);
//                 }
//             }
//             tempR = ur;
//             ur = tempR * sr - ui * si;
//             ui = tempR * si + ui * sr;
//         }
//     }
//     return complexImage;
// }

// function chirpZTransformImage(complexImage, dimIndex, isCol=false, chans=3) {
//     let ReX = complexImage.real,
//         ImX = complexImage.imag;
//         signalLength = isCol ? complexImage.height() : complexImage.width(),
//         powerOf2 = 1;  
//     while (powerOf2 < signalLength * 2 + 1) powerOf2 *= 2;
//     //Perform the following Z-Transform for all channels
//     for (let c of chans) {
//         let tcos = [];
//         let tsin = [];
//         let ReA = zeros([powerOf2], true);
//         let ImA = zeros([powerOf2], true);
//         let ReB = zeros([powerOf2], true);
//         let ImB = zeros([powerOf2], true);

//         for (let si = 0; si < signalLength; si++) {
//             let j = si * si % (signalLength * 2),
//                 ti = ReX._toDataIndex(makeFFTIndex(si, dimIndex, isCol, c));
//             tcos[si] = Math.cos(Math.PI * j / signalLength);
//             tsin[si] = Math.sin(Math.PI * j / signalLength);
//             ReA[si] = ReX.getAtDI(ti) * tcos[si] + ImX.getAtDI(ti) * tsin[si];
//             ImA[si] = ImX.getAtDI(ti) * tcos[si] - ReX.getAtDI(ti) * tsin[si];
//         }
//         //Pad with zeros so that length is radix-2 number M
//         for (let sigPadIndex = signalLength; sigPadIndex < powerOf2; sigPadIndex++) {
//             ReA[sigPadIndex] = 0;
//             ImA[sigPadIndex] = 0;
//         }

//         ReB[0] = tcos[0];
//         ImB[0] = tsin[0];
//         for (let si = 1; si < signalLength; si++) {
//             ReB[si] = tcos[si];
//             ImB[si] = tsin[si];
//             ReB[powerOf2 - si] = tcos[si];
//             ImB[powerOf2 - si] = tsin[si];
//         }

//         convolveComplex(ReA, ImA, ReB, ImB);
//         for (let si = 0; si < signalLength; si++) {
//             let ti = ReX._toDataIndex(makeFFTIndex(si, dimIndex, isCol, c));
//             ReX.setAtDI(ti, ReA[i] * tcos[i] + ImA[i] * tsin[i]);
//             ImX.setAtDI(ti, ImA[i] * tcos[i] - ReA[i] * tsin[i]);
//         }
//     }
//     return complexImage;
// }

function FFT1DImage(complexImage, dimIndex, isCol=false, chans) {
    let signalLength = isCol ? complexImage.height() : complexImage.width();
    if (signalLength === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(signalLength)) {
        radix2FFTImage(complexImage, dimIndex, isCol, chans); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransformImage(complexImage, dimIndex, isCol, chans);
    }
    return complexImage;
}

// function FFT2DFromComplexImage(complexImage, chans) {
//     //Take FFT of rows and store in real and imaginary images.
//     for (let row = 0; row < complexImage.height(); row++) {
//         FFT1DImage(complexImage, row, false, chans);
//     }
//     //Take FFT of each column
//     for (let col = 0; col < complexImage.width(); col++) {
//         FFT1DImage(complexImage, col, true, chans);
//     }
//     return complexImage;
// }

/** Calculates Fourier Transform of a 2D image represented as one flat multi-channel array.
 * @param   {Object}  rgbImage Instance of the RGBImage class.
 * @param   {Int}     chans   the number of color channels to perform the transform on.
 * @param   {Boolean} inPlace If true will alter the original image object.
 * @returns {Object} ComplexSignal     A complex representation of the image in the frequency domain.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the freq domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the freq domain.
**/
function FFT2DFromRealImage(rgbImage, chans, inPlace=true) {
    let ReX = inPlace ? 
        rgbImage : 
        new RGBImage(rgbimage.data.slice(0), rgbImage.width(), rgbImage.height());
    let ImX = new Tensor(rgbImage.shape, zeros(rgbImage.shape, true));
    let complexImage = {
        real : ReX,
        imag : ImX,
        height : () => {
            ReX.height();
        },
        width : () => {
            ReX.width();
        }
    }
    return FFT2DFromComplexImage(complexImage, chans);
}

/** Inverse Fourier Transform of a complex 2D image in the frequency domain epresented as two flat multi-channel array components
 * @param   {Object}  complexImage  instantiation of complex image class with real and imaginary components in the frequency domain.
 * @param   {Int}     chans   the number of color channels to perform the inverse FFT on.
 * @returns {Object} ComplexSignal     References to the component arrays that have been altered in place.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the time domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the time domain.
**/
function inverseFFT2DImage(complexImage, chans) {
    let normal = complexImage.height() * complexImage.width();

    complexImage.imag.forEachVal([[],[],[0,[],chans]], (amp, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, amp * -1);
    });

    FFT2DFromComplexImage(complexImage, chans);

    //Normalize each value by dividing by pixelWidth * pixelHeight
    complexImage.real.forEachVal([[],[],[0,[],chans]], (value, dataIndex) => {
        complexImage.real.setAtDI(dataIndex, value / normal);
    });
    complexImage.imag.forEachVal([[],[],[0,[],chans]], (value, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, -1 * value / normal);
    });

    return { complexImage };
}

// function multiplyFreqImage(complexX, copmlexH, chans, inPlace=false) {
//     if (!max) max = ReX.length;
//     let ReY = inPlace ? ReX : [],
//         ImY = inPlace ? ImX : [];

//     if (inPlace) {
//         let temp;
//         for (let i = min; i < max; i++) {
//             temp = ReX[i] * ReH[i] - ImX[i] * ImH[i]; 
//             ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
//             ReY[i] = temp;
//         }
//     } else {
//         for (let i = min; i < max; i++) {
//             ReY[i] = ReX[i] * ReH[i] - ImX[i] * ImH[i];
//             ImY[i] = ImX[i] * ReH[i] + ReX[i] * ImH[i];
//         }
//     }
//     return { "ReX" : ReY, "ImX" : ImY }
// }



// function depadRealImage(img, pWidth, chans, minusWidth, minusHeight) {
//     let ccTotal = img.length;
//     let pHeight = ccTotal / pWidth / chans,
//         newRows = pHeight - minusHeight;
//         newCols = pWidth - minusWidth,
//         endIndex = newCols * chans;
//         colChansRmv = minusWidth * chans;
//         currIndex = endIndex + colChansRmv;
//         for (let r = 1; r < newRows; r++) {
//             let sectionLen = newCols * chans;
//             for (let c = 0; c < sectionLen; c++) {
//                 img[endIndex] = img[currIndex];
//                 endIndex++;
//                 currIndex++;
//             }
//             currIndex += colChansRmv;
//         }
//         img.splice(endIndex);
//         return img;
// }

// function FFTConvolution(img, psf) {
//     let FFTHeight = nextPowerOf2(img.height() * 2 - 1);
//     let FFTWidth = nextPowerOf2(img.width() * 2 - 1);

//     let imgPaddingAfter = [
//         Math.floor((FFTHeight - img.height()) / 2),
//         Math.floor((FFTWidth - img.width()) / 2)
//     ];
//     let imgPaddingBefore = [
//         Math.ceil((FFTHeight - img.height()) / 2),
//         Math.ceil((FFTWIdht - img.width()) / 2)
//     ];
//     let psfPaddingAfter = [
//         heightPowerOf2 - psf.shape[0],
//         widthPowerOf2 - psf.shape[1]
//     ];
//     img.pad()
// }

// function pad2DSignal( signal, toHeight, toWidth, center=true, paddingType=0, padValue=undefined) {
//     let signalHeight = signal.shape[0];
//     let sigWidth = signal.shape[1];
//     let padBefore = [0, 0];
//     let padAfter;

//     if (center) {
//         padBefore = [
//             Math.ceil((FFTHeight - signalHeight) / 2),
//             Math.ceil((FFTWIdht - signalWidth) / 2)
//         ];
//         padAfter = [
//             Math.floor((FFTHeight - signalHeight) / 2),
//             Math.floor((FFTWidth - signalWidth) / 2)
//         ];
//     } else {
//         padAfter = [
//             toHeight - signalHeight,
//             toWidth - signalWidth
//         ];
//     }

//     // switch (paddingType) {
//     //     case 0: 
//     //         signal.pad
//     // }
// }
// function convolveRealImage(img, psf, edge="mirror") {
//     let output = [];
//         finalHeight = img.height() + psf.rows() - 1,
//         finalWidth = img.width() + psf.cols() - 1,
//         leftRadius = Math.ceil(psf.cols() / 2) - 1, //5 = 2 4 = 1
//         rightRadius = psf.cols() - leftRadius - 1, //5 = 2; 4 = 2;
//         topRadius = Math.ceil(psf.rows() / 2) - 1,
//         bottomRadius = psf.rows() - topRadius - 1;
//         // cntrRI= leftRadius,
//         // cntrCI = rightRadius,
//         let currIndex = 0;
//         let rightSum = 0;
//         let topSum = 0;
//         let sum = 0;
//         let subCols = 0;
//         let subRows = 0;
//         let totalSub = 0;
//     for (let row = 0; row < imgHeight; row++) {
//         for (let col = 0; col < imgWidth; col++) {
            

//             //calculate submerged columns and rows;
//             if (col < leftRadius) subCols = leftRadius - col;
//             else if (imgWidth - col <= rightRadius) subCols = rightRadius - (imgWidth - col - 1);
//             if (row < topRadius) subRows = topRadius - row;
//             else if (imgHeight - row <= bottomRadius) subRows = bottomRadius - (imgHeight - row - 1);
            
//             if (!subRows || !subCols) {
//                 switch(edge) {
//                     case "mirror" : 
//                         wrapRInd = imgHeight - r - 1;
//                         break;
//                     case "pad" : 
//                         val = 0;
//                         break;
//                     case "correct" :
//                         //divide by immersed pixels;
//                         break;
//                 }
//             } else {
//                 for (let pr = -topRadius; pr <= bottomRadius; pr++) {
//                     for (let pc = -leftRadius; pc <= rightRadius; pc++) {
//                         //sum += img[((r * imgWidth) + c) * chans] * 
                        
//                     }
    
//                 }
//             }
//         }
//     }

//     for (let r = -topRadius; r < imgHeight - topRadius; r++) {
//         for (let c = -leftRadius; c < imgWidth - leftRadius; c++) {
//             let sum = 0,
//                 subC = 0,
//                 subR = 0,
//                 totalSub;

//             //calculate submerged columns and rows;
//             if (c < 0) subC = 0 - c;
//             else if (c + psfWidth - 1 >= imgWidth) subC = psfWidth - imgWidth + c;
//             if (r < 0) subR = 0 - r;
//             else if (r + psfHeight - 1 >= imgHeight) subR = psfHeight - imgHeight + r;
            
//             if (!subR || !subC) {
//                 switch(edge) {
//                     case "mirror" : 
//                         wrapRInd = imgHeight - r - 1;
//                         break;
//                     case "pad" : 
//                         val = 0;
//                         break;
//                     case "correct" :
//                         //divide by immersed pixels;
//                         break;
//                 }
//             } else {
//                 for (let pr = 0; pr < psfHeight; pr++) {
//                     for (let pc = 0; pc < psfWidth; pc++) {
//                         //sum += psf[]
                        
//                     }
//                 }
//             }
//             //output[row col] = 
//         }
//     }
// }
module.exports = {
    equalizeImgLight,
    FFT2DFromRealImage,
    inverseFFT2DImage,
    FFT1DImage,
}
},{"./cie.js":1,"./histogram.js":4,"./rgb.js":8,"./rgbimage.js":9,"./signal.js":10,"./srgb.js":11,"./utility/array_util.js":13,"./utility/num_util.js":14,"./utility/type_util.js":16}],6:[function(require,module,exports){
const { RGBImage } = require('./rgbimage.js');
const { equalizeImgLight, FFT2DFromRealImage, inverseFFT2DImage, padRealImage } = require('./imageprocessing.js');
const { RGB, RGBA } = require('./rgb.js');
const { relativeLuminence, linearize8Bit } = require('./srgb.js');
const { lightness } = require('./cie.js');
const { gaussGray } = require('./randomgeneration.js');
const { zeros } = require('./utility/array_util.js');
const { round } = require('./utility/num_util.js');
const { randIntArray } = require('./randomgeneration.js');
const { extendRealFreqDomain, FFT, inverseFFT } = require('./signal.js');
const { impulse, psf } = require('./filter.js');
const { Tensor } = require('./tensor.js');
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
    console.log("hi");

    let data = [0,1,2,3,4,5,6,7,8,9,10,11];
    console.log(data);
    let tt = new Tensor([2,3,2], data);
    console.log(tt);
    tt.pad([1], [1]);
    console.log(tt.toNestedArray());
    // console.log("settring [], 0,2 " + tt.set([[], [0, 2]], [9,1,9,1,9,1]));
    // tt.pad([1,1], [1,1], [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
    // console.log("gettring [], 0,2 " + tt.get([[], [0, 2]], [9,1,9,1,9,1]));
    // console.log(tt.data);
    // console.log(tt.toNestedArray());
    // console.log(psf.gauss(5, 5, 1));
    // let canvas = document.getElementById("manip");
    // let context = canvas.getContext('2d');
    // let whratio = this.height / this.width;
    // let cwidth = 500;
    // let cheight = whratio * cwidth;
    // canvas.width = cwidth;
    // canvas.height = cheight;
    // context.drawImage(this, 0, 0, cwidth, cheight);
    // let contextData = context.getImageData(0,0, cwidth, cheight);
    // let rawImgData = contextData.data;
    // console.log("image pix = " + rawImgData.length);
    // console.log(rawImgData)
    // let jkImage = new RGBImage(rawImgData.slice(0,400), 10, true);
    // console.log(jkImage.toPixels(true));
    // console.log(jkImage.toNestedArray());
    // let chanTotal = 0;
    // jkImage.size;
    // console.log(`Getting lightness values for ${jkImage.width * jkImage.height} pixels`)
    // console.log(jkImage.toLightness());
    // equalizeImgLight(jkImage, 0, 256);
    // // console.log(read.getRedChannel());
    // // console.log(read.widthRes);
    // // console.log(read.heightRes);
    // // console.log(read.widthRes * read.heightRes * 4);
    // let LI = jkImage.lightnessDataIndices();

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
    let pw = 3;
    let grays = gaussGray(pw * pw, 32);
    
    console.log(grays.length)
    let hist = [];
    for (let m = 0; m < 256; m++) {
        hist[m] = 0;
    }
    for (let g = 0; g < grays.length; g++) {
        hist[grays[g]] += 1;
    }

    data = [];
    for (let i = 0; i < hist.length; i++) {
        data.push({name: i, value: hist[i] / grays.length})
    }
    displayHistogram('#old', data, "steelblue", 500, 1200)
    let grayImg = [];
    for (let g = 0; g < grays.length; g++) {
        grayImg.push(grays[g], grays[g], grays[g], 255);
    }
    console.log(padRealImage(grays, pw, 4, 6, 6));
    console.log(grayImg);
    console.log("Fourier");
    let { ReX, ImX } = FFT2DFromRealImage(grayImg, pw, 4, true);
    console.log(ReX);
    inverseFFT2DImage(ReX, ImX, 4, pw);
    console.log(ReX)
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

},{"./cie.js":1,"./filter.js":2,"./imageprocessing.js":5,"./randomgeneration.js":7,"./rgb.js":8,"./rgbimage.js":9,"./signal.js":10,"./srgb.js":11,"./tensor.js":12,"./utility/array_util.js":13,"./utility/num_util.js":14}],7:[function(require,module,exports){
const { clampTo } = require('./utility/num_util.js');

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

//Returns an integer greater or equal to min and less than (min + range).
function randInt(min, range) {
    return Math.floor(Math.random() * range) + min;
}

//Generates list of N random integers greater or equal to min and less than (min + range).
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


},{"./utility/num_util.js":14}],8:[function(require,module,exports){
const { invert, dot } = require('./flatimage/linear.js');
const redLevel = (rgbColor) => rgbColor[0];
const greenLevel = (rgbColor) => rgbColor[1];
const blueLevel = (rgbColor) => rgbColor[2];
const rgb = module.exports

RGBA = {
    color : (r, g, b, a) => [r, g, b, a ? a : 255],
    redLevel,
    greenLevel,
    blueLevel,
    alphaLevel : (rgbaColor) => rgbaColor[3]
} 
RGB = {
    color : (r, g, b) => [r, g, b],
    redLevel,
    greenLevel,
    blueLevel
} 
let averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
XYZconversionMatrix = (primaryCoords, XYZWhite) => {
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

let createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);

let gradient = (start, end, step) => {
    let grad = [];

    for (let i = 0; i < step; i++) {
        let intenseEnd = i;
        let intenseStrt = step - i;

        let color = RGBA.color(
            Math.round((intenseStrt * RGBA.redLevel(start) + intenseEnd * RGBA.redLevel(end)) / step),
            Math.round((intenseStrt * RGBA.greenLevel(start) + intenseEnd * RGBA.greenLevel(end)) / step),
            Math.round((intenseStrt * RGBA.blueLevel(start) + intenseEnd * RGBA.blueLevel(end)) / step)
        );

        grad[i] = color;
    }
    return grad;
}

module.exports = {
    RGBA,
    RGB,
    averageChannelLevel,
    XYZconversionMatrix,
    createRGBRelativeLuminance,
    gradient
}
},{"./flatimage/linear.js":3}],9:[function(require,module,exports){
const { relativeLuminence, linearize8Bit } = require('./srgb.js');
const { lightness } = require('./cie.js');
const { Tensor } = require('./tensor.js');

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
},{"./cie.js":1,"./srgb.js":11,"./tensor.js":12}],10:[function(require,module,exports){
'use strict';
const { dim } = require('./flatimage/linear');
const { zeros } = require('./utility/array_util.js');
const { bankRound } = require('./utility/num_util.js');
const { isPowerOfTwo } = require('./utility/type_util.js');

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

//Calculates the number of complex multiplications per output sample
function irFFTSizeCost(size, exponent, m) {
    return (size * (exponent + 1)) / (size - m + 1);
}

//Finds optimal FFT size for an impulse response of length m. 
function optFFTSize(m) {
    let size = 2;
    let exponent = 1;
    while (size < m) {
        size *= 2;
        exponent++;
    }
    let cost = Infinity;
    while (cost > irFFTSizeCost(size * 2, exponent + 1, m)) {
        size *= 2;
        exponent++;
        cost = irFFTSizeCost(size, exponent, m);
    }
    return size;
}


function convolveReal(signal, ir) {
    let n = signal.length;
    let m = ir.length;
    let fftSize = optFFTSize(m);
    let segSize = fftSize - m + 1;
    let segCount = Math.ceil(n / segSize);
    let overlapSize = fftSize - segSize;
    let overlap = zeros([overlapSize], true);
    let XX = [];
    let output = [];

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
},{"./flatimage/linear":3,"./utility/array_util.js":13,"./utility/num_util.js":14,"./utility/type_util.js":16}],11:[function(require,module,exports){
const { multiply } = require('./flatimage/linear.js');
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

},{"./flatimage/linear.js":3,"./rgb.js":8}],12:[function(require,module,exports){
'use strict';
const { sizeFrom, stridesFrom, isShape, toNestedArray, initArray } = require('./utility/array_util.js');
const { reduceRangedIndex, reducedShape, trimRangedIndex, isRangedIndex } = require('./utility/rangedindex_util.js');

const Tensor = (function() {
    function Tensor(shape, data) {
        if(!isShape(shape)) {
            throw new TypeError('Shape is not well-formed. Shape should be an array of integers');
        }
        this.shape = shape;
        this.size = sizeFrom(shape);
        this.strides = stridesFrom(shape);
        this.data = data;
        this.rank = shape.length;
    }
    const $T = Tensor.prototype;
    
    $T.__toDataIndex = function(tensorIndex) {
        let dataIndex = 0;
        if (this.rank === 0) return dataIndex;
        
        let dims = tensorIndex.length >= this.rank ? this.rank : tensorIndex.length;
        for (let i = 0; i < dims; i++) {
            dataIndex += this.strides[i] * tensorIndex[i];
        }
        if (dataIndex >= this.size || dataIndex < 0) throw new Error('Index out of range');
        return dataIndex;
    }
    
    $T.__toTensorIndex = function(dataIndex) {
        let tensorIndex = [];
        let tii;
        for (tii = 0; tii < this.rank - 1; tii++) {
            tensorIndex[tii] = Math.floor(dataIndex / this.strides[tii]);
            dataIndex -= tensorIndex[tii] * this.strides[tii];
        }
        tensorIndex[tii] = dataIndex;
        return tensorIndex;
    }

    $T.__incrementDataIndex = function(dataIndex, increment, dimIndex) {
        dataIndex += this.strides[dimIndex] * increment;
        return dataIndex;
    }

    $T.__forEachHelper = function(dataIndex, reducedIndex, callbackFn, dim=0) {
        for (let range of reducedIndex[dim]) {
            let min = range[0];
            let max = range[1];
    
            if (dim === reducedIndex.length - 1) {
                for (let k = min; k < max; k++) {
                    let currDI = dataIndex + k * this.strides[dim];
                    for (let j = 0; j < this.strides[dim]; j++) {
                        callbackFn(this.data[currDI], currDI);
                        currDI++;
                    }
                }
            } else {
                for (let k = min; k < max; k++) {
                    this.__forEachHelper(
                        dataIndex + k * this.strides[dim],
                        reducedIndex,
                        callbackFn,
                        dim + 1
                    );
                }
            }
        }
    }

    $T.forEachExplicit = function(explicitIndex, callbackFn) {
        let dataIndex = this.__toDataIndex(explicitIndex);
        if (this.rank > explicitIndex.length) {
            let outputLength = this.strides[explicitIndex.length - 1];
            for (let i = 0; i < outputLength; i++) {
                callbackFn(this.data[dataIndex], dataIndex);
                dataIndex++;
            }
        } else {
            callbackFn(this.data[dataIndex], dataIndex);
        }
    }

    $T.forEachVal = function(rangedIndex, callbackFn) {
        let trimmedIndex = trimRangedIndex(rangedIndex, this.rank);
        let dataIndex = 0;

        if (isRangedIndex(trimmedIndex, this.shape)) {
            let reducedIndex = reduceRangedIndex(trimmedIndex, this.shape);
            this.__forEachHelper(dataIndex, reducedIndex, callbackFn);
        } else {
            this.forEachExplicit(trimmedIndex, callbackFn);
        }
    }
    
    $T.getExplicit = function(explicitIndex) {
        let output;
        if (this.rank > explicitIndex.length) {
            output = [];
            let i = 0;
            this.forEachExplicit(explicitIndex, function(value) {
                output[i] = value;
                i++;
            });
        } else {
            output = this.data[this.__toDataIndex(explicitIndex)];
        }

        return output;
    }

    $T.get = function(rangedIndex) {
        let output = [];
        let i = 0;
        this.forEachVal(rangedIndex, function(value) {
            output[i] = value;
            i++;
        });
        return output;
    }

    $T.getAtDI = function(dataIndex) {
        return this.data[dataIndex];
    }
    
    $T.set = function(rangedIndex, values) {
        if (!Array.isArray(values)) values = [values]; //If is a single value, wrap in array.
        let trimmedIndex = trimRangedIndex(rangedIndex, this.rank);
        let requiredInputLength;
        let valIndex = 0;

        if (isRangedIndex(trimmedIndex, this.shape)) {
            let reducedIndex = reduceRangedIndex(trimmedIndex, this.shape);
            requiredInputLength = sizeFrom(reducedShape(reducedIndex));
        } else {
            requiredInputLength = this.strides[trimmedIndex.length - 1];
        }

        if (values.length !== requiredInputLength) {
            throw new Error(
                `Number of values, ${values.length}, does not meet the required amount, ${requiredInputLength}`
            );
        }
        
        this.forEachVal(rangedIndex, (value, i) => {
            this.data[i] = values[valIndex];
            valIndex++;
        });
    }

    $T.setAtDI = function(dataIndex, value) {
        this.data[dataIndex] = value;
    }

    // $T.__padHelper = function(orig, oShape, oIndex, padded, pStrides, pInd, padAfter, padBefore, padVals) {
    //     for (let b = 0; b < padBefore[0] * pStrides[0]; b++) {
    //         padded[pInd++] = padVals[0];
    //     }
        
    //     //Base Case: If this is the final dimension of original shape, add the original data
    //     if (oShape.length === 1) {  
    //         for (let c = 0; c < oShape[0]; c++) {        
    //             if (padBefore.length > 1) {
    //                 for (let b = 0; b < padBefore[1]; b++) {
    //                     padded[pInd++] = padVals[0];
    //                 }
    //             }
    //             padded[pInd++] = orig[oIndex++];
    //             if (padAfter.length > 1) {
    //                 for (let a = 0; a < padAfter[1]; a++) {
    //                     padded[pInd++] = padVals[0];
    //                 }
    //             }
    //         }
    //     } else {
    //         for (let c = 0; c < oShape[0]; c++) {
    //             let indices = this.__padHelper(
    //                 orig, oShape.slice(1), oIndex,
    //                 padded, pStrides.slice(1), pInd,
    //                 padAfter.slice(1), padBefore.slice(1), padVals.slice(1)
    //             );
    //             oIndex = indices[0];
    //             pInd = indices[1];
    //         }
    //     }

    //     for (let a = 0; a < padAfter[0] * pStrides[0]; a++) {
    //         padded[pInd++] = padVals[0];
    //     }
    //     return [oIndex, pInd];
    // }

    // $T.pad = function(padAfter, padBefore, inplace=true) {
    //     if (padAfter.length !== padBefore.length) {
    //         throw new Error(`List of padding before each dimension ${ padBefore.length }
    //          and list of padding after each dimension ${ padAfter.length } lengths do not match`);
    //     }
    //     let newRank = padAfter.length > this.rank ? padAfter.length : this.rank,
    //         newShape = [],
    //         newData = [],
    //         newStrides;

    //     for (let dim = 0; dim < newRank; dim++) {
    //         let before = dim >= padBefore ? 0 : padBefore[dim],
    //             after = dim >= padAfter ? 0 : padAfter[dim],
    //             curr = dim >= this.rank ? 1 : this.shape[dim];
    //         newShape[dim] = curr + before + after;
    //     }
    //     newStrides = stridesFrom(newShape);

    //     this.__padHelper(this.data, this.shape, 0, newData, newStrides, 0, padAfter, padBefore, padVals);
        
    //     if (inplace) {
    //         this.data = newData;
    //         this.size = newData.length;
    //         this.shape = newShape;
    //         this.strides = newStrides;
    //         this.rank = newRank;
    //     }

    //     return newData;
    // }

    function wrap(tt, currIndex, dim, values, shape, strides, padAfter, padBefore) {
        let before = padBefore[dim] ? padBefore[dim] : 0;
        currIndex[dim] = Math.abs(tt.shape[dim] + (-1 - before % tt.shape[dim])) % tt.shape[dim];
        for (let s = 0; s < shape[dim]; s++) {
            currIndex[dim] = (currIndex[dim] + 1) % tt.shape[dim];

            if (dim + 1 === tt.rank) {
                let val = tt.getExplicit(currIndex);
                for (let g = 0; g < strides[dim]; g++) {
                    values.push(val);
                }
            } else {
                wrap(tt, currIndex, dim + 1, values, shape, strides, padAfter, padBefore);
            }
        }
        currIndex.pop();
        return values;
    }

    function reflect(tt, currIndex, dim, values, shape, strides, padAfter, padBefore) {

    }
    // function getPaddingValues(padAfter, padBefore, padType, constant) {
    //     let values = [];

    //     switch (padType) {
    //         case(0) :
    //             values = initArray([])
    //     }
    // }

    // $T.__padHelper = function(orig, oShape, oIndex, padded, pStrides, pInd, padAfter, padBefore, padType, constant) {
    //     for (let b = 0; b < padBefore[0] * pStrides[0]; b++) {
    //         padded[pInd++] = padVals[0];
    //     }
        
    //     //Base Case: If this is the final dimension of original shape, add the original data
    //     if (oShape.length === 1) {  
    //         for (let c = 0; c < oShape[0]; c++) {        
    //             if (padBefore.length > 1) {
    //                 for (let b = 0; b < padBefore[1]; b++) {
    //                     padded[pInd++] = padVals[0];
    //                 }
    //             }
    //             padded[pInd++] = orig[oIndex++];
    //             if (padAfter.length > 1) {
    //                 for (let a = 0; a < padAfter[1]; a++) {
    //                     padded[pInd++] = padVals[0];
    //                 }
    //             }
    //         }
    //     } else {
    //         for (let c = 0; c < oShape[0]; c++) {
    //             let indices = this.__padHelper(
    //                 orig, oShape.slice(1), oIndex,
    //                 padded, pStrides.slice(1), pInd,
    //                 padAfter.slice(1), padBefore.slice(1), padVals.slice(1)
    //             );
    //             oIndex = indices[0];
    //             pInd = indices[1];
    //         }
    //     }

    //     for (let a = 0; a < padAfter[0] * pStrides[0]; a++) {
    //         padded[pInd++] = padVals[0];
    //     }
    //     return [oIndex, pInd];
    // }

    $T.pad = function(padBefore, padAfter, inplace=true, padType='constant', constant=undefined) {
        let newRank = this.rank;
        if (padAfter.length > newRank) newRank = padAfter.length;
        if (padBefore.length > newRank) newRank = padBefore.length;
        let newShape = [];
        let newData = [];
        let newStrides;
        let padValues;

        for (let dim = 0; dim < newRank; dim++) {
            let before = padBefore[dim] ? padBefore[dim] : 0,
                after = padAfter[dim] ? padAfter[dim] : 0,
                curr = this.shape[dim] ? this.shape[dim] : 1;
            newShape[dim] = curr + before + after;
        }

        newStrides = stridesFrom(newShape);
        //padValues = getPaddingValues(padAfter, padBefore, padType, constant);

        wrap(this, [], 0, newData, newShape, newStrides, padAfter, padBefore);
        
        if (inplace) {
            this.data = newData;
            this.size = newData.length;
            this.shape = newShape;
            this.strides = newStrides;
            this.rank = newRank;
        }

        return newData;
    }

    $T.toNestedArray = function() {
        return toNestedArray(this.data, this.shape);
    }
    
    return Tensor;
})();

module.exports = {
    Tensor
}

},{"./utility/array_util.js":13,"./utility/rangedindex_util.js":15}],13:[function(require,module,exports){
function isShape(shape) {
    if (!Array.isArray(shape)) return false;
    if (shape.length > 1) {
        for (let dimSize of shape) {
            if (!Number.isInteger(dimSize)) return false;
        }
    }
    return true;
}

function sizeFrom(shape) {
    return shape.reduce((acc, curr) => acc * curr);
}

function stridesFrom(shape) {
    let rank = shape.length,
        strides = [];
        strides[rank - 1] = 1;
        for (let i = rank - 2; i >= 0; i--) {
            strides[i] = strides[i + 1] * shape[i + 1];
        }
        return strides;
}

function nestleFlatArray(flatArr, shape, start) {
    let nest = [],
        dim = shape[0];
    if (shape.length === 1) {
        for (let i = 0; i < dim; i++) {
            nest[i] = flatArr[start + i];
        }
    } else {   
        for (let i = 0; i < dim; i++) {
            let remainDim = shape.slice(1),
                stride = remainDim.reduce((acc, curr) => acc * curr);
            nest.push(nestleFlatArray(flatArr, remainDim, start + i * stride));
        }
    }
    return nest;
}

function toNestedArray(flatArr, shape) {
    if (shape.length === 0) return flatArr[0];
    let size = sizeFrom(shape);
    if (size !== flatArr.length) throw new Error(`Shape does not match the input length`);
    if (size === 0) return [];
    return nestleFlatArray(flatArr, shape, 0);
}

function flatten(arr) {
    let isFlat = true;
    for (let i in arr) {
        if (Array.isArray(arr[i])) {
            arr[i] = flatten(arr[i]);
            isFlat = false;
        }
    }
    return isFlat ? arr : [].concat(...arr);
}

function initNestedArray(value, shape) {
    let arr = [];
    if (shape.length === 1) {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = value;
        }
    } else {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = initNestedArray(value, shape.slice(1));
        }
    }
    return arr;
}

function initArray(value, shape, flat=false) {
    let arr;
    let size = sizeFrom(shape);

    if (flat) {
        arr = [];
        for (let i = 0; i < size; i++) {
            arr[i] = value;
        }
    } else {
        arr = initNestedArray(value, shape);
    }
    return arr;
}

function zeros(shape, flat=false) {
    return initArray(0, shape, flat);
}

function ones(shape, flat=false) {
    return initArray(1, shape, flat)
}

function identity(size, flat=false) {
    let arr; 
    arr = zeros([size, size], flat)
    if (flat) {
        for (let i = 0; i < size; i++) {
            arr[i + (i * size) - 1] = 1;
        }
    } else {
        for (let i = 0; i < size; i++) {
            arr[i][i] = 1;
        }
    }
    return arr;
}

module.exports = {
    toNestedArray,
    flatten,
    initArray,
    stridesFrom,
    sizeFrom,
    isShape,
    zeros,
    ones,
    identity,
}
},{}],14:[function(require,module,exports){
const { isHex } = require('./type_util.js');

function intToHex(int) {
    if (!Number.isInteger(int)) throw new TypeError(`Value ${ int } is not an Integer`);
    return int.toString(16);
}

function hexToInt(hex) {
    if (!isHex(hex)) throw new TypeError(`Value ${ hex } is not a Hexadecimal number`);
    return parseInt(hex, 16);
}

function roundTo(number, digits=0) {
    var multiplicator = Math.pow(10, digits);
    number = parseFloat((number * multiplicator).toFixed(11));
    return Math.round(number) / multiplicator;
}

function clampTo(number, min, max, alias=false) {
    if (number < min) return alias ? min + ((min - number) % (max - min)) : min;
    if (number > max) return alias ? max - (number % (max - min)) : max;
    return number;
}

//From User Tim Down.
//https://stackoverflow.com/questions/3108986/gaussian-bankers-rounding-in-javascript
function bankRound(number, decimalPlaces=0) {
    let multiplicator = Math.pow(10, decimalPlaces);
    let naturalNum = +(number * multiplicator).toFixed(8); //Avoid Rounding Errors
    let integerPart = Math.floor(naturalNum);
    let fractionalPart = naturalNum - integerPart;
    let roundError = 1e-8; //Allow for rounding errors in f
    let r = (fractionalPart > 0.5 - roundError && fractionalPart < 0.5 + roundError) ? 
        ((integerPart % 2 === 0) ? integerPart : integerPart + 1) : Math.round(naturalNum);
    return decimalPlaces ? r / multiplicator : r;
}

function nextPowerOf2(number) {
    let power = 2;
    while (power < number) power *= 2;
    return power;
}

function nextExponentOf2(number) {
    let power = 2;
    let exponent = 1;
    while (power < number) {
        power *= 2;
        exponent++;
    }
    return exponent;
}

module.exports = {
    intToHex,
    hexToInt,
    roundTo,
    clampTo,
    bankRound,
    nextExponentOf2,
    nextPowerOf2
}
},{"./type_util.js":16}],15:[function(require,module,exports){
'use strict';
const { stridesFrom } = require('./array_util.js');
//End operator is Infinity
const isEndOperator = symbol => (!isNaN(symbol) && !isFinite(symbol));
//Range operator is an empty array
const isRangeOperator = symbol => (Array.isArray(symbol) && symbol.length === 0);
const isIndex = (symbol, max, min=0) => (Number.isInteger(symbol) && symbol >= min && symbol < max);

const trimRangedIndex = (tensorIndex, toRank=null) => {
    let newEnd = (Number.isInteger(toRank) && tensorIndex.length > toRank) ?
                toRank - 1 :
                tensorIndex.length - 1;
    for (let i = newEnd; i >= 0; i--) {
        if (!(isRangeOperator(tensorIndex[newEnd]) || isEndOperator(tensorIndex[newEnd]))) {
            return tensorIndex.slice(0, newEnd + 1);
        }
    }
    return tensorIndex.slice(0,1);
}

const isRangedIndex = function(rangedIndex, shape) {
    let isRanged = false;
    for (let dim in rangedIndex) {
        let index = rangedIndex[dim];
        let length = shape[dim];

        if (isRangeOperator(index) || isEndOperator(index)) {
            isRanged = true;
        } else if (Array.isArray(index)) {
            let ii = 0;
            while(ii < index.length) {
                if (isRangeOperator(index[ii])) {
                    console.log('Range Operator is not between valid indices or the End Operator');
                    return null;
                }
                if (isEndOperator(index[ii])) {
                    if (isRangeOperator(index[ii + 1])) {
                        if (!(isEndOperator(index[ii + 2]) || isIndex([ii + 2], length))) {
                            console.log('Range Operator is not between valid indices or the End Operator');
                            return null;
                        }
                        ii += 3;
                    } else {
                        console.log('End Operator is not followed or preceded by the Range Operator');
                        return null;
                    }
                } else if (isIndex(index[ii], length)) {
                    if (isRangeOperator(index[ii + 1])) {
                        if (!(isEndOperator(index[ii + 2]) || isIndex(index[ii + 2], length, index[ii]))) {
                            console.log(`Value following Range Operator ${index[ii + 2]} is not a valid index or End Operator`);
                            return null;
                        }
                        ii += 3;
                    } else {
                        ii += 1;
                    }
                } else {
                    console.log(`Range Index Value ${index[ii]} is neither the End or Range Operators, nor a valid index`);
                    return null;
                }
            }
            isRanged = true;
        } else if (!isIndex(index, shape[dim])) {
            return null;
        }
    }
    return isRanged;
}

const reduceRangedIndex = function(rangedIndex, shape) {
    let reduced = [];
    for (let dim in rangedIndex) {
        let index = rangedIndex[dim];
        let length = shape[dim];
        if (isRangeOperator(index) || isEndOperator(index)) {
            reduced[dim] = [[0, length]];
        } else if (isIndex(index, length)) {
            reduced[dim] = [[index, index + 1]];
        } else if (Array.isArray(index)) {
            let rdim = [];
            let ii = 0;
            while(ii < index.length) {
                let pre;
                let post;
                if (isRangeOperator(index[ii])) {
                    throw new Error(`Range Operator is not between valid indices or the End Operator`);
                }
                if (isEndOperator(index[ii])) {
                    pre = 0;
                    if (isRangeOperator(index[ii + 1])) {
                        if (isEndOperator(index[ii + 2])) {
                            post = length;
                        } else if (isIndex(index[ii + 2], length)) {
                            post = index[ii + 2] + 1;
                        } else {
                            throw new Error(`Range Operator is not between valid indices or the End Operator`);
                        }
                        ii += 3;
                    } else {
                        throw new Error(`End Operator is not followed or preceded by the Range Operator`);
                    }
                } else if (isIndex(index[ii], length)) {
                    pre = index[ii];
                    if (isRangeOperator(index[ii + 1])) {
                        if (isEndOperator(index[ii + 2])) {
                            post = length;
                        } else if (isIndex(index[ii + 2], length, index[ii])) {
                            post = index[ii + 2] + 1;
                        } else {
                            throw new Error(`Value following Range Operator ${index[ii + 2]} is not a valid index or End Operator`);
                        }
                        ii += 3;
                    } else {
                        ii += 1;
                    }
                }
                if (post) {
                    rdim.push([pre, post]);
                } else {
                    rdim.push([pre, pre + 1]);
                }
            }
            reduced[dim] = rdim;
        } else {
            throw new Error(`Ranged Index ${index} is neither a Range or End Operator, nor a valid index`);
        }
    }
    return reduced;
}

const reducedShape = (reducedIndex) => reducedIndex.map(
    dim => dim.reduce(
        (acc, range) => acc + range[1] - range[0], 0
    )
);

const shapeToRangedIndex = (shape, transposeShape=null) => transposeShape ? 
    shape.map( (dimSize, i) => [0 + transposeShape[i], [], dimSize + 1 + transposeShape[i]]) :
    shape.map( dimSize => [0 , [], dimSize + 1]);

module.exports = {
    isRangeOperator,
    isEndOperator,
    isIndex,
    isRangedIndex,
    shapeToRangedIndex,
    reduceRangedIndex,
    trimRangedIndex,
    reducedShape,
}
},{"./array_util.js":13}],16:[function(require,module,exports){

function isString(value) {
    return (typeof value === 'string' || value instanceof String);
}

function isHex(hex) {
    if (!isString(hex)) return false;
    return hex.match(/^[0-9a-fA-F]+$/) !== null;
}

function inUnitInterval(value) {
    return (!isNaN(value)
    && value >= 0.0 
    && value <= 1.0)
}

function inNormalUnitInterval(value, normal=100) {
    return value >= 0 && value <= normal;
}

function is8BitInt(value) {
    return (!isNaN(value)
        && Number.isInteger(+value)
        && inNormalUI(value, 255));
}

function isPowerOfTwo(num) {
    return (num & ( num - 1)) == 0;
}

module.exports = {
    isString,
    isHex,
    inUnitInterval,
    inNormalUnitInterval,
    is8BitInt,
    isPowerOfTwo
}
},{}]},{},[6]);
