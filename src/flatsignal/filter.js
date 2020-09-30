const { zeros, initArray, toNestedArray } = require("../utility/array_util.js");
const { roundTo } = require('../utility/num_util.js');

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
function edgeEnhance(k, radius=1, flat=true) {
    let kernel = [];
    let width = radius * 2 + 1;
    let sizeMin1 = width * width - 1;

    let halfOfNegVals = radius * width + radius;
    for (let i = 0; i < halfOfNegVals; i++) {
        kernel.push( -k / sizeMin1 );
    }
    kernel.push(k + 1);
    for (let j = 0; j < halfOfNegVals; j++) {
        kernel.push( -k / sizeMin1);
    }

    if (!flat) kernel = toNestedArray(kernel, [width, width]);
    return kernel;
}

//TODO: Generalize to multiple Dimensions
function genGaussFilter(m, n, scale, flat=true) {
    let psf = [],
    x,
    y;
    for (let r = 0; r < m; r++) {
        y = Math.ceil(r - (m / 2)); 
        for (let c = 0; c < n; c++) {
            x = Math.ceil(c - (n / 2));
            psf.push(roundTo((1 / (2 * Math.PI * scale * scale)) * Math.exp(-((x * x) + (y * y)) / (2 * scale * scale)), 4));
        }
    }
    if (!flat) psf = toNestedArray(psf, [m, n]);
    return psf;
}

const psf = {
    "box" : (rows, cols, flat=true) => initArray(1, [rows, cols], flat),
    "delta" : (radius=1, flat=true) => edgeEnhance(0, radius, flat),
    "shiftSubtract" : () => [[0,0,0],[0,1,0],[0,0,-1]],
    "edgeDetect" : (radius=1, flat=true) => edgeEnhance(1, radius, flat),
    "edgeEnhance" : edgeEnhance,
    "gauss" : genGaussFilter
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