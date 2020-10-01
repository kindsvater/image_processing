const { stridesFrom } = require('../../utility/array_util.js');
const PaddingTypes = require('./paddingtypes.js');
const { Tensor } = require('../tensor.js');
const { Padding } = require('./padding.js');

function getPadding(tensor, toShape, placement) {
    if (!Array.isArray(placement)) placement = [placement];
    if (placement.length < toShape.length) {
        let lastPlaceVal = placement[placement.length - 1];
        for (let i = placement.length; i < toShape.length; i++) {
            placement[i] = lastPlaceVal;
        }
    }
    let paddingBefore = [];
    let paddingAfter = [];

    for (let dim = 0; dim < toShape.length; dim++) {
        let tensorDimValue = tensor.shape[dim] === undefined ? 0 : tensor.shape[dim];
        switch (placement[dim]) {
            case 0:
                //fall-through
            case "left":
                paddingBefore[dim] = 0;
                paddingAfter[dim] = toShape[dim] - tensorDimValue;
                break;
            case 1:
                //fall-through
            case "center":
                paddingBefore[dim] = Math.ceil((toShape[dim] - tensorDimValue) / 2);
                paddingAfter[dim] = Math.floor((toShape[dim] - tensorDimValue) / 2);
                break;
            case 2 :
                //fall-through
            case "right":
                paddingBefore[dim] = toShape[dim] - tensorDimValue;
                paddingAfter[dim] = 0;
                break;
            default:
                paddingBefore[dim] = 0;
                paddingBefore[dim] = 0;
                break;
        }
    }
    return new Padding(paddingBefore, paddingAfter);
}

function pad(tensor, padding, inplace=true, padType='constant', constant=0) {
    let padFunction = PaddingTypes[padType];
    if (!padFunction) {
        throw new Error(
            `Provided Padding Type ${padType} is not a valid tensor padding method.
             Try ${Object.keys(PaddingTypes).join(', ')}.`
        );
    }
    let newRank = tensor.rank;
    if (padding.after.length > newRank) newRank = padding.after.length;
    if (padding.before.length > newRank) newRank = padding.before.length;
    let newShape = [];
    let newData = [];
    let newStrides;

    for (let dim = 0; dim < newRank; dim++) {
        let before = padding.before[dim] ? padding.before[dim] : 0,
            after = padding.after[dim] ? padding.after[dim] : 0,
            curr = tensor.shape[dim] ? tensor.shape[dim] : 1;
        newShape[dim] = curr + before + after;
    }
    newStrides = stridesFrom(newShape);
    padFunction(tensor, [], 0, newData, newShape, newStrides, padding, constant);
    
    if (inplace) {
        //TODO: implement in a method of the Tensor class.
        tensor.data = newData;
        tensor.size = newData.length;
        tensor.shape = newShape;
        tensor.strides = newStrides;
        tensor.rank = newRank;
        return tensor;
    }
    return new Tensor(newShape, newData);
}

function padTo(tensor, toShape, placement, inplace, padType, constant) {
    let padding = getPadding(tensor, toShape, placement);
    pad(tensor, padding, inplace, padType, constant);
}

function depad(tensor, padding) {
    let newShape = [];
    let index = [];
    for (let i = 0; i < tensor.rank; i++) {
        let before = padding.before[i] ? padding.before[i] : 0;
        let after = padding.after[i] ? padding.after[i] : 0;
        
        newShape[i] = tensor.shape[i] - before - after;
        index[i] = [before, [], before + newShape[i] - 1];
    }

    let depaddedData = tensor.get(index);
    let depaddedTensor = new Tensor(newShape, depaddedData);

    return depaddedTensor;
}

module.exports = {
    Padding,
    getPadding, 
    pad,
    padTo,
    depad
}