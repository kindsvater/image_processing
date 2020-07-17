
const { dim, invert } = require('./lin.js');

let rgb = module.exports
rgb.rgba = (r, g, b, a) => [r, g, b, a ? a : 255];
rgb.rgb = (r, g, b) => [r, g, b];
rgb.redLevel = (rgbColor) => rgbColor[0];
rgb.greenLevel = (rgbColor) => rgbColor[1];
rgb.blueLevel = (rgbColor) => rgbColor[2];
rgb.averageChannelLevel =  (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
rgb.

function conversionMatrix(primaryCoords, whiteCoords) {
    // let Xr = primaryCoords[0][0] / primaryCoords[0][1];
    // let Yr = 1;
    // let Zr = (1 - primaryCoords[0][0] - primaryCoords[0][1]) / primaryCoords[0][1];
    // let Xg = primaryCoords[1][0] / primaryCoords[1][1];
    // let Yg = 1;
    // let Zg = (1 - primaryCoords[1][0] - primaryCoords[1][1]) / primaryCoords[1][1];
    // let Xb = primaryCoords[2][0] / primaryCoords[2][1];
    // let Yb = 1;
    // let Zb = (1 - primaryCoords[2][0] - primaryCoords[2][1]) / primaryCoords[2][1];
    
    //let primXYZ = [[Xr, Xg, Xb], [Yr, Yg, Yb], [Zr, Zg, Zb]];
    let primXYZ = [
        [primaryCoords[0][0],primaryCoords[1][0], primaryCoords[2][0]],
        [primaryCoords[0][1],primaryCoords[1][1], primaryCoords[2][1]],
        [primaryCoords[0][2],primaryCoords[1][2], primaryCoords[2][2]],
    ]
    console.log(primXYZ)
    let iPXYZ = invert(primXYZ);
    console.log(iPXYZ);
    let S = [0, 0, 0];
    for (let r = 0; r < iPXYZ.length; r++) {
        S[r] = 0;
        for (let c = 0; c < iPXYZ.length; c++) {
            S[r] += iPXYZ[r][c] * whiteCoords[c];
        }
    }
    console.log(S);
    return [
        [S[0] * Xr, S[1] * Xb, S[2] * Xg],
        [S[0] * Yr, S[1] * Yb, S[2] * Yg],
        [S[0] * Zr, S[1] * Zb, S[2] * Zg],
    ];
}
    0: (3) [-1.5771481212121214, -0.855, 0.32630192424242427]
1: (3) [-0.8132170000000001, -0.34199999999999997, 0.6526038484848485]
2: (3) [-0.02439650999999998, -0.27018, 0.06526038484848484]

[5.928662626262627, -0.855, 0.30581212121212126]
1: (3) [3.056966666666667, -0.34199999999999997, 0.6116242424242425]
2: (3) [0.2779060606060603, -4.503, 0.10193737373737373]

THe real conversion conversion...
0.4124564  0.3575761  0.1804375
0.2126729  0.7151522  0.0721750
0.0193339  0.1191920  0.9503041