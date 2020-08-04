const { zeros, initialize, round } = require("./util");

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