'use strict'
//Checks if valid shape data-structure and returns boolean in accordance with validity. 
//Valid shapes are arrays of positive integers. 
function isShape(shape) {
    if (!Array.isArray(shape)) return false;
    if (shape.length > 1) {
        for (let dimSize of shape) {
            if (!Number.isInteger(dimSize) || dimSize < 0) return false;
        }
    }
    return true;
}

//Calculates and returns the integer size of the data the shape describes. 
function sizeFrom(shape) {
    if (!Array.isArray(shape)) return shape;
    return shape.reduce((acc, curr) => acc * curr);
}

//Calculates and returns the integer rank of the data-structure: how many dimensions it has.
function rankFrom(shape) {
    if (!Array.isArray(shape)) return 1;
    return shape.length;
}

//Calculates and returns an array of positive integer values where each value is the 
//number of data points in each dimension of the data-structure the shape describes. 
function stridesFrom(shape) {
    let strides = [];

    if (!Array.isArray(shape)) {
        strides.push(shape);
    } else {
        let rank = rankFrom(shape);
        if (rank !== 0) {
            strides[rank - 1] = 1;
            for (let i = rank - 2; i >= 0; i--) {
                strides[i] = strides[i + 1] * shape[i + 1];
            }
        }
    }
    return strides;
}

module.exports = {
    isShape,
    sizeFrom,
    stridesFrom,
    rankFrom
}