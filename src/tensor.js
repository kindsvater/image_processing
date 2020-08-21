'use strict';
const { sizeFrom, stridesFrom, isShape, toNestedArray } = require('./utility/array_util.js');
const { reduceRangedIndex, reducedShape, trimRangedIndex, isRangedIndex } = require('./utility/rangedindex_util.js');

const Tensor = (function() {
    function Tensor(shape, data) {
        if(!isShape(shape)) {
            throw new TypeError('Shape is not proper type. Shape should be an array of integers');
        }
        this.shape = shape;
        this.size = sizeFrom(shape);
        this.strides = stridesFrom(shape);
        this.data = data;
        this.rank = shape.length;
    }
    const $T = Tensor.prototype;
    
    $T.__toDataIndex = function(tensorIndex) {
        console.log(this.size)
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

    $T.__incrementDataIndex = function(dataIndex, increments, dimIndices) {
        for (let i in dimIndices) {
            dataIndex += this.strides[dimIndices[i]] * increments[i];
        }
        return dataIndex;
    }

    // $T.get = function(rangedIndex) {
    //     let trimmedIndex = trimRangedIndex(rangedIndex, this.rank);
    //     let dataIndex = 0;
    //     let output;
    //     if (isRangedIndex(trimmedIndex, this.shape)) {
    //         output = [];
    //         let reducedIndex = reduceRangedIndex(trimmedIndex, this.shape);
    //         output = this.__getHelper(output, dataIndex, reducedIndex);
    //     } else {
    //         dataIndex = this.__toDataIndex(trimmedIndex);
    //         let outputLength = this.strides[trimmedIndex.length - 1];
    //         if (outputLength > 1) {
    //             output = [];
    //             for (let i = 0; i < outputLength; i++) {
    //                 output[i] = this.data[dataIndex + i];
    //             }
    //         } else {
    //             output = this.data[dataIndex];
    //         }
    //     }
    //     return output;
    // } 

    $T.__setHelper = function(dataIndex, reducedIndex, values, valIndex, dim=0) {
        for (let range of reducedIndex[dim]) {
            let min = range[0];
            let max = range[1];

            if (dim === reducedIndex.length - 1) {
                for (let k = min; k <= max; k++) {
                    let base = dataIndex + k * this.strides[dim];
                    for (let j = 0; j < this.strides[0]; j++) {
                        this.data[base + j] = values[valIndex];
                        valIndex++;
                    }
                }
            } else {
                for (let k = min; k <= max; k++) {
                    this.__setHelper(
                        dataIndex + k * this.strides[dim],
                        reducedIndex,
                        values,
                        valIndex,
                        dim + 1
                    )
                }
            }
        }
    }



    $T.__forEachHelper = function(dataIndex, reducedIndex, callbackFn, dim=0) {
        for (let range of reducedIndex[dim]) {
            let min = range[0];
            let max = range[1];
    
            if (dim === reducedIndex.length - 1) {
                for (let k = min; k < max; k++) {
                    let base = dataIndex + k * this.strides[dim];
                    for (let j = 0; j < this.strides[dim]; j++) {
                        callbackFn(this.data[base + j], base + j);
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
    
    $T.forEachVal = function(rangedIndex, callbackFn) {
        let trimmedIndex = trimRangedIndex(rangedIndex, this.rank);
        let dataIndex = 0;

        if (isRangedIndex(trimmedIndex, this.shape)) {
            let reducedIndex = reduceRangedIndex(trimmedIndex, this.shape);
            this.__forEachHelper(dataIndex, reducedIndex, callbackFn);
        } else {
            dataIndex = this.__toDataIndex(trimmedIndex);
            let outputLength = this.strides[trimmedIndex.length - 1];
            for (let i = 0; i < outputLength; i++) {
                callbackFn(this.data[dataIndex++], dataIndex);
            }
        }
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
    
    function padHelper(orig, oShape, oIndex, padded, pStrides, pInd, padAfter, padBefore, padVals) {
        for (let b = 0; b < padBefore[0] * pStrides[0]; b++) {
            padded[pInd++] = padVals[0];
        }
        
        //Base Case: If this is the final dimension of original shape, add the original data
        if (oShape.length === 1) {  
            for (let c = 0; c < oShape[0]; c++) {        
                if (padBefore.length > 1) {
                    for (let b = 0; b < padBefore[1]; b++) {
                        padded[pInd++] = padVals[0];
                    }
                }
                padded[pInd++] = orig[oIndex++];
                if (padAfter.length > 1) {
                    for (let a = 0; a < padAfter[1]; a++) {
                        padded[pInd++] = padVals[0];
                    }
                }
            }
        } else {
            for (let c = 0; c < oShape[0]; c++) {
                let indices = padHelper(
                    orig, oShape.slice(1), oIndex,
                    padded, pStrides.slice(1), pInd,
                    padAfter.slice(1), padBefore.slice(1), padVals.slice(1)
                );
                oIndex = indices[0];
                pInd = indices[1];
            }
        }

        for (let a = 0; a < padAfter[0] * pStrides[0]; a++) {
            padded[pInd++] = padVals[0];
        }
        return [oIndex, pInd];
    }

    $T.pad = function(padAfter, padBefore, padVals, inplace=true) {
        if (padAfter.length !== padBefore.length) {
            throw new Error(`List of padding before each dimension ${ padBefore.length }
             and list of padding after each dimension ${ padAfter.length } do not match`);
        }
        let newRank = padAfter.length > this.rank ? padAfter.length : this.rank,
            newShape = [],
            newData = [],
            newStrides;

        for (let dim = 0; dim < newRank; dim++) {
            let before = dim >= padBefore ? 0 : padBefore[dim],
                after = dim >= padAfter ? 0 : padAfter[dim],
                curr = dim >= this.rank ? 1 : this.shape[dim];
            newShape[dim] = curr + before + after;
        }
        newStrides = stridesFrom(newShape);

        padHelper(this.data, this.shape, 0, newData, newStrides, 0, padAfter, padBefore, padVals);
        
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
