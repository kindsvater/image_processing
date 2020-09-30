
function isString(value) {
    return (typeof value === 'string' || value instanceof String);
}

function isHex(hex) {
    if (!isString(hex)) return false;
    return hex.match(/^[0-9a-fA-F]+$/) !== null;
}

function inUnitInterval(value) {
    return (!isNaN(value)
    && value >= 0.0 
    && value <= 1.0)
}

function inNormalUnitInterval(value, normal=100) {
    return value >= 0 && value <= normal;
}

function is8BitInt(value) {
    return (!isNaN(value)
        && Number.isInteger(+value)
        && inNormalUI(value, 255));
}

function isPowerOfTwo(num) {
    return (num & ( num - 1)) == 0;
}

// Polyfill from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
function is(x, y) {
   // SameValue algorithm
   if (x === y) {
       // Steps 1-5, 7-10
       // Steps 6.b-6.e: +0 != -0
       return x !== 0 || 1 / x === 1 / y;
   } else {
       // Step 6.a: NaN == NaN
       return x !== x && y !== y;
   }
}

function shallowEquals(A, B) {
    if (is(A, B)) return true;

    if (typeof A !== 'object' || A === null ||
        typeof B !== 'object' || typeof B === null
    ) {
        return false;
    }

    let AKeys = Object.keys(A);
    let BKeys = Object.keys(B);

    if (AKeys.length !== BKeys.length) return false;

    for (let i = 0; i < AKeys.length; i++) {
        if (B.hasOwnProperty(AKeys[i]) || !is(A[AKeys[i]], B[AKeys[i]])) {
            return false;
        }
    }
    return true;
}

module.exports = {
    isString,
    isHex,
    inUnitInterval,
    inNormalUnitInterval,
    is8BitInt,
    isPowerOfTwo,
    shallowEquals
}