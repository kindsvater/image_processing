const { rgba, redLevel, greenLevel, blueLevel } = require("./../rgba.js");
const { lightnessToASCII, lightnessToGrayscale, rgbaGradient } = require("./../PropConvert.js");
const { luminence, CIEPerceivedLightness } = require("./../srgb.js");
const { loadChanTreeFile, randomColorFromChanTreeBuff } = require("./../writeBrightnessFiles.js");

function imgToRGBA(rawImgData) {
    //check if raw stream is an array and if it is divisible by 4
    let colorList = [];
    let colorChannels = [];
    for (let i = 1; i <= rawImgData.length; i ++) {
        colorChannels.push(rawImgData[i - 1]);
        if (i % 4 === 0) {
            colorList.push(rgba.apply(null, colorChannels));
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

module.exports = {
    "rawImgtoASCII" : (rawImgData, imageWidth, padding) => {     
        let RGBAImg = imgToRGBA(rawImgData);
        let luminenceVector = RGBAImg.map( 
            color => luminence(redLevel(color), greenLevel(color), blueLevel(color))
        );
        let lightnessVector = luminenceVector.map( 
            Y => CIEPerceivedLightness(Y)
        );
        let ASCIIVector = lightnessVector.map( 
            light => lightnessToASCII(light)
        );
        let textImage = ASCIIVectorToImage(ASCIIVector, imageWidth, padding);
        return textImage;
    },
    "rawImgtoGrayscale" : (rawImgData) => {
        let RGBAImg = imgToRGBA(rawImgData);
        let luminenceVector = RGBAImg.map( 
            color => luminence(redLevel(color), greenLevel(color), blueLevel(color))
        );
        let lightnessVector = luminenceVector.map( 
            Y => CIEPerceivedLightness(Y)
        );
        let grayImg = lightnessVector.map( 
            L => lightnessToGrayscale(L)
        );
        return grayImg;
    },
    "rawImgtoRand": (rawImgData) => {
        let RGBAImg = imgToRGBA(rawImgData);
        let luminenceVector = RGBAImg.map( 
            color => luminence(redLevel(color), greenLevel(color), blueLevel(color))
        );
        let lightnessVector = luminenceVector.map( 
            Y => Math.round(CIEPerceivedLightness(Y))
        );
        let cachedBuffers = {};
        let randImg = lightnessVector.map( L => {
            let buff;
            if (!cachedBuffers[L]) {
                let filename = './cieTreeBuff/ct' + L;
                buff = loadChanTreeFile(filename);
                cachedBuffers[L] = buff;
            } else {
                buff = cachedBuffers[L];
            }
            let color = randomColorFromChanTreeBuff(buff, [1,0,2]);
            return rgba(color[0], color[1], color[2]);
        });
        return randImg;
    },
    "imgtoRandLayer" : (rawImgData) => {
        let RGBAImg = imgToRGBA(rawImgData);
        let luminenceVector = RGBAImg.map( 
            color => luminence(redLevel(color), greenLevel(color), blueLevel(color))
        );
        let lightnessVector = luminenceVector.map( 
            Y => Math.round(CIEPerceivedLightness(Y))
        );
        let colorCache = {};
        let randImg = lightnessVector.map( L => {
            let color;
            if (colorCache[L]) {
                color = colorCache[L];
            } else {
                let filename = './cieTreeBuff/ct' + L;
                let buff = loadChanTreeFile(filename);
                color = randomColorFromChanTreeBuff(buff, [1,0,2]);
                colorCache[L] = color;
            }

            return rgba(color[0], color[1], color[2]);
        });
        return randImg;
    },
    "imgtoRandLightGradient" : (rawImgData, n) => {
        let RGBAImg = imgToRGBA(rawImgData);
        console.log(RGBAImg.length * 4)
        let luminenceVector = RGBAImg.map( 
            color => luminence(redLevel(color), greenLevel(color), blueLevel(color))
        );
        let lightnessVector = luminenceVector.map( 
            Y => Math.round(CIEPerceivedLightness(Y))
        );
        let lightGrad = [];
        lightGrad[100] = [255, 255, 255, 255];
        for (let i = 0; i < 100; i += 10) {
            let filename = './cieTreeBuff/ct' + i;
            let buff = loadChanTreeFile(filename);
            color = randomColorFromChanTreeBuff(buff, [1,0,2]);
            lightGrad[i] = rgba(color[0], color[1], color[2]);
        }
        for (let i = 0; i < 100; i += 10) {
            let gradient = rgbaGradient(lightGrad[i], lightGrad[i + 10], 11);
            for (let m = 1; m < gradient.length - 1; m++) {
                lightGrad[i + m] = gradient[m];
            }
        }
        console.log(lightGrad)
        let gradImg = lightnessVector.map( L => lightGrad[L]);
        console.log(gradImg.length * 4);
        return gradImg;
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
            colors.push(rgba(r[0], r[1], r[2]));
        }
        return colors;
    }
}
