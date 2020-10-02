'use strict'
const { Tensor } = require('./tensor.js');
const { stridesFrom, sizeFrom, zeros } = require('../utility/array_util/shape.js');
const { shapeToRangedIndex } = require('../utility/array_util/rangedindex.js');

const directSum = function(A, B) {
    let newRank = Math.max(A, B);
    let newShape = [];
    for (let r = 0; r < newRank; r++) {
        newShape[r] = (A.shape[r] ? A.shape[r] : 0) + (B.shape[r] ? B.shape[r] : 0);
    }
    let newStrides = stridesFrom(newShape);
    let newSize = sizeFrom(newShape);
    let sum = new Tensor(newShape, zeros(newShape, true));

    sum.set(shapeToRangedIndex(A.shape), A.data);
    sum.set(shapeToRangedIndex(B.shape, A.shape), B.data); 
    return sum;
}

// const tensorProduct = function(A, B) {

// }