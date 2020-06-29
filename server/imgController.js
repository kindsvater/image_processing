const { rgba, redLevel, greenLevel, blueLevel } = require("./../rgba.js");
const { lightnessToASCII } = require("./../PropConvert.js");
const { luminence, perceivedLightness } = require("./../srgb.js");

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
                let m = perceivedLightness(Y);
            return m;
        });
        let ASCIIVector = lightnessVector.map( light => {
            return lightnessToASCII(light);
        });
        let textImage = ASCIIVectorToImage(ASCIIVector, imageWidth, padding);
        return textImage;
    }
}
