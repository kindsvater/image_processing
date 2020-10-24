const { sizeFrom, rankFrom } = require('./shape.js');

/** Creates and returns a nested array of given shape with each index initialized to the value.
 * @param   {*}       value  Value to initialize each index with.
 * @param   {Array}   shape  Shape of each nested array dimension.
 * @returns {Array}   Initialized Nested Array 
**/
function initNestedArray(value, shape) {
    let arr = [];
    if (rankFrom(shape) === 1) {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = value;
        }
    } else {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = initNestedArray(value, shape.slice(1));
        }
    }
    return arr;
}

/** Creates a flat or nested array described by shape with each index intialized to value.
 * @param   {*}       value       Value to initialize each index with
 * @param   {Array}   shape       Shape of data-structure the array represents.
 * @param   {boolean} [flat=true] Will return a flat array if true, nested if false.
 * @returns {Array}   Initialized Array 
**/
function initArray(value, shape, flat=false) {
    let arr;
    let size = sizeFrom(shape);

    if (flat) {
        arr = [];
        for (let i = 0; i < size; i++) {
            arr[i] = value;
        }
    } else {
        arr = initNestedArray(value, shape);
    }
    return arr;
}

/** Creates a flat or nested array described by shape with eachindex intialized to Zero.
 * @param   {Array}   shape       Shape of data-structure the array represents.
 * @param   {boolean} [flat=true] Will return a flat array if true, nested if false.
 * @returns {Array}   Initialized Array of Zeros
**/
function zeros(shape, flat=false) {
    return initArray(0, shape, flat);
}

/** Creates a flat or nested array described by shape with each index intialized to One.
 * @param   {Array}   shape       Shape of data-structure the array represents.
 * @param   {boolean} [flat=true] Will return a flat array if true, nested if false.
 * @returns {Array}   Initialized Array of Ones.
**/
function ones(shape, flat=false) {
    return initArray(1, shape, flat)
}

/** Creates a flat or nested identity matrix of shape [m, m] with ones along the diagonal 
 * line of indices spanning the abstract indices (0,0) -> (m,m).
 * @param   {Array}   m  The size of the identity matrix.
 * @param   {boolean} [flat=true] Will return a flat array if true, nested if false.
 * @returns {Array}   Initialized m x m identity matrix
**/
function identity(size, flat=false) {
    let arr; 
    arr = zeros([size, size], flat)
    if (flat) {
        for (let i = 0; i < size; i++) {
            arr[i + (i * size) - 1] = 1;
        }
    } else {
        for (let i = 0; i < size; i++) {
            arr[i][i] = 1;
        }
    }
    return arr;
}

function repeat(sequence, repetitions) {
    let repeated = [];
    let rai = 0;

    for (let r = 0; r < repetitions; r++) {
        for (let i = 0; i < sequence.length; i++) {
            repeated[rai++] = sequence[i];
        }
    }
    
    return repeated;
}

module.exports = {
    initArray,
    zeros,
    ones,
    identity,
    repeat
}