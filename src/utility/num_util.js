const { isHex } = require('./type_util.js');

function intToHex(int) {
    if (!Number.isInteger(int)) throw new TypeError(`Value ${ int } is not an Integer`);
    return int.toString(16);
}

function hexToInt(hex) {
    if (!isHex(hex)) throw new TypeError(`Value ${ hex } is not a hexadecimal number`);
    return parseInt(hex, 16);
}

function roundTo(n, digits=0) {
    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    return Math.round(n) / multiplicator;
}

function clampTo(value, min, max, alias=false) {
    if (value < min) return alias ? min + ((min - value) % (max - min)) : min;
    if (value > max) return alias ? max - (value % (max - min)) : max;
    return value;
}

//From User Tim Down.
//https://stackoverflow.com/questions/3108986/gaussian-bankers-rounding-in-javascript
function bankRound(num, decimalPlaces=0) {
    let m = Math.pow(10, decimalPlaces);
    let n = +(decimalPlaces ? num * m : num).toFixed(8); //Avoid Rounding Errors
    let i = Math.floor(n), f = n - i;
    let e = 1e-8; //Allow for rounding errors in f
    let r = (f > 0.5 - e && f < 0.5 + e) ? 
        ((i % 2 === 0) ? i : i + 1) : Math.round(n);
    return decimalPlaces ? r / m : r;
}

module.exports = {
    intToHex,
    hexToInt,
    roundTo,
    clampTo
}