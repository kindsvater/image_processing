'use strict';
const { sizeFrom, stridesFrom, isShape, toNestedArray } = require('./utility/array_util.js');
const { reduceRangedIndex, reducedShape, trimRangedIndex, isRangedIndex } = require('./utility/rangedindex_util.js');

const Tensor = (function() {
    function Tensor(shape, data) {
        if(!isShape(shape)) {
            throw new TypeError(
                `Provided shape [${shape}] is not well-formed. \n` + 
                `Shape must be an array of positive integers.`
            );
        }
        let size = sizeFrom(shape);
        if (size !== data.length) {
            throw new Error(
                `Provided Shape [${shape}] does not describe data ` +
                `of size ${data.length}.\nShape describes data of size ${size}.`
            );
        }
        this.shape = shape;
        this.size = size;
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
        if (dataIndex >= this.size || dataIndex < 0) throw new Error(
            `Index ${tensorIndex}, is out of range of Tensor with shape [${this.shape}]`
        );
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

    $T.isValidIndex = function(dataIndex) {
        for (let i = 0; i < dataIndex.length; i++) {
            if (dataIndex[i] < 0 || dataIndex[i] >= this.shape[i]) {
                return false;
            }
        }
        return true;
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
        //If setting a single value, wrap in array.
        if (!Array.isArray(values)) values = [values]; 
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
                `Number of values, ${values.length}, ` + 
                `does not meet the number of indices set: ${requiredInputLength}`
            );
        }
        
        this.forEachVal(rangedIndex, (value, i) => {
            this.data[i] = values[valIndex];
            valIndex++;
        });
        return this;
    }

    $T.setAtDI = function(dataIndex, value) {
        this.data[dataIndex] = value;
        return this;
    }

    $T.update = function(shape, data=null) {
        if(!isShape(shape)) {
            throw new TypeError(
                `Provided shape [${shape}] is not well-formed. \n` + 
                `Shape must be an array of positive integers.`
            );
        }
        let newStrides = stridesFrom(shape);
        let newSize = sizeFrom(shape);

        if (data) {
            if (newSize !== data.length) {
                throw new Error(
                    `Provided Shape [${shape}] does not describe new data ` +
                    `of size ${data.length}.` + 
                    `\nShape describes data of size ${newSize}.`
                );
            }
            this.data = data;       
        } else {
            if (newSize !== this.data.length) {
                throw new Error(
                    `Provided Shape [${shape}] does not describe Tensor data. ` +
                    `\nShape describes data of ${newSize}; ` +
                    `Current Tensor data is of size ${this.data.length}.`
                );
            }
        }
        this.size = newSize;
        this.shape = shape;
        this.strides = newStrides;
        this.rank = shape.length;
        return this;
    }

    $T.toNestedArray = function() {
        return toNestedArray(this.data, this.shape);
    }
    
    return Tensor;
})();

module.exports = {
    Tensor
}
