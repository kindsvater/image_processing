/** 
 * Checks if passed value is a TypedArray 
 * @param {TypedArray} array Value to check type of.
 * @returns {boolean} True if a TypedArray, False if not.
 */
const isTypedArray = array => ArrayBuffer.isView(array) && !(array instanceof DataView);

/** 
 * Checks if passed value is an Array Object or a Typed Array
 * @param {Array|TypedArray} array Value to check type of.
 * @returns {boolean} True if a TypedArray or Array Object, False if neither.
 */
const isArray = array => Array.isArray(array) || isTypedArray(array);

/** 
 * Retrives the type name of a Typed Array. 
 * @param {TypedArray} array TypedArray instance.
 * @returns {String} Name of the TypedArray Constructor.
 */
const getType = array => isTypedArray(array) && array.constructor.name;

module.exports = {
    isTypedArray,
    isArray,
    getType
}