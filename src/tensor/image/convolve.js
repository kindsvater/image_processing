
const { nextPowerOf2 } = require('../../utility/num_util.js');
const { makeImageKernel } = require('../../flatsignal/filter.js');
const { pad, getPadding, depad } = require('../pad/pad.js');
const { ifft2DImage, fft2DRealImage } = require('./fft2image.js');
const complexOps = require('../signal/complexops.js');

function fftConvolve(img, psf, paddingType="constant", paddingConstant=0) {
    let height = img.shape[0];
    let width = img.shape[1];
    let fftHeight = nextPowerOf2(height * 2 - 1);
    let fftWidth = nextPowerOf2(width * 2 - 1);

    let imgPadding = getPadding(img, [fftHeight, fftWidth], "center");
    pad(img, imgPadding, true, paddingType, paddingConstant);
    let kernel = makeImageKernel(psf, fftHeight, fftWidth);

    let complexFreqImg = fft2DRealImage(img, 3, true);
    let complexFreqKernel = fft2DRealImage(kernel, 1, true);

    let convolvedFreqImg =  complexOps.multiply(complexFreqImg, complexFreqKernel, 3);
    let convolvedRealImage = ifft2DImage(convolvedFreqImg, 3).real;
    
    return  depad(convolvedRealImage, imgPadding);
}

// function convolveRealImage(img, psf, edge="mirror") {
//     let output = [];
//         finalHeight = height + psf.rows() - 1,
//         finalWidth = img.width() + psf.cols() - 1,
//         leftRadius = Math.ceil(psf.cols() / 2) - 1, //5 = 2 4 = 1
//         rightRadius = psf.cols() - leftRadius - 1, //5 = 2; 4 = 2;
//         topRadius = Math.ceil(psf.rows() / 2) - 1,
//         bottomRadius = psf.rows() - topRadius - 1;
//         // cntrRI= leftRadius,
//         // cntrCI = rightRadius,
//         let currIndex = 0;
//         let rightSum = 0;
//         let topSum = 0;
//         let sum = 0;
//         let subCols = 0;
//         let subRows = 0;
//         let totalSub = 0;
//     for (let row = 0; row < imgHeight; row++) {
//         for (let col = 0; col < imgWidth; col++) {
            

//             //calculate submerged columns and rows;
//             if (col < leftRadius) subCols = leftRadius - col;
//             else if (imgWidth - col <= rightRadius) subCols = rightRadius - (imgWidth - col - 1);
//             if (row < topRadius) subRows = topRadius - row;
//             else if (imgHeight - row <= bottomRadius) subRows = bottomRadius - (imgHeight - row - 1);
            
//             if (!subRows || !subCols) {
//                 switch(edge) {
//                     case "mirror" : 
//                         wrapRInd = imgHeight - r - 1;
//                         break;
//                     case "pad" : 
//                         val = 0;
//                         break;
//                     case "correct" :
//                         //divide by immersed pixels;
//                         break;
//                 }
//             } else {
//                 for (let pr = -topRadius; pr <= bottomRadius; pr++) {
//                     for (let pc = -leftRadius; pc <= rightRadius; pc++) {
//                         //sum += img[((r * imgWidth) + c) * chans] * 
                        
//                     }
    
//                 }
//             }
//         }
//     }

//     for (let r = -topRadius; r < imgHeight - topRadius; r++) {
//         for (let c = -leftRadius; c < imgWidth - leftRadius; c++) {
//             let sum = 0,
//                 subC = 0,
//                 subR = 0,
//                 totalSub;

//             //calculate submerged columns and rows;
//             if (c < 0) subC = 0 - c;
//             else if (c + psfWidth - 1 >= imgWidth) subC = psfWidth - imgWidth + c;
//             if (r < 0) subR = 0 - r;
//             else if (r + psfHeight - 1 >= imgHeight) subR = psfHeight - imgHeight + r;
            
//             if (!subR || !subC) {
//                 switch(edge) {
//                     case "mirror" : 
//                         wrapRInd = imgHeight - r - 1;
//                         break;
//                     case "pad" : 
//                         val = 0;
//                         break;
//                     case "correct" :
//                         //divide by immersed pixels;
//                         break;
//                 }
//             } else {
//                 for (let pr = 0; pr < psfHeight; pr++) {
//                     for (let pc = 0; pc < psfWidth; pc++) {
//                         //sum += psf[]
                        
//                     }
//                 }
//             }
//             //output[row col] = 
//         }
//     }
// }

module.exports = {
    fftConvolve
}