const { isArray } = require('./type.js');
const { sizeFrom } = require('./shape.js');

/** 
 * toNestedArray Helper Function to recursively nest Array Objects.
 * @param {Array}               flatArr original flat array to nest
 * @param {Array.<Integer>} shape The shape of the remaining nested array dimensions.
 * @param {Integer}         start The index of the original flat array to initialize the first value of current sub-array with.
 * @returns {Array.<Array>} The current multi-dimensional sub-array.
 */
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
/** 
 * Reformats data of flat array into a nested array of given shape.
 * @param {Array}           flatArr Original flat array with values in Row-Major Order
 * @param {Array.<Integer>} shape The shape of the nested array. Must describe data size matching the flattArr length.
 * @returns {Array.<Array>} The multi-dimensional array. Each dimension 0, 1,...,z contains shape[z] sub-arrays.
 */
function toNestedArray(flatArray, shape) {
    if (shape.length === 0) return flatArray[0];
    if (!isArray(flatArray)) throw new Error(
        `Expected flatArray to be of type Array.
         Received argument of type ${typeof flatArray} instead.`
    );
    if (!isArray(shape) && Number.isInteger(shape)) {
        shape = [shape];
    }
    let size = sizeFrom(shape);
    if (size !== flatArray.length) throw new Error(
        `Shape size ${size} does not match the flatArray length of ${flatArray.length}.`
    );
    if (shape.length === 1) return flatArray;
    return nestleFlatArray(flatArray, shape, 0);
}
/** 
 * Reformats data of nested array into a flat array. 
 * @param {Array.<Array>}  arr Original flat array to nest.
 * @returns {Array} Flat Array containing data from arr in Row-Major Order.
 */
function flatten(arr) {
    let isFlat = true;
    for (let i in arr) {
        if (isArray(arr[i])) {
            arr[i] = flatten(arr[i]);
            isFlat = false;
        }
    }
    return isFlat ? arr : [].concat(...arr);
}

module.exports = {
    toNestedArray,
    flatten
}