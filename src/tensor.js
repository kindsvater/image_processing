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
