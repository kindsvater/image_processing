const { rgb, rgba } = require('./rgb');
const { relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('./srgb');
const { lightness, XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('./cie');
const { ImageReader } = require('./ImageReader.js');


//Given a flat array of rgb or rgba image data and a function to calculate a property of a color: creates a 
//n-bin normalized histogram of the calculated property value for each color in the image as long as the value
//is within the specified range. The parameter a specifies the model for the image: true for rgba and false for rgb
function histogram(img, calc, nbins, min, max, a=true) {
    if ((max - min + 1) % nbins !== 0) {
        throw new Error("Bin size is not an integer. Histogram range must be cleanly divisible by bin count");
    }
    let binSize = (max - min + 1) / nbins; 
    let total = 0; // Total colors with calculated values falling within range of histogram. 
    
    //Declare and initialize empty histogram
    let freqHist = [];
    for (let m = 0; m < nbins; m++) {
        freqHist[m] = 0;
    }

    let reader = new ImageReader(img, a);
    while(reader.hasNextColor()) {
        let L = calc(reader.nextColor())
        if (L >= min && L < max) {
            total = total + 1;
            freqHist[binIdx(L, min, binSize)] += 1;
        }
    }

    return freqHist.map((freq) => parseFloat((freq / total).toPrecision(4)));
}        

function binIdx(value, min, binSize) {
    return Math.floor((value - min) / binSize);
}

//Given an n-bin normalized histogram, returns its corresponding cumulative distribution. 
function cdf(normHist) {
    let cumProb = 0;
        c = [];
    for(let i = 0; i < normHist.length; i++) {
        cumProb += normHist[i];
        c[i] = parseFloat(cumProb.toPrecision(4));
    }
    return c;
}

//Given an n-bin Cumulative Distribution and a range of values, returns an n-index array of
//the equalized range. 
function equalizeHist(cdf, range) {
    let equal = [];
    for (let j = 0; j < cdf.length; j++) {
        equal[j] = cdf[j] * range;
    }
    return equal;
}

//Given an rgba image, equalizes the lightness of the image between the minimum and maximum values
function equalizeImgLight(img, min, max) {
    let normHist = histogram(
        img,
        (rgbColor) => {
            return LAB.LVal(XYZtoLAB(sRGBtoXYZ(rgbColor))) / 100 * 255;
            },
        max - min + 1,
        min,
        max,
        true
    );

    let equalCDF = equalizeHist(cdf(normHist), 255);

    let read = new ImageReader(img, true);
    let labImg = [];
    while(read.hasNextColor()) {
        labImg.push(XYZtoLAB(sRGBtoXYZ(read.nextColor())));
    }

    XYZtoLAB([1.0378, 0.9509, 0.8658]);
    let equalImg = labImg.map(lab => {
        let L8Bit = Math.floor(LAB.LVal(lab) / 100 * 255);
        if (equalCDF[binIdx(L8Bit, min, 1)]) {
            L8Bit = equalCDF[binIdx(L8Bit, min, 1)];
        }
        let eqLAB = LAB.color(L8Bit / 255 * 100, LAB.AVal(lab), LAB.BVal(lab));
        //try {
            
            //console.log(eqLAB)
            let newXYZ = LABtoXYZ(eqLAB, undefined, true);
            //console.log(newXYZ)
            let sRGB = XYZtosRGB(newXYZ);
            return sRGB;
        // } catch {
        //     // console.log("The fucked up rgb color is " + XYZtosRGB(LABtoXYZ(lab)));
        //     console.log("The original Lab is " + lab);
        //     console.log(eqLAB);
        //     // console.log("Eqaulized Lab is " + eqLAB);
        //     // console.log("Equalized XYZ is " + LABtoXYZ(eqLAB));
        // }
    });
    let unclampedImg = [];
    for (let x = 0; x < equalImg.length; x++) {
        unclampedImg.push(rgb.redLevel(equalImg[x]), rgb.greenLevel(equalImg[x]), rgb.blueLevel(equalImg[x]), 255);
    }
    return new Uint8ClampedArray(unclampedImg);
}

module.exports = {
    histogram,
    cdf,
    equalizeHist,
    equalizeImgLight
}