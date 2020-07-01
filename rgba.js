let rgba = module.exports
rgba.rgba = (r, g, b, a) => [r, g, b, a ? a : 255];
rgba.redLevel = (rgbaColor) => rgbaColor[0];
rgba.greenLevel = (rgbaColor) => rgbaColor[1];
rgba.blueLevel = (rgbaColor) => rgbaColor[2];
rgba.averageChannelLevel =  (r, g, b) => (r + g + b) / 3;
// rgba.isRGBA = (rgbaColor) => {
    
// }