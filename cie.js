const { inNormalUI } =  require('./valuetype.js');

//Device Invariant Representation of Color. The tristimulus values X, Y, and Z technically
// range from 0.0000 to infinity, but never exceed 1.2000 in practice. 
//One stimulus represents the intensity of the color
//Y : the relative luminance of the color (how bright it seems compared to the environment);
//The remaining two stimuluses represent the chromaticity or quality of the color 
//X : Mix of LMS cone response curves. Chosen to be non-negative
//Z : Approximation of the short cone response in the human eye.
function XYZ(X, Y, Z) { 
    if (X < 0 || X > 1.1) {
        throw new Error("X stimulus value out of range.");
    }
    if (Y < 0 || X > 1.1) {
        throw new Error("Y stimulus value out of range.");
    }
    if (Z < 0 || Z > 1.2) {
        throw new Error("Z stimulus value out of range.");
    }
    return [X, Y, Z];
}
const xStim = xyz => xyz[0];
const yStim = xyz => xyz[1];
const zStim = xyz => xyz[2];

//The CIE LAB color space is a device invariant representation of color that is designed to be
// perceptually uniform - there is a linear relationship between the apparent difference and the
// numerical differance of two colors. 
//L : 0 <= L <= 100. Pereceived lightness of the color (0=Black 100=Lightest White**)
    //** Lightest White is relative to an illuminant.
//a and b represent the chromaticity of the color.
//a : -100 <= a <= 100. Position between red and green (-100 = red, 100 = green)
//b : -100 <= b <= 100. Position between yellow and blue (-100 = yellow, 100 = blue)
function LAB(L, A, B) {
    if ( Number.isNaN(L) || Number.isNaN(A) || Number.isNaN(B) ) {
        throw new TypeError("LAB value is NaN. Values provided must be numbers.");
    }
    if ( !inNormalUI(L) 
        || !(inNormalUI(A) || inNormalUI(A * -1))
        || !(inNormalUI(B) || inNormalUI(B * -1))
    ) {
        throw new Error(
            "LAB value out of range. Values must be within the normalized Unit Interval"
        );
    }
    return [L, A, B];
}
const LVal = lab => lab[0];
const AVal = lab => lab[1];
const BVal = lab => lab[2];

//Stores the coordinates of standard illuminants in XYZ Colorspace.
const illuminant = {
    'a' : XYZ(1.0985, 1.0000, 0.3558), //Tungsten Filament Lighting.
    'c' : XYZ(0.9807, 1.0000, 1.1822), //Average Daylight.
    'e' : XYZ(1.000, 1.000, 1.000), //Equal energy radiator
    'D50' : XYZ(0.9642, 1.0000, 0.8249), // Horizon light at sunrise or sunset. ICC Standard Illuminant
    'D55' : XYZ(0.9568, 1.0000, 0.9214), //Mid-morning or mid-afternoon daylight.
    'D65' : XYZ(0.9505, 1.0000, 1.0890), //Daylight at Noon. 
}

//Given RGB tristimulus values in the unit interval, returns luminance  
//or brightness of the color relative to reference white D65. Luminence is a 
//float in the unit interval.
function relativeLuminence(r, g, b) {
    let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; //Second row of rgbToXYZ conversion matrix
    return Y;
}

//Normalizes relative luminence value in unit interval to float between 0.0 and 100.0.
function normalRLuminence(Y) {
    return Y * 100;
}

//Transforms single XYZ stimulus to its perceptually uniform value. This value is relative to corresponding
//stimulus of the referent white. 
function uniformPerception(XYZStim, whiteStim) {
    let r = XYZStim / whiteStim;
    if ( r > (216 / 24389) ) {
        return Math.pow(r, (1 / 3));
    }
    return (841 / 108) * r + (4 / 29);
}
//Converts normalized relative luminence to the perceived lightness or tone of that 
//luminence. Lightness values returned are floats in range 0.0 to 100.00 
function lightness(Y) {
    let Yn = 1.0000 //Y stimulus of the whitepoint. 

    let yr = uniformPerception(Y, Yn);
    return yr * 116 - 16;
}

function XYZtoLAB(xyz, refWhite) {
    let Xf = uniformPerception(xStim(xyz), xStim(refWhite));
    let Yf = uniformPerception(yStim(xyz), yStim(refWhite));
    let Zf = uniformPerception(zStim(xyz), zStim(refWhite));

    let L = 116 * Yf - 16;
    let a = 500 * (Xf - Yf);
    let b = 200 * (Yf - Zf)
    return LAB(L, a, b);
}

module.exports = {
    'relativeLuminence' : relativeLuminence,
    'normalRLuminence': normalRLuminence,
    'lightness' : lightness
}
