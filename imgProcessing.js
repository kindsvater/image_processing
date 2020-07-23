const { rgb } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
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

        if (L >= min && L < max) {
            freqHist[binIdx(L, min, binSize)] += 1;
        }
    }
    return freqHist.map((freq) => freq / resolution);
}        

function binIdx(value, min, binSize) {
    return Math.floor((value - min) / binSize);
}

function cdf(normHist) {
    let cumProb = 0;
        cdf = [];
    for(let i = 0; i < normHist.length; i++) {
        cumProb += normHist[i];
        cdf[i] = cumProb;
    }
    return cdf;
}

function equalize(cdf, range) {
    let equal = [];
    for (let j = 0; j <= cdf.length; j++) {
        equal[j] = cdf[j] * (range - 1);
    }
    return cdf;
}

function equalizeImgLight(img, min, max) {
    let hist = histogram(
        img,
        (rgbColor) => {
            let Y = relativeLuminence(linearize8Bit(rgbColor));
            return Math.round((lightness(Y) / 100) * ((max - min) - 1));
            },
        max - min,
        min,
        max,
        true
    );
    let equalCDF = equalize(cdf(normHist), max - min);
}
module.exports = {
    histogram
}