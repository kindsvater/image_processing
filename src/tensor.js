'use strict';
const { sizeFrom, stridesFrom, isShape, toNestedArray } = require('./utility/array_util.js');
const { reduceRangedIndex } = require('./utility/rangedindex_util.js');
const Tensor = (function() {
    function Tensor(shape, data) {
        if(!isShape) {
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
    // function getAll(output, startIndex, dim) {
    //     for (let i = 0; i < )
    // }
    $T.__getHelper = function(output, dataIndex, reducedIndex, strides) {
        for (let dim in reducedIndex) {
            for (let range of reducedIndex[dim]) {
                let min;
                let max;
                if (Array.isArray(range)) {
                    min = range[0];
                    max = range[1];
                } else {
                    min = range;
                    max = min;
                }
                if (reducedIndex.length === 1) {
                    for (let k = min; k <= max; k++) {
                        let base = dataIndex + k * strides[0];
                        for (let j = 0; j < strides[0]; j++) {
                            output.push(this.data[base + j]);
                        }

                    }
                } else {
                    for (let k = min; k <= max; k++) {
                        this.__getHelper(output, dataIndex + k * strides[dim], reducedIndex.slice(1), strides.slice(1));
                    }
                }
            }
        }
        return output;
    }

    $T.get = function(rangedIndex) {
        let trimmedIndex = trimRangedIndex(rangedIndex);
        if (trimmedIndex.length > this.rank) {
            trimmedIndex = trimmedIndex.slice(0, this.rank);
        }
        let dataIndex = 0;
        let output;

        if (isRangedIndex(trimmedIndex)) {
            output = [];
            let reducedIndex = reduceRangedIndex(trimmedIndex, this.shape);
            output = this.__getHelper(output, dataIndex, reducedIndex, this.strides);
        } else {
            dataIndex = this.__toDataIndex(trimmedIndex);
            let outputLength = this.strides[dims - 1];
            if (outputLength > 1) {
                output = [];
                for (let i = 0; i < outputLength; i++) {
                    output[i] = this.data[dataIndex + i];
                }
            } else {
                output = this.data[dataIndex];
            }
        }

        return output;
    } 

    // $T.set = function(location, value) {
    //     if (Number.isInteger(location)) {
    //         if (location >= this.size || location < 0) throw new Error('Index out of range');
    //         this.data[location] = value;
    //     } else if (!Array.isArray(location)) {
    //         throw new Error('Location is neither a data index nor a coordinate.');
    //     } else {
    //         this.data[this.coordsToIndex(location)] = value;
    //     }
    // }
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
