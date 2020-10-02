const { invert, dot } = require('../utility/linearalg_util.js');
/**
 * Retrieves the level of Red from a RGB color.
 * @param {RGB} rgbColor 
 * @returns {Number} The value of the Red Color Channel.
 */
const redLevel = (rgbColor) => rgbColor[0];
/**
 * Retrieves the level of Green from a RGB color.
 * @param {RGB} rgbColor 
 * @returns {Number} The value of the Green Color Channel.
 */
const greenLevel = (rgbColor) => rgbColor[1];
/**
 * Retrieves the level of Blue from a RGB color.
 * @param {RGB} rgbColor 
 * @returns {Number} The value of the Blue Color Channel.
 */
const blueLevel = (rgbColor) => rgbColor[2];
/**
 * Creates an RGBA Color from three tristimulus values. Values should either all be 8Bit Integers or all be in the Unit Interval.
 * @param {Number} r Red Level. An 8Bit Integer or Number in the Unit Interval.
 * @param {Number} g Green Level. An 8Bit Integer or Number in the Unit Interval.
 * @param {Number} b Blue Level. An 8Bit Integer or Number in the Unit Interval.
 * @param {Number} [a=255] Alpha Level. Optional. If no argument will default to 255.
 * @returns {RGBA} A RGBA color.
 */
const RGBAColor = (r, g, b, a) => [r, g, b, a ? a : 255];
/**
 * Creates an RGB Color from three tristimulus values. Values should either all be 8Bit Integers or all be in the Unit Interval.
 * @param {Number} r Red Level. An 8Bit Integer or Number in the Unit Interval.
 * @param {Number} g Green Level. An 8Bit Integer or Number in the Unit Interval.
 * @param {Number} b Blue Level. An 8Bit Integer or Number in the Unit Interval.
 * @returns {RGB} A RGB Color.
 */
const RGBColor = (r, g, b) => [r, g, b];

RGBA = {
    color : RGBAColor,
    redLevel,
    greenLevel,
    blueLevel,
    alphaLevel : (rgbaColor) => rgbaColor[3]
} 

RGB = {
    color : RGBColor,
    redLevel,
    greenLevel,
    blueLevel
} 
/**
 * Calculates the numerical average of an RGB colors three chromaticity channels.
 * @param {RGB} rgbColor An rgb color
 * @returns {Number} The numerical average of the three chromaticity channels. 
 */
let averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
/**
 * Given the coordinates for the three primary colors in an RGB colorspace and an XYZ reference white, creates and returns a conversion matrix between the two colorspaces. 
 * @param {Array.<Array.<Number>>} primaryCoords A 3x3 nested matrix where each column contains the R, G, B coordinates of the RGB primaries in the Unit Interval. Column order: Red, Green, Blue.
 * @param {Array.<Number>}         XYZWhite      The three coordinates of the XYZ reference white. 
 * @returns {Array.<Array.<Number>>} A 3x3 conversion matrix. When multiplied by and RGB color, the result is the corresponding color in the XYZ colorspace defined on the reference white. 
 */
const XYZconversionMatrix = (primaryCoords, XYZWhite) => {
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
/**
 * Given a color in an rgb colorspace to be used as reference white, converts the color to XYZ colorspace.
 * @param {Array.<Number>} whiteCoords The three rgb coordinates of a reference white in the unit interval.
 * @returns {Array.<Number>} The XYZ coordinates of the reference white.
 */
function rgbWhiteToXYZ(whiteCoords) {
    whiteY = greenLevel(whiteCoords);
    return whiteCoords.map( cc => cc / whiteY);
}
/**
 * A higher-order function that takes an XYZ to RGB Conversion matrix and ouputs a function that calculates Relative Lightness (Y) from an RGB color in the former RGB colorspace. 
 * @param {Array.<Array<Number>>} XYZconversionMatrix A 3x3 Conversion Matrix between XYZ and an RGB colorspace, represented by nested arrays.  
 * @returns {Function} A Function that given an RGB colorspace the conversion matrix converts to, outputs the Relative Luminance (Y in the XYZ colorspace)
 */
let createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);

/**
 * Generates a gradient of RGBA colors between the start and end color. 
 * @param {RGB|RGBA} start The initial color in the gradient.
 * @param {RGB|RGBA} end   The final color in the gradient.
 * @param {Integer}  step  How many colors the gradient will have.
 * @returns {Array.<RGBA>} Array of length 'step' with RGBA values in gradient order: Index 0 has value 'start', index 'step' - 1 has value 'end'. 
 */
let gradient = (start, end, step) => {
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