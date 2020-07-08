

//Device Invariant Representation of Color
function CIEXYZ(X, Y, Z) { 
    return [X, Y, Z];
}
//CIE Standard Illuminant (Daylight). This is the standard white point of the
//CIEXYZ color space. 
const D65 = CIEXYZ(95.047, 100.00, 108.883);
const Yn = D65[1];

//Given RGB tristimulus values in the unit interval, returns luminance 
//or brightness of the color relative to reference white. Luminence is a 
//float in the unit interval.
function relativeLuminence(r, g, b) {
    let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return Y;
}

//Normalizes luminence value in unit interval to float between 0.0 and 100.0.
function normalRLuminence(Y) {
    return Y * 100;
}

//Converts normalized relative luminence to the perceived lightness or tone of that 
//luminence. Lightness values returned are floats in range 0.0 to 100. 
function lightness(Y) {
    let t = Y / Yn;
    let f; 
    if (t > (216 / 24389)) {
        f = Math.pow(t, (1 / 3));
    } else {
        f = (841 / 108) * t + (4 / 29);
    }
    return f * 116 - 16;
}
 
module.exports = {
    'relativeLuminence' : relativeLuminence,
    'normalRLuminence': normalRLuminence,
    'lightness' : lightness
}
