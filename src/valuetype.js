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

module.exports = {
    is8BitInt,
    inUnitInterval,
    inNormalUI,
    clampTo
}