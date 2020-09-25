const { RGBA } = require("../src/colorspace/rgb.js");
const { decodeGamma8Bit, relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('../src/colorspace/srgb.js');
const { lightnessToASCII, lightnessToGrayscale, rgbaGradient } = require("../src/colorspace/colorpropconvert.js");
const { lightness, XYZtoLAB, LABtoXYZ, illuminant } = require("../src/colorspace/cie.js");
const { loadChanTreeFile, randomColorFromChanTreeBuff } = require("../rgblightness/randcoloroflightness.js");
const { histogram } = require("../src/flatsignal/imageProcessing.js");
const { RGBImage } = require("../src/tensorsignal/rgbimage.js");
const treeBuffPath = './rgblightness/255buff/ct' //'cieBuff/ct'

function imgToRGBA(rawImgData) {
    //check if raw stream is an array and if it is divisible by 4
    let colorList = [];
    let colorChannels = [];
    for (let i = 1; i <= rawImgData.length; i ++) {
        colorChannels.push(rawImgData[i - 1]);
        if (i % 4 === 0) {
            colorList.push(RGBA.color.apply(null, colorChannels));
            colorChannels = [];
        }
    }
    return colorList;
}

function ASCIIVectorToImage(ASCIIVector, imageWidth, xPadding=1) {
    if (ASCIIVector.length % imageWidth !== 0) {
        return null;
    }
    let output = ""
    for (let i = 0; i < ASCIIVector.length; i++) {
        if ((i + 1) % imageWidth == 0) {
            output += "<br/>";
        }
        for (let r = 1; r <= xPadding; r++) {
            output += ASCIIVector[i];
        }    
    }
    return output;
}

function imgtoLight(rawImgData, discrete=false) {
    let RGBAImg = imgToRGBA(rawImgData);
    let relativeLuminenceVector = RGBAImg.map( 
        color => relativeLuminence(linearize8Bit(color))
    );

    let lightnessVector = relativeLuminenceVector.map( 
        Y => discrete ? Math.round(255 * (lightness(Y) / 100)) : lightness(Y)
    );
    return lightnessVector;
}

function randLGrad(startL, endL) {
    let strtFN = treeBuffPath + startL;
    let endFN =  treeBuffPath + endL;
    let strtBuff = loadChanTreeFile(strtFN);
    let endBuff = loadChanTreeFile(endFN)
    let strtColor = randomColorFromChanTreeBuff(strtBuff, [1,0,2]);
    let endColor = randomColorFromChanTreeBuff(endBuff, [1,0,2]);
    let range = Math.abs(startL - endL);
    return rgbaGradient(strtColor, endColor, range + 1);
}

module.exports = {
    "rawImgtoASCII" : (rawImgData, imageWidth, padding) => {     
        let lightnessVector = imgtoLight(rawImgData, false);
        let ASCIIVector = lightnessVector.map( 
            light => lightnessToASCII(light)
        );
        let textImage = ASCIIVectorToImage(ASCIIVector, imageWidth, padding);
        return textImage;
    },
    "rawImgtoGrayscale" : (rawImgData) => {
        let lightnessVector = imgtoLight(rawImgData, false);
        let grayImg = lightnessVector.map( 
            L => lightnessToGrayscale(L)
        );
        return grayImg;
    },
    "rawImgtoRand": (rawImgData) => {
        let lightnessVector = imgtoLight(rawImgData, true);
        let cachedBuffers = {};
        let randImg = lightnessVector.map( L => {
            let buff;
            if (!cachedBuffers[L]) {
                let filename = treeBuffPath + L;
                buff = loadChanTreeFile(filename);
                cachedBuffers[L] = buff;
            } else {
                buff = cachedBuffers[L];
            }
            let color = randomColorFromChanTreeBuff(buff, [1,0,2]);
            return RGBA.color(color[0], color[1], color[2]);
        });
        return randImg;
    },
    "imgtoRandLayer" : (rawImgData) => {
        let lightnessVector = imgtoLight(rawImgData, true);
        let colorCache = {};
        let randImg = lightnessVector.map( L => {
            let color;
            if (colorCache[L]) {
                color = colorCache[L];
            } else {
                let filename = treeBuffPath + L;
                let buff = loadChanTreeFile(filename);
                color = randomColorFromChanTreeBuff(buff, [1,0,2]);
                colorCache[L] = color;
            }

            return RGBA.color(color[0], color[1], color[2]);
        });
        return randImg;
    },
    "imgtoRandLightGradient" : (rawImgData, n) => {
        let lightnessVector = imgtoLight(rawImgData, true);
        let lightGrad = [];
        lightGrad[100] = [255, 255, 255, 255];

        for (let i = 0; i < 100; i += 10) {
            let filename = treeBuffPath + i;
            let buff = loadChanTreeFile(filename);
            color = randomColorFromChanTreeBuff(buff, [1,0,2]);
            lightGrad[i] = RGBA.color(color[0], color[1], color[2]);
        }
        for (let i = 0; i < 100; i += 10) {
            let gradient = rgbaGradient(lightGrad[i], lightGrad[i + 10], 11);
            for (let m = 1; m < gradient.length - 1; m++) {
                lightGrad[i + m] = gradient[m];
            }
        }
        //console.log(lightGrad)
        let gradImg = lightnessVector.map( L => lightGrad[L]);
        //onsole.log(gradImg.length * 4);
        return gradImg;
    },
    "imgtoLight" : imgtoLight,
    "randLGrad" : randLGrad,
    "LHist" : (rawImgData) => {
        let binCount = 100,
            max = 100,
            min = 0,
            range = max - min,
            binSize = range / binCount;

        let hist = histogram(rawImgData, (rgbColor) => {
            let Y = relativeLuminence(linearize8Bit(rgbColor));
            return Math.round((lightness(Y) / 100) * (max - 1));
        },
        binCount,
        min,
        max,
        true
        )

        return hist.map((p, i) => {
            return {name: (i * binSize) + min, value : p}
        });
    },
    "genXColorsOfLight" : (x, L) => {
        let chanTreeBuffer = loadChanTreeFile(filename);
        let colors = []
        for (let i = 0; i < x; i++) {
            let r = randomColorFromChanTreeBuff(chanTreeBuffer, [1,0,2]);
            for (let s = 0; s < r.length; s++) {
                if (r[s] > 255 || r[s] < 0) {
                    console.log("!!! " + r)
                }
            }
            colors.push(RGBA.color(r[0], r[1], r[2]));
        }
        return colors;
    }
}
