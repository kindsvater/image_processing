const { inNormalUI, clampTo } =  require('./util.js');

//Device Invariant Representation of Color. The tristimulus values X, Y, and Z technically
// range from 0.0000 to infinity, but never exceed 1.2000 in practice. 
//One stimulus represents the intensity of the color
//Y : the relative luminance of the color (how bright it seems compared to the environment);
//The remaining two stimuluses represent the chromaticity or quality of the color 
//X : Mix of LMS cone response curves. Chosen to be non-negative
//Z : Approximation of the short cone response in the human eye.
//Stores the coordinates of standard illuminants in XYZ Colorspace.
const illuminant = {
    'a' : [1.0985, 1.0000, 0.3558], //Tungsten Filament Lighting.
    'c' : [0.9807, 1.0000, 1.1822], //Average Daylight.
    'e' : [1.000, 1.000, 1.000], //Equal energy radiator
    'D50' : [0.9642, 1.0000, 0.8249], // Horizon light at sunrise or sunset. ICC Standard Illuminant
    'D55' : [0.9568, 1.0000, 0.9214], //Mid-morning or mid-afternoon daylight.
    'D65' : [0.9505, 1.0000, 1.0890], //Daylight at Noon. 
    'none' : [2.0, 2.0, 2.0]
}

const XYZ = {
    color: (X, Y, Z, refWhite=illuminant.D65, clamp=false) => {
        if (clamp) {
            let cX = clampTo(X, 0, refWhite[0]),
                cY = clampTo(Y, 0, refWhite[1]),
                cZ = clampTo(Z, 0, refWhite[2]);
            return [cX, cY, cZ];
        } else {
            if (X < 0 || X > refWhite[0]) {
                throw new Error("X stimulus " + X + "out of range.");
            }
            if (Y < 0 || X > refWhite[1]) {
                throw new Error("Y stimulus " + Y + "out of range.");
            }
            if (Z < 0 || Z > refWhite[2]) {
                throw new Error("Z stimulus value " + Z + "out of range. ");
            }
            return [X, Y, Z];
        }
    },
    xStim : xyz => xyz[0],
    yStim : xyz => xyz[1],
    zStim : xyz => xyz[2],
}

//The CIE LAB color space is a device invariant representation of color that is designed to be
// perceptually uniform - there is a linear relationship between the apparent difference and the
// numerical differance of two colors. 
//L : 0 <= L <= 100. Pereceived lightness of the color (0=Black 100=Lightest White**)
    //** Lightest White is relative to an illuminant.
//a and b represent the chromaticity of the color.
//a : -128 <= a <= 128. Position between red and green (-128 = red, 128 = green)
//b : -128 <= b <= 128. Position between yellow and blue (-128 = yellow, 128 = blue)
const LAB = {
    color : (L, A, B) => {
        if ( Number.isNaN(L) || Number.isNaN(A) || Number.isNaN(B) ) {
            throw new TypeError("LAB value is NaN. Values provided must be numbers.");
        }
        if (!inNormalUI(L)) throw new Error( "Lightness value " + L + " must be in range 0 to 100");
        if (!(A >= -128 && A <= 128)) throw new Error("A value " + A + " must be in range -128 to 128 " + L + " " + B);
        if (!(B >= -128 && B <= 128)) throw new Error("A value " + B + " must be in range -128 to 128");

        return [L, A, B];
    }, 
    LVal : lab => lab[0],
    AVal : lab => lab[1],
    BVal : lab => lab[2],
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
    let r = XYZStim / whiteStim,
        e = 216 / 24389

    if ( r > e ) {
        return Math.pow(r, (1 / 3));
    }
    return ((841 / 108) * r) + (4 / 29);
}

function LABtoXYZ(lab, refWhite=illuminant.D65, clamp=false) {
    let Yf = (LAB.LVal(lab) + 16) / 116,
        Xf = (LAB.AVal(lab) / 500) + Yf,
        Zf = Yf - (LAB.BVal(lab) / 200),
        k = 24389 / 27,
        e = 216 / 24389,
        temp;
    
    let Yr = LAB.LVal(lab) > k * e ? Math.pow(Yf, 3) : LAB.LVal(lab) / k;
    temp = Math.pow(Xf, 3);
    let Xr = temp > e ? temp : (((116 * Xf) - 16) / k);
    temp = Math.pow(Zf, 3);
    let Zr = temp > e ? temp : (((116 * Zf) - 16) / k);

    return XYZ.color(Xr * XYZ.xStim(refWhite), Yr * XYZ.yStim(refWhite), Zr * XYZ.zStim(refWhite), refWhite, clamp);
}

//Converts normalized relative luminence to the perceived lightness or tone of that 
//luminence. Lightness values returned are floats in range 0.0 to 100.00 
function lightness(Y) {
    let Yn = 1.0000 //Y stimulus of the whitepoint. 

    let yr = uniformPerception(Y, Yn);
    return yr * 116 - 16;
}

function XYZtoLAB(xyz, refWhite=illuminant.D65) {
    let Xf = uniformPerception(XYZ.xStim(xyz), XYZ.xStim(refWhite));
    let Yf = uniformPerception(XYZ.yStim(xyz), XYZ.yStim(refWhite));
    let Zf = uniformPerception(XYZ.zStim(xyz), XYZ.zStim(refWhite));

    let L = 116 * Yf - 16;
    let a = 500 * (Xf - Yf);
    let b = 200 * (Yf - Zf)

    return LAB.color(L, a, b);
}

function adjustLight(lab, newLight) {
    let adjust =  newLight - LAB.LVal(lab);
    let a = (LAB.AVal(lab) - (500 * adjust / 116));
    let b = (LAB.BVal(lab) + (200 * adjust / 116));
 
    return LAB.color(newLight, a, b);;
}

module.exports = {
    relativeLuminence,
    normalRLuminence,
    lightness,
    XYZtoLAB,
    LABtoXYZ,
    adjustLight,
    illuminant,
    LAB,
    XYZ,
}
