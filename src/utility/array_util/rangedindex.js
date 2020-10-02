'use strict';
const { stridesFrom } = require('./shape.js');


/**
 * Checks if symbol is the Ranged Index End Operator: Infinity.
 * @param {*} symbol 
 * @returns {boolean} 
 */
const isEndOperator = symbol => (!isNaN(symbol) && !isFinite(symbol));
/**
 * Checks if symbol is the Ranged Index Range Operator: an Empty Array, [].
 * @param {*} symbol 
 * @returns {boolean} 
 */
const isRangeOperator = symbol => (Array.isArray(symbol) && symbol.length === 0);
/**
 * Checks if symbol is valid index. Indices are integers i greater than zero where min <= i < max.
 * @param {*}       symbol 
 * @param {Integer} min Lowest integer value the index can take.
 * @param {Integer} max Upper-limit of the index range. Non-inclusive. 
 * @returns {boolean} //True if a valid index, false if not.
 */
const isIndex = (symbol, max, min=0) => (Number.isInteger(symbol) && symbol >= min && symbol < max);
/**
 * Trims redundant or unnecessary values from the end of the ranged index tensorIndex. If toRan
 * @param {Array.<Integer>} tensorIndex   The index to trim.
 * @param {Integer}         [toRank=null] If specified will remove indices in dimensions outside of rank.  
 * @returns {Array.<Integer>} Trimmed Ranged Index
 */
const trimRangedIndex = (tensorIndex, toRank=null) => {
    let newEnd = (Number.isInteger(toRank) && tensorIndex.length > toRank) ?
                toRank - 1 :
                tensorIndex.length - 1;
    for (let i = newEnd; i >= 0; i--) {
        if (!(isRangeOperator(tensorIndex[newEnd]) || isEndOperator(tensorIndex[newEnd]))) {
            return tensorIndex.slice(0, newEnd + 1);
        }
    }
    return tensorIndex.slice(0,1);
}
/**
 * Evaluates Array and returns whether it is a well-formed ranged index. 
 * Ranged Indexes contain the Range Operator, placed between valid index values and/or the End Operator
 * and are used as shorthand for a list of indices. E.g. [3, [], 45] => [3, 4,...,45], [Infinity, [], 5] => [0,1,2,3,4,5], 
 * The Range Operator is the Empty Array Object, [].
 * The End Operator is the value infinity, Infinity.
 * Indices are Integers greater than zero and less than size of the dimension they are indexing.
 * The shape array represents the size of the index of each dimension. 
 * @param {Array.<Array.<Integer>, Integer>} rangedIndex 
 * @param {Array.<Integer>}                  shape 
 * @return {boolean|null} True if a well-formed ranged index. False if an explicit index. Null if not a well-formed index.
 */
const isRangedIndex = function(rangedIndex, shape) {
    let isRanged = false;
    for (let dim in rangedIndex) {
        let index = rangedIndex[dim];
        let length = shape[dim];

        if (isRangeOperator(index) || isEndOperator(index)) {
            isRanged = true;
        } else if (Array.isArray(index)) {
            let ii = 0;
            while(ii < index.length) {
                if (isRangeOperator(index[ii])) {
                    console.log('Range Operator is not between valid indices or the End Operator');
                    return null;
                }
                if (isEndOperator(index[ii])) {
                    if (isRangeOperator(index[ii + 1])) {
                        if (!(isEndOperator(index[ii + 2]) || isIndex([ii + 2], length))) {
                            console.log('Range Operator is not between valid indices or the End Operator');
                            return null;
                        }
                        ii += 3;
                    } else {
                        console.log('End Operator is not followed or preceded by the Range Operator');
                        return null;
                    }
                } else if (isIndex(index[ii], length)) {
                    if (isRangeOperator(index[ii + 1])) {
                        if (!(isEndOperator(index[ii + 2]) || isIndex(index[ii + 2], length, index[ii]))) {
                            console.log(`Value following Range Operator ${index[ii + 2]} is not a valid index or End Operator`);
                            return null;
                        }
                        ii += 3;
                    } else {
                        ii += 1;
                    }
                } else {
                    console.log(`Range Index Value ${index[ii]} is neither the End or Range Operators, nor a valid index`);
                    return null;
                }
            }
            isRanged = true;
        } else if (!isIndex(index, shape[dim])) {
            return null;
        }
    }
    return isRanged;
}

/**
 * Reduces ranged index to set of tuples containing the start and indices of each range. 
 * Ex: [[0,[],6,2], [3,[],Infinity], [5,6]] => [[[0,7],[2,3]], [[3,46]], [[5,6][6,7]]]
 * @param {Array.<Array.<Integer>>} rangedIndex 
 * @param {Array.<Integer>} shape 
 * @return {Array.<Array.<Integer>>} True if a well-formed ranged index. False if a regular index or not well-formed. 
 */
const reduceRangedIndex = function(rangedIndex, shape) {
    let reduced = [];
    for (let dim in rangedIndex) {
        let index = rangedIndex[dim];
        let length = shape[dim];
        if (isRangeOperator(index) || isEndOperator(index)) {
            reduced[dim] = [[0, length]];
        } else if (isIndex(index, length)) {
            reduced[dim] = [[index, index + 1]];
        } else if (Array.isArray(index)) {
            let rdim = [];
            let ii = 0;
            while(ii < index.length) {
                let pre;
                let post;
                if (isRangeOperator(index[ii])) {
                    throw new Error(`Range Operator is not between valid indices or the End Operator`);
                }
                if (isEndOperator(index[ii])) {
                    pre = 0;
                    if (isRangeOperator(index[ii + 1])) {
                        if (isEndOperator(index[ii + 2])) {
                            post = length;
                        } else if (isIndex(index[ii + 2], length)) {
                            post = index[ii + 2] + 1;
                        } else {
                            throw new Error(`Range Operator is not between valid indices or the End Operator`);
                        }
                        ii += 3;
                    } else {
                        throw new Error(`End Operator is not followed or preceded by the Range Operator`);
                    }
                } else if (isIndex(index[ii], length)) {
                    pre = index[ii];
                    if (isRangeOperator(index[ii + 1])) {
                        if (isEndOperator(index[ii + 2])) {
                            post = length;
                        } else if (isIndex(index[ii + 2], length, index[ii])) {
                            post = index[ii + 2] + 1;
                        } else {
                            throw new Error(`Value following Range Operator ${index[ii + 2]} is not a valid index or End Operator`);
                        }
                        ii += 3;
                    } else {
                        ii += 1;
                    }
                }
                if (post) {
                    rdim.push([pre, post]);
                } else {
                    rdim.push([pre, pre + 1]);
                }
            }
            reduced[dim] = rdim;
        } else {
            throw new Error(`Ranged Index ${index} is neither a Range or End Operator, nor a valid index`);
        }
    }
    return reduced;
}
/**
 * Calculates and returns the shape of the reduced index
 * @param {Array.<Array.<Integer>>} reducedIndex 
 * @returns {Array.<Integer>} the shape of the index (how many data points are described in each dimension)
 */
const reducedShape = (reducedIndex) => reducedIndex.map(
    dim => dim.reduce(
        (acc, range) => acc + range[1] - range[0], 0
    )
);

const shapeToRangedIndex = (shape, transposeShape=null) => transposeShape ? 
    shape.map( (dimSize, i) => [0 + transposeShape[i], [], dimSize + 1 + transposeShape[i]]) :
    shape.map( dimSize => [0 , [], dimSize + 1]);

module.exports = {
    isRangeOperator,
    isEndOperator,
    isIndex,
    isRangedIndex,
    shapeToRangedIndex,
    reduceRangedIndex,
    trimRangedIndex,
    reducedShape,
}