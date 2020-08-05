const { invert, dot } = require('./linear.js');
const redLevel = (rgbColor) => rgbColor[0];
const greenLevel = (rgbColor) => rgbColor[1];
const blueLevel = (rgbColor) => rgbColor[2];
const rgb = module.exports


const RGB = (function() {
    
})
RGBA = {
    "color" : (r, g, b, a) => [r, g, b, a ? a : 255],
    redLevel,
    greenLevel,
    blueLevel,
    "alphaLevel" : (rgbaColor) => rgbaColor[3]
} 
RGB = {
    color : (r, g, b) => [r, g, b],
    redLevel,
    greenLevel,
    blueLevel
} 
function averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
XYZconversionMatrix = (primaryCoords, XYZWhite) => {
    let primXYZ = [
        [primaryCoords[0][0],primaryCoords[1][0], primaryCoords[2][0]],
        [primaryCoords[0][1],primaryCoords[1][1], primaryCoords[2][1]],
        [primaryCoords[0][2],primaryCoords[1][2], primaryCoords[2][2]],
    ]

    let iPXYZ = invert(primXYZ);
    let XYZScalars = multiply(iPXYZ, XYZWhite);
    scaleMatrix = [[XYZScalars[0], 0, 0], [0, XYZScalars[1], 0], [0, 0, XYZScalars[2]]];
    return multiply(primXYZ, scaleMatrix);
}

function rgbWhiteToXYZ(whiteCoords) {
    whiteY = greenLevel(whiteCoords);
    return whiteCoords.map( cc => cc / whiteY);
}

createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);

gradient = (start, end, step) => {
    let grad = [];

    for (let i = 0; i < step; i++) {
        let intenseEnd = i;
        let intenseStrt = step - i;

        let color = RGBA.color(
            Math.round((intenseStrt * RGBA.redLevel(start) + intenseEnd * RGBA.redLevel(end)) / step),
            Math.round((intenseStrt * RGBA.greenLevel(start) + intenseEnd * RGBA.greenLevel(end)) / step),
            Math.round((intenseStrt * RGBA.blueLevel(start) + intenseEnd * RGBA.blueLevel(end)) / step)
        );

        grad[i] = color;
    }
    return grad;
}

module.exports = {
    RGBA,
    RGB,
    averageChannelLevel,
    XYZconversionMatrix,
    createRGBRelativeLuminance,
    gradient
}