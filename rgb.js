
const { dim, invert } = require('./lin.js');

let rgb = module.exports
rgb.rgba = (r, g, b, a) => [r, g, b, a ? a : 255];
rgb.rgb = (r, g, b) => [r, g, b];
rgb.redLevel = (rgbColor) => rgbColor[0];
rgb.greenLevel = (rgbColor) => rgbColor[1];
rgb.blueLevel = (rgbColor) => rgbColor[2];
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
    whiteY = whiteCoords[1];
    return whiteCoords.map( cc => cc / whiteCoords[1]);
}
