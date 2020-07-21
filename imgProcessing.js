const { rgb } = require('./rgb');
const { relativeLuminence } = require('./srgb');
const { lightness } = require('./cie');

function histogram(img, transform, nbins, min, max, a=false) {
    if ((max - min) % nbins !== 0) {
        throw new Error("Bin size is not an integer. Histogram range must be cleanly divisible by bin count");
    }
    let binSize = (max - min) / nbins; 
    //If img in rgba format each color is 4 indices long. If in rgb, 3 indices long
    let cc = a ? 4 : 3;
    let resolution = img.length / cc;
    
    let freqHist = [];
    //intialize histogram
    for (let m = 0; m < nbins; m++) {
        freqHist[m] = 0;
    }

    for (let i = 0; i < img.length; i += cc) {
        let L = transform(rgb.color(img[i], img[i + 1], img[i + 2]));

        if (L >= min && L <= max) {
            let ind = Math.floor((L - min) / binSize);
            freqHist[ind] += 1;
        }
    }
    
    return freqHist.map(freq => freq / resolution);
}        

function rgbToLightness(rgbColor) {
    let Y = relativeLuminence(rgbColor);
    let L = Math.round(lightness(Y) * nbins);
    return L;
}
