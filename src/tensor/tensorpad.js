const PaddingTypes = require('./paddingtypes.js');

function pad(tensor, padBefore, padAfter, inplace=true, padType='constant', constant=0) {
    let padFunction = PaddingTypes[padType];
    if (!padFunction) {
        throw new Error(
            `Provided Padding Type ${padType} is not a valid tensor padding method. Try ${PaddingTypes.keys()}`
        );
    }
    let newRank = tensor.rank;
    if (padAfter.length > newRank) newRank = padAfter.length;
    if (padBefore.length > newRank) newRank = padBefore.length;
    let newShape = [];
    let newData = [];
    let newStrides;
    let padValues;

    for (let dim = 0; dim < newRank; dim++) {
        let before = padBefore[dim] ? padBefore[dim] : 0,
            after = padAfter[dim] ? padAfter[dim] : 0,
            curr = tensor.shape[dim] ? tensor.shape[dim] : 1;
        newShape[dim] = curr + before + after;
    }
    newStrides = stridesFrom(newShape);
    padFunction(tensor, [], 0, newData, newShape, newStrides, padAfter, padBefore, constant);
    
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

function depad(tensor, padBefore, padAfter) {
    let newShape = [];
    let index = [];
    for (let i = 0; i < tensor.rank; i++) {
        let before = padBefore[i] ? padBefore[i] : 0;
        let after = padAfter[i] ? padAfter[i] : 0;
        
        newShape[i] = tensor.shape[i] - before - after;
        index[i] = [before, [], before + newShape[i]];
    }

    let depaddedData = tensor.get(index);
    let depaddedTensor = new Tensor(newShape, depaddedData);

    return depaddedTensor;
}

module.exports = {
    pad,
    depad
}