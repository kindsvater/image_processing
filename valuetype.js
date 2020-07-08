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

module.exports = {
    'is8BitInt': is8BitInt,
    'inUnitInterval': inUnitInterval
}