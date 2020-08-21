'use strict'
const { Tensor } = require('./tensor.js');
const { stridesFrom } = require('./utility/array_util.js');

const __dshelp = function( dim=0) {

}
const directSum = function(A, B) {
    let newRank = Math.max(A, B);
    let newShape = [];
    for (let r = 0; r < newRank; r++) {
        newShape[r] = (A.shape[r] ? A.shape[r] : 0) + (B.shape[r] ? B.shape[r] : 0);
    }
    let newStrides = stridesFrom(newShape);

}


$T.__forEachHelper = function(dataIndex, reducedIndex, callbackFn, dim=0) {
    for (let range of reducedIndex[dim]) {
        let min = range[0];
        let max = range[1];

        if (dim === reducedIndex.length - 1) {
            for (let k = min; k <= max; k++) {
                let base = dataIndex + k * this.strides[dim];
                for (let j = 0; j < this.strides[dim]; j++) {
                    callbackFn(this.data[base + j], base + j);
                }
            }
        } else {
            for (let k = min; k <= max; k++) {
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

$T.forEachVal = function(rangedIndex, callbackFn) {
    let trimmedIndex = trimRangedIndex(rangedIndex, this.rank);
    let dataIndex = 0;
    console.log("foreach this");
    console.log(this);
    if (isRangedIndex(trimmedIndex, this.shape)) {
        output = [];
        let reducedIndex = reduceRangedIndex(trimmedIndex, this.shape);
        output = this.__forEachHelper(dataIndex, reducedIndex, callbackFn);
    } else {
        dataIndex = this.__toDataIndex(trimmedIndex);
        let outputLength = this.strides[trimmedIndex.length - 1];
        for (let i = 0; i < outputLength; i++) {
            callbackFn(this.data[dataIndex++], dataIndex);
        }
    }
}

var output = [];
var i = 0;
console.log("Get this");
console.log(this);
$T.forEachVal(rangedIndex, function(value) {
    output[i] = value;
    i++;
});
return output;