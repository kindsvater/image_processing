
const { invert, dot } = require('./lin.js');

const redLevel = (rgbColor) => rgbColor[0];
const greenLevel = (rgbColor) => rgbColor[1];
const blueLevel = (rgbColor) => rgbColor[2];

let rgb = module.exports

rgb.rgba = {
    "color" : (r, g, b, a) => [r, g, b, a ? a : 255],
    redLevel,
    greenLevel,
    blueLevel,
    "alphaLevel" : (rgbaColor) => rgbaColor[3]
} 

rgb.rgb = {
    color : (r, g, b) => [r, g, b],
    redLevel,
    greenLevel,
    blueLevel
} 

rgb.averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
rgb.XYZconversionMatrix = (primaryCoords, XYZWhite) => {
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

rgb.createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);
