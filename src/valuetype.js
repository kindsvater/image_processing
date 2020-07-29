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
    let m = Math.pow(10, decimalPlaces);
    let n = +(decimalPlaces ? num * m : num).toFixed(8); //Avoid Rounding Errors
    let i = Math.floor(n), f = n - i;
    let e = 1e-8; //Allow for rounding errors in f
    let r = (f > 0.5 - e && f < 0.5 + e) ? 
        ((i % 2 === 0) ? i : i + 1) : Math.round(n);
    return decimalPlaces ? r / m : r;
}

function initialize(value, n, m=0) {
    let z = [];
    for (let i = 0; i < n; i++) {
        if (m > 0) { 
            z[i] = [];
        } else {
            z[i] = 0;
            for (let j = 0; j < m; j++) {
                z[i][j] = 0;
            }
        } 
    }
    return z;
}

function zeros(n, m=0) {
    return initialize(0, n, m);
}

function round(n, digits=0) {
    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    return Math.round(n) / multiplicator;
}
module.exports = {
    is8BitInt,
    inUnitInterval,
    inNormalUI,
    clampTo,
    bankRound,
    zeros,
    initialize,
    round
}