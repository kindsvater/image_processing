const { isHex } = require('./type_util.js');

function intToHex(int) {
    if (!Number.isInteger(int)) throw new TypeError(`Value ${ int } is not an Integer`);
    return int.toString(16);
}

function hexToInt(hex) {
    if (!isHex(hex)) throw new TypeError(`Value ${ hex } is not a Hexadecimal number`);
    return parseInt(hex, 16);
}

function roundTo(number, digits=0) {
    var multiplicator = Math.pow(10, digits);
    number = parseFloat((number * multiplicator).toFixed(11));
    return Math.round(number) / multiplicator;
}

function clampTo(number, min, max, alias=false) {
    if (number < min) return alias ? min + ((min - number) % (max - min)) : min;
    if (number > max) return alias ? max - (number % (max - min)) : max;
    return number;
}

//From User Tim Down.
//https://stackoverflow.com/questions/3108986/gaussian-bankers-rounding-in-javascript
function bankRound(number, decimalPlaces=0) {
    let multiplicator = Math.pow(10, decimalPlaces);
    let naturalNum = +(number * multiplicator).toFixed(8); //Avoid Rounding Errors
    let integerPart = Math.floor(naturalNum);
    let fractionalPart = naturalNum - integerPart;
    let roundError = 1e-8; //Allow for rounding errors in f
    let r = (fractionalPart > 0.5 - roundError && fractionalPart < 0.5 + roundError) ? 
        ((integerPart % 2 === 0) ? integerPart : integerPart + 1) : Math.round(naturalNum);
    return decimalPlaces ? r / multiplicator : r;
}

function nextPowerOf2(number) {
    let power = 2;
    while (power < number) power *= 2;
    return power;
}

function nextExponentOf2(number) {
    let power = 2;
    let exponent = 1;
    while (power < number) {
        power *= 2;
        exponent++;
    }
    return exponent;
}

module.exports = {
    intToHex,
    hexToInt,
    roundTo,
    clampTo,
    bankRound,
    nextExponentOf2,
    nextPowerOf2
}