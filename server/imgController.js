const { rgba, redLevel, greenLevel, blueLevel } = require("./../rgba.js");
const { lightnessToASCII, lightnessToGrayscale } = require("./../PropConvert.js");
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
        let luminenceVector = RGBAImg.map( color => {
            return luminence(redLevel(color), greenLevel(color), blueLevel(color));
        });
        let lightnessVector = luminenceVector.map( Y => {
            return CIEPerceivedLightness(Y);
        });
        let ASCIIVector = lightnessVector.map( light => {
            return lightnessToASCII(light);
        });
        let textImage = ASCIIVectorToImage(ASCIIVector, imageWidth, padding);
        return textImage;
    },
    "rawImgtoGrayscale" : (rawImgData) => {
        let RGBAImg = imgToRGBA(rawImgData);
        let luminenceVector = RGBAImg.map( color => {
            return luminence(redLevel(color), greenLevel(color), blueLevel(color));
        });
        let lightnessVector = luminenceVector.map( Y => {
            return CIEPerceivedLightness(Y);
        });
        let grayImg = lightnessVector.map( L => {
            return lightnessToGrayscale(L);       
        });
        return grayImg;
    },
    "rawImgtoRand": (rawImgData) => {
        let RGBAImg = imgToRGBA(rawImgData);
        let luminenceVector = RGBAImg.map( color => {
            return luminence(redLevel(color), greenLevel(color), blueLevel(color));
        });
        let lightnessVector = luminenceVector.map( Y => {
            return Math.round(CIEPerceivedLightness(Y));
        });
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
