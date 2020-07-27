function is8BitInt(value) {
    return (!isNaN(channelValue)
        && Number.isInteger(+channelValue)
        && channelValue < 256
        && channelValue >= 0);
}

function inUnitInterval(value) {
    return (!isNaN(value)
    && value >= 0.0 
    && value <= 1.0)
}

function inNormalUI(value) {
    return value >= 0 && value <= 100;
}

function clampTo(value, min, max, alias=false) {
    if (value < min) return alias ? min + ((min - value) % (max - min)) : min;
    if (value > max) return alias ? max - (value % (max - min)) : max;
    return value;
}

//From User Tim Down.
//https://stackoverflow.com/questions/3108986/gaussian-bankers-rounding-in-javascript
function bankRound(num, decimalPlaces=0) {
    let m = Math.pow(10, d);
    let n = +(decimalPlaces ? num * m : num).toFixed(8); //Avoid Rounding Errors
    let i = Math.floor(n), f = n - i;
    let e = 1e-8; //Allow for rounding errors in f
    let r = (f > 0.5 - e && f < 0.5 + e) ? 
        ((i % 2 === 0) ? i : i + 1) : Math.round(n);
    return d ? r / m : r;
}

module.exports = {
    is8BitInt,
    inUnitInterval,
    inNormalUI,
    clampTo,
    bankRound
}