

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

function nestleFlatArray(flatArr, shape, start) {
    let nest = [],
        dim = shape[0];
    if (shape.length === 1) {
        for (let i = 0; i < dim; i++) {
            nest[i] = flatArr[start + i];
        }
    } else {   
        for (let i = 0; i < dim; i++) {
            let remainDim = shape.slice(1),
                stride = remainDim.reduce((acc, curr) => acc * curr);
            nest.push(nestleFlatArray(flatArr, remainDim, start + i * stride));
        }
    }
    return nest;
}

function toNestedArray(flatArr, shape) {
    if (shape.length === 0) return flatArr[0];
    let size = sizeFrom(shape);
    if (size !== flatArr.length) throw new Error(`Shape does not match the input length`);
    if (size === 0) return [];
    return nestleFlatArray(flatArr, shape, 0);
}

function initNestedArray(value, shape) {
    let arr = [];
    if (shape.length === 1) {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = value;
        }
    } else {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = intNestedArray(value, shape.slice(1));
        }
    }
    return arr;
}

function initArray(value, shape, flat=false) {
    let arr;
    let size = sizeFrom(shape);

    if (flat) {
        arr = [];
        for (let i = 0; i < size; i++) {
            arr[i] = value;
        }
    } else {
        arr = createNestedArray(value, shape);
    }
    return arr;
}

function zeros(shape, flat=false) {
    return initArray(0, shape, flat);
}

function ones(shape, flat=false) {
    return initArray(1, shape, flat)
}

module.exports = {
    toNestedArray,
    initArray,
    stridesFrom,
    sizeFrom,
    isShape,
    zeros,
    ones,
}