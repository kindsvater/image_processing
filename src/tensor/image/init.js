const { repeat } = require("../../utility/array_util/init.js");
const { RGBImage } = require("./rgbimage.js");

function initSolidImage(rows, columns, color) {
    return new RGBImage(repeat(color, rows * columns), columns, color.length === 4);
}

function initBlackImage(rows, columns, a=false) {
    let black = a ? [0,0,0,255] : [0,0,0];
    return initSolidImage(rows, columns, black);
}

function initWhiteImage(rows, columns, a=false) {
    let white = a ? [255,255,255,255] : [255,255,255];
    return initSolidImage(rows, columns, white);
}

module.exports = {
    initSolidImage,
    initBlackImage,
    initWhiteImage
}