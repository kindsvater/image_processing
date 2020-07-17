let rgb = module.exports
rgb.rgba = (r, g, b, a) => [r, g, b, a ? a : 255];
rgb.rgb = (r, g, b) => [r, g, b];
rgb.redLevel = (rgbColor) => rgbColor[0];
rgb.greenLevel = (rgbColor) => rgbColor[1];
rgb.blueLevel = (rgbColor) => rgbColor[2];
rgb.averageChannelLevel =  (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
rgb.conversionMatrix = (primaryCoords, whiteCoords) => {
    let Xr = primaryCoords[0,0] / primaryCoords[0,1];
    let Yr = 1;
    let Zr = (1 - primaryCoords[0,0] - primaryCoords[0,1]);
    let Xg = primaryCoords[1,0] / primaryCoords[1,1];
    let Yg = 1;
    let Zg = (1 - primaryCoords[1,0] - primaryCoords[1,1]);
    let Xb = primaryCoords[2,0] / primaryCoords[2,1];
    let Yb = 1;
    let Zb = (1 - primaryCoords[2,0] - primaryCoords[2,1]);
    
    
}