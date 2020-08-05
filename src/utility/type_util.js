
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

function inNormalUI(value, normal=100) {
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

module.exports = {
    isString,
    isHex,
    inUnitInterval,
    inNormalUnitInterval,
    is8BitInt,
    isPowerOfTwo
}