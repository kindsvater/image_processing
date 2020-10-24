'use strict'

const aspectRatio = (imageWidth, imageHeight) => imageWidth / imageHeight;

const resizeImageWidth = (newImageHeight, aspectRatio) => newImageHeight * aspectRatio;

const resizeImageHeight = (newImageWidth, aspectRatio) => newImageWidth * (1 / aspectRatio);

module.exports = {
    aspectRatio,
    resizeImageHeight,
    resizeImageWidth
}