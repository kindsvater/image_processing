const { zeros, initArray, } = require("../utility/array_util/init.js");
const { toNestedArray } = require("../utility/array_util/dimension.js");
const { roundTo } = require('../utility/num_util.js');
const { Tensor } = require('../tensor/tensor.js');
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

function rotate180(psf) {
    let rotated = new Tensor(psf.shape, psf.data.slice(0));
    for (let r = 0; r < psf.shape[0]; r++) {
        for (let c = 0; c < psf.shape[1]; c++) {
            rotatedIndex = [
                psf.shape[0] - 1 - r,
                psf.shape[1] - 1 - c
            ];
            rotated.setExplicit(rotatedIndex, psf.getExplicit([r, c]));
        }
    }
    return rotated;
}

function makeImageKernel(psf, height, width) {
    let shape = [height, width];
    let rotated = rotate180(psf);
    let kernel = new Tensor(shape, zeros(shape, true));
    let center = [
        Math.floor(rotated.shape[0] / 2),
        Math.floor(rotated.shape[1] / 2)
    ];
    let i;
    let col;

    let row = 0;
    for (i = center[0]; i < rotated.shape[0]; i++) {
        col = kernel.shape[1] - (rotated.shape[1] - center[1]);
        for (j = 0; j < center[1]; j++) {
            kernel.setExplicit([row, col++], rotated.getExplicit([i, j]));
        }
        col = 0;
        for (j = center[1]; j < rotated.shape[1]; j++) {
            kernel.setExplicit([row, col++], rotated.getExplicit([i, j]));
        }
        row++;
    }

    row = kernel.shape[0] - (rotated.shape[0] - center[0]);
    for (i = 0; i < center[0]; i++) {
        col = kernel.shape[1] - (rotated.shape[1] - center[1]);
        for (j = 0; j < center[1]; j++) {
            kernel.setExplicit([row, col++], rotated.getExplicit([i, j]));
        }
        col = 0;
        for (j = center[1]; j < rotated.shape[1]; j++) {
            kernel.setExplicit([row, col++], rotated.getExplicit([i, j]));
        }
        row++;
    }

    return kernel;
}

module.exports = {
    makeImageKernel,
    impulse,
    psf
}