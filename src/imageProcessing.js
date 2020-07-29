const { RGB, RGBA } = require('./RGB');
const { relativeLuminence, linearize8Bit, sRGBtoXYZ, XYZtosRGB } = require('./sRGB');
const { lightness, XYZtoLAB, LABtoXYZ, LAB, adjustLight } = require('./cie');
const { bankRound, zeros } = require('./valuetype');
const { ImageReader } = require('./ImageReader.js');

//Given a flat array of RGB or RGBA image data and a function to calculate a property of a color: creates a 
//n-bin normalized histogram of the calculated property value for each color in the image as long as the value
//is within the specified range. The parameter a specifies the model for the image: true for RGBA and false for RGB
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

//Given an RGBA image, equalizes the lightness of the image between the minimum and maximum values
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
        unclampedImg.push(RGB.redLevel(equalImg[x]), RGB.greenLevel(equalImg[x]), RGB.blueLevel(equalImg[x]), 255);
    }
    return new Uint8ClampedArray(unclampedImg);
}

function radix2FFTImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    function translateIndex(ind, chans, pOffset, from) {
        return from + (ind * chans * pOffset);
    }
    if (!to) to = ReX.length;
    let ccTotal = to - from,
        res = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
        m = bankRound(Math.log2(res)),
        j = res / 2,
        tempR,
        tempI,
        c,
        tj,
        ti;

    //Sort in Reverse Bit order
    for (let i = 1; i < res; i++) {
        if (i < j) {
            ti = translateIndex(i, chans, pWidth, from);
            tj = translateIndex(j, chans, pWidth, from);
            for (c = 0; c < chans; c++) {
                tempR = ReX[tj + c];
                tempI = ImX[tj + c];
                ReX[tj + c] = ReX[ti + c];
                ImX[tj + c] = ImX[ti + c];
                ReX[ti + c] = tempR;
                ImX[ti + c] = tempI;
            }
        }
        let k = res / 2;
        while (k <= j) {
            j = j - k;
            k = k / 2;
        }
        j = j + k;
    }

    //Loop for each stage
    for (let stage = 1; stage <= m; stage++) {  
        let spectraSize = Math.pow(2, stage);      
        let halfSpectra = spectraSize / 2;
        let ur = 1;
        let ui = 0;
        //calculate sine and cosine values
        let sr = Math.cos(Math.PI / halfSpectra);
        let si = Math.sin(Math.PI / halfSpectra);

        //Loop for each Sub-DTF
        for (j = 1; j <= halfSpectra; j++) {
            //Loop for each Butterfly
            for (let i = j - 1; i < res; i += spectraSize) {
                let ip = translateIndex(i + halfSpectra, chans, pWidth, from);
                ti = translateIndex(i, chans, pWidth, from);
                //Butterfly calculation for each channel's signal
                for (c = 0; c < chans; c++) {
                    tempR = ReX[ip + c] * ur - ImX[ip + c] * ui;
                    tempI = ReX[ip + c] * ui + ImX[ip + c] * ur;
                    ReX[ip + c] = ReX[ti + c] - tempR;
                    ImX[ip + c] = ImX[ti + c] - tempI;
                    ReX[ti + c] = ReX[ti + c] + tempR;
                    ImX[ti + c] = ImX[ti + c] + tempI;
                }
            }
            tempR = ur;
            ur = tempR * sr - ui * si;
            ui = tempR * si + ui * sr;
        }
    }
    return {ReX, ImX};
}

function chirpZTransformImage(ReX, ImX, chans, from=0, to=0, pWidth=1) {
    let n = ReX.length;
    if (n !== ImX.length) throw new Error("Real and Imaginary components must have same number of elements.");
    let m = 1;
    while (m < n * 2 + 1) m *= 2;
    let tcos = [],
        tsin = [],
        ReA = [],
        ImA = [],
        ReB = [],
        ImB = [];

    for (let i = 0; i < n; i++) {
        let j = i * i % (n * 2);
        tcos[i] = Math.cos(Math.PI * j / n);
        tsin[i] = Math.sin(Math.PI * j / n);
        ReA[i] = ReX[i] * tcos[i] + ImX[i] * tsin[i];
        ImA[i] = ImX[i] * tcos[i] - ReX[i] * tsin[i];
    }
    //Pad with zeros so that length is radix-2 number M
    for (let i = n; i < m; i++) {
        ReA[i] = 0;
        ImA[i] = 0;
    }

    ReB[0] = tcos[0];
    ImB[0] = tsin[0];
    for (let i = 1; i < n; i++) {
        ReB[i] = ReB[m - i] = tcos[i];
        ImB[i] = ImB[m - i] = tsin[i];
        console.log(ReB[n]);
    }

    convolveComplex(ReA, ImA, ReB, ImB);
    for (let i = 0; i < n; i++) {
        ReX[i] = ReA[i] * tcos[i] + ImA[i] * tsin[i];
        ImX[i] = ImA[i] * tcos[i] - ReA[i] * tsin[i];
    }
    return ReX, ImX;
}

function FFT1DImage(ReX, ImX, chans=1, from=0, to=0, pWidth=1) {
    if (ReX.length !== ImX.length) throw new Error("Complex signal component lengths do not match");
    if (from < 0 || from >= ReX.length) throw new Error("From Index " + from + " is out of range");
    if (to > ReX.length) throw new Error("To Index " + to + " is out of range");
    if (!to) to = ReX.length;
    let ccTotal = to - from;
    let n = pWidth > 1 ? ((((ccTotal / chans) - 1) / pWidth) + 1) : ccTotal / chans;
    if (n === 0) return;
    //If Signal length is a power of two perform Radix-2 FFT
    if (isPowerOfTwo(n)) {
        radix2FFTImage(ReX, ImX, chans, from, to, pWidth, inPlace); 
    } else {
        //If Signal length is arbitrary or prime, perform chirp-z transfrom
        chirpZTransformImage(ReX, ImX);
    }
}

function realFFT2DImg(img, pWidth, chans, inPlace=true) {
    let ReX = inPlace ? img : [];
        ImX = zeros(img.length);
        pHeight = img.length / pWidth / chans;

    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < pHeight; row++) {
        FFT(ReX, ImX, chans, (row * pWidth * chans), ((row + 1) * pWidth * chans));
    }
    //Take FFT of each column
    for (let col = 0; col < pWidth; col++) {
        FFT(ReX, ImX, chans, col * chans, (((pHeight - 1) * pWidth) + (col + 1)) * chans, pWidth);
    }
    return {ReX, ImX};
}


module.exports = {
    histogram,
    cdf,
    equalizeHist,
    equalizeImgLight
}