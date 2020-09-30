'use strict'

function constant(tt, currIndex, dim, values, shape, strides, padding, constVal) {
    let before = padding.before[dim] ? padding.before[dim] : 0;
    let after = padding.after[dim] ? padding.after[dim] : 0;
    let signalLength = tt.shape[dim];
    let slmin1 = signalLength - 1;

    for (let b = before; b > 0; b--) {
        currIndex[dim] = -1;

        if (dim + 1 === tt.rank) {
            for (let g = 0; g < strides[dim]; g++) {
                values.push(constVal);
            }
        } else {
            constant(tt, currIndex, dim + 1, values, shape, strides, padding, constVal);
        }
    }

    for (let d = 0; d < signalLength; d++) {
        currIndex[dim] = d;
        if (currIndex.length === tt.rank) {
            let val = tt.isValidIndex(currIndex) ? 
                tt.getExplicit(currIndex) :
                constVal;
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            constant(tt, currIndex, dim + 1, values, shape, strides, padding, constVal);
        }
    }

    for (let a = 1; a <= after; a++) {
        currIndex[dim] = -1;
        if (dim + 1 === tt.rank) {
            for (let g = 0; g < strides[dim]; g++) {
                values.push(constVal);
            }
        } else {
            constant(tt, currIndex, dim + 1, values, shape, strides, padding, constVal);
        }
    }
    currIndex.pop();
    return values;
}

function wrap(tt, currIndex, dim, values, shape, strides, padding) {
    let before = padding.before[dim] ? padding.before[dim] : 0;
    currIndex[dim] = Math.abs(tt.shape[dim] + (-1 - before % tt.shape[dim])) % tt.shape[dim];
    for (let s = 0; s < shape[dim]; s++) {
        currIndex[dim] = (currIndex[dim] + 1) % tt.shape[dim];

        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            wrap(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }
    currIndex.pop();
    return values;
}

function reflect(tt, currIndex, dim, values, shape, strides, padding) {
    let before = padding.before[dim] ? padding.before[dim] : 0;
    let after = padding.after[dim] ? padding.after[dim] : 0;
    let signalLength = tt.shape[dim];
    let slmin1 = signalLength - 1;

    for (let b = before; b > 0; b--) {
        currIndex[dim] = Math.floor(b / slmin1) % 2 ? slmin1 - (b % slmin1) : b % slmin1;

        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            reflect(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }

    for (let d = 0; d < signalLength; d++) {
        currIndex[dim] = d;
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            reflect(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }
    
    for (let a = 1; a <= after; a++) {
        currIndex[dim] = Math.floor(a / slmin1) % 2 ? a % slmin1 : slmin1 - (a % slmin1) ;
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            reflect(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }

    currIndex.pop();
    return values;
}

function symmetric(tt, currIndex, dim, values, shape, strides, padding) {
    let before = padding.before[dim] ? padding.before[dim] : 0;
    let after = padding.after[dim] ? padding.after[dim] : 0;
    let signalLength = tt.shape[dim];
    let slmin1 = signalLength - 1;

    for (let b = before - 1; b >= 0; b--) {
        currIndex[dim] = Math.floor(b / signalLength) % 2 ? slmin1 - (b % signalLength) : b % signalLength;

        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            symmetric(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }

    for (let d = 0; d < signalLength; d++) {
        currIndex[dim] = d;
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            symmetric(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }
    
    for (let a = 0; a < after; a++) {
        currIndex[dim] = Math.floor(a / signalLength) % 2 ? a % signalLength : slmin1 - (a % signalLength) ;
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            symmetric(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }

    currIndex.pop();
    return values;
}

function edge(tt, currIndex, dim, values, shape, strides, padding) {
    let before = padding.before[dim] ? padding.before[dim] : 0;
    let after = padding.after[dim] ? padding.after[dim] : 0;
    let signalLength = tt.shape[dim];
    let slmin1 = signalLength - 1;

    currIndex[dim] = 0;
    for (let b = before - 1; b >= 0; b--) {
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            edge(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }

    for (let d = 0; d < signalLength; d++) {
        currIndex[dim] = d;
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            edge(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }
    
    currIndex[dim] = slmin1;
    for (let a = 0; a < after; a++) {
        if (dim + 1 === tt.rank) {
            let val = tt.getExplicit(currIndex);
            for (let g = 0; g < strides[dim]; g++) {
                values.push(val);
            }
        } else {
            edge(tt, currIndex, dim + 1, values, shape, strides, padding);
        }
    }

    currIndex.pop();
    return values;
}

module.exports = {
    wrap,
    reflect,
    symmetric,
    edge,
    constant
}