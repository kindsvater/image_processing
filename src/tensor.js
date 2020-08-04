'use strict';
function isShape(shape) {
    if (!Array.isArray(shape)) return false;
    if (shape.length > 1) {
        for (let i = 0; i <= shape.length; i++) {
            if (!Number.isInteger(shape[i])) return false;
        }
    }
    return true;
}
function sizeFrom(shape) {
    return shape.reduce((acc, curr) => acc * curr);
}
function stridesFrom(shape) {
    let rank = shape.length,
        strides = [];
        strides[rank - 1] = 1;
        for (let i = rank - 2; i >= 0; i--) {
            strides[i] = strides[i + 1] * shape[i + 1];
        }
        return strides;
}
function createNestedArray(flat, shape, start) {
    let nest = [],
        dim = shape[0];
    if (shape.length === 1) {
        for (let i = 0; i < dim; i++) {
            nest[i] = flat[start + i];
        }
    } else {
        
        for (let i = 0; i < dim; i++) {
            let remainDim = shape.slice(1),
                stride = remainDim.reduce((acc, curr) => acc * curr);
            nest.push(createNestedArray(flat, remainDim, start + i * stride));
        }
    }
    return nest;
}

function toNestedArray(flat, shape) {
    if (shape.length === 0) return flat[0];
    let size = sizeFrom(shape);
    if (size !== flat.length) throw new Error("Shape does not match the input length");
    if (size === 0) return [];
    return createNestedArray(flat, shape, 0);
}

const Tensor = (function() {
    function Tensor(shape, data) {
        if(!isShape) {
            throw new TypeError("Shape is not proper type. Shape should be an array of integers");
        }
        this.shape = shape;
        this.size = sizeFrom(shape);
        this.strides = stridesFrom(shape);
        this.data = data;
        this.rank = shape.length;
    }
    const $T = Tensor.prototype;
    $T.toNestedArray = function() {
        return toNestedArray(this.data, this.shape);
    }
    $T.coordsToIndex = function(coords) {
        let index = 0;
        if (this.rank === 0) return index;
        for (let i = 0; i < this.rank; i++) {
            index += this.strides[i] * coords[i];
        }
        if (index >= this.size || index > 0) throw new Error("Index out of range");
        return index;
    }
    $T.indexToCoords = function(index) {
        let coords = [];
        for (let i = 0; i < this.rank - 1; i++) {
            coords[i] = Math.floor(index / this.strides[i]);
            index -= coords[i] * this.strides[i];
        }
        coords[coords.length - 1] = index;
        return coords;
    }
    $T.get = function(location) {
        if (Number.isInteger(location)) {
            if (location >= this.size || location < 0) throw new Error("Index out of range");
            return this.data[location];
        } 
        if (!Array.isArray(location)) {
            throw new Error("Location is neither a data index nor a coordinate");
        }
        return this.data[this.coordsToIndex()];
    }
    $T.set = function(location, value) {
        if (Number.isInteger(location)) {
            if (location >= this.size || location < 0) throw new Error("Index out of range");
            this.data[location] = value;
        } else if (!Array.isArray(location)) {
            throw new Error("Location is neither a data index nor a coordinate.");
        } else {
            this.data[this.coordsToIndex(location)] = value;
        }
    }
    function padHelper(orig, oShape, oIndex, padded, pStrides, pInd, padAfter, padBefore, padVals) {
        for (let b = 0; b < padBefore[0] * pStrides[0]; b++) {
            padded[pInd++] = padVals[0];
        }
        console.log("before index " + oShape[0]);
        console.log(padded);
        //Base Case: If this is the final dimension of original shape, add the original data
        if (oShape.length === 1) {  
            for (let c = 0; c < oShape[0]; c++) {
                console.log(padBefore[1]);
                if (padBefore.length > 1) {
                    for (let b = 0; b < padBefore[1]; b++) {
                        console.log("addingZero");
                        padded[pInd++] = padVals[0];
                    }
                }
                padded[pInd++] = orig[oIndex++];
                if (padAfter.length > 1) {
                    for (let a = 0; a < padAfter[1]; a++) {
                        padded[pInd++] = padVals[0];
                    }
                }
                console.log(padded);
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
        console.log("after Index start " + pInd)
        console.log(padded);
        for (let a = 0; a < padAfter[0] * pStrides[0]; a++) {
            padded[pInd++] = padVals[0];
        }
        return [oIndex, pInd];
    }
    $T.pad = function(padAfter, padBefore, padVals, inplace=true) {
        if (padAfter.length !== padBefore.length) {
            throw new Error("List of padding before each dimension " + padBefore.length +
             " and list of padding after each dimension " + padAfter.length + "do not match");
        }
        let newRank = padAfter.length > this.rank ? padAfter.length : this.rank;
        let newShape = [],
            newData = [];
        for (let dim = 0; dim < newRank; dim++) {
            let before = dim >= padBefore ? 0 : padBefore[dim],
                after = dim >= padAfter ? 0 : padAfter[dim],
                curr = dim >= this.rank ? 1 : this.shape[dim];
            newShape[dim] = curr + before + after;
        }
        console.log("New Shape" + newShape);
        let newStrides = stridesFrom(newShape);
        console.log("New Strides " + newStrides);
        padHelper(this.data, this.shape, 0, newData, newStrides, 0, padAfter, padBefore, padVals);
        
        if (inplace) {
            this.data = newData;
            this.shape = newShape;
            this.strides = newStrides;
            this.rank = newRank;
        }

        return newData;
    }
    $T.incrementIndex = function(index, dimIncs) {
        if (this.rank === 0) return index;
        for (let i = 0; i < dimIncs; i++) {
            index += this.strides[i] * dimIncs[i];
        }
        return index;
    }
    return Tensor;
})();

module.exports = {
    Tensor
}
