(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { rgb, rgba } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
const { lightness } = require('./cie');

const ImageReader = (function() {
    function ImageReader(img, a) {
        this.img = img;
        this.colorIdx = 0;
        this.a = a;
        //this.pixels = [];
        this.lightVector; //maybe choose object so you can cache different ranges?/
    }
    ImageReader.prototype.nextColor = function(a=false) {
        let color;
        if (a) {
            color = rgba.color(
                this.img[this.colorIdx], this.img[this.colorIdx + 1],
                this.img[this.colorIdx + 2], this.img[this.colorIdx + 3]
            );
        } else {
            color = rgb.color(
                this.img[this.colorIdx], this.img[this.colorIdx + 1], this.img[this.colorIdx + 2]
            );
        }
        this.colorIdx += this.a ? 4 : 3;
        return color;
    } 
    ImageReader.prototype.eachColor = function(cb, a=false) {
        while(this.hasNextColor()) {
            let curr = this.colorIdx;
            let cont = cb(this.nextColor(a), curr);
            if (cont === false) break;
        }
        return;
    }
    ImageReader.prototype.hasNextColor = function() {
        return this.colorIdx < this.img.length;
    }
    ImageReader.prototype.toPixels = function(a=false) {
        //if (this.pixels) return this.pixels; could add caching
        let pixelVector = [];
        this.eachColor((color) => {
            pixelVector.push(color);
        });
        this.reset();
        //this.pixels = pixelVector;
        return pixelVector;
    }
    ImageReader.prototype.toLightness = function(range=255) {
        //if (this.lightVector) ) Cache and also check range;
        let LVector = []
        this.eachColor((color) => {
            LVector.push(
                Math.round(
                    (lightness(relativeLuminence(linearize8Bit(color)))) / 100 * range 
                )
            );   
        });
        this.reset();
        return LVector;
    }
    ImageReader.prototype.getLightIdxs = function(range=255) {
        let lVec = this.lightVector ? this.lightVector : this.toLightness(range);
        let lightIdxs = [];
        for (let m = 0; m < lVec.length; m++) {
            if (!lightIdxs[lVec[m]]) {
                lightIdxs[lVec[m]] = [];
            }
            lightIdxs[lVec[m]].push(m * this.a ? 4 : 3);
        }
        return lightIdxs;
    }
    ImageReader.prototype.reset = function() {
        this.colorIdx = 0;
    }
    return ImageReader;
})();

module.exports = {
    ImageReader
}
},{"./cie":2,"./rgb":6,"./srgb":7}],2:[function(require,module,exports){
const { inNormalUI, clampTo } =  require('./valuetype.js');

//Device Invariant Representation of Color. The tristimulus values X, Y, and Z technically
// range from 0.0000 to infinity, but never exceed 1.2000 in practice. 
//One stimulus represents the intensity of the color
//Y : the relative luminance of the color (how bright it seems compared to the environment);
//The remaining two stimuluses represent the chromaticity or quality of the color 
//X : Mix of LMS cone response curves. Chosen to be non-negative
//Z : Approximation of the short cone response in the human eye.
//Stores the coordinates of standard illuminants in XYZ Colorspace.
const illuminant = {
    'a' : [1.0985, 1.0000, 0.3558], //Tungsten Filament Lighting.
    'c' : [0.9807, 1.0000, 1.1822], //Average Daylight.
    'e' : [1.000, 1.000, 1.000], //Equal energy radiator
    'D50' : [0.9642, 1.0000, 0.8249], // Horizon light at sunrise or sunset. ICC Standard Illuminant
    'D55' : [0.9568, 1.0000, 0.9214], //Mid-morning or mid-afternoon daylight.
    'D65' : [0.9505, 1.0000, 1.0890], //Daylight at Noon. 
    'none' : [2.0, 2.0, 2.0]
}

const XYZ = {
    color: (X, Y, Z, refWhite=illuminant.D65, clamp=false) => {
        if (clamp) {
            let cX = clampTo(X, 0, refWhite[0]),
                cY = clampTo(Y, 0, refWhite[1]),
                cZ = clampTo(Z, 0, refWhite[2]);
            return [cX, cY, cZ];
        } else {
            if (X < 0 || X > refWhite[0]) {
                throw new Error("X stimulus " + X + "out of range.");
            }
            if (Y < 0 || X > refWhite[1]) {
                throw new Error("Y stimulus " + Y + "out of range.");
            }
            if (Z < 0 || Z > refWhite[2]) {
                throw new Error("Z stimulus value " + Z + "out of range. ");
            }
            return [X, Y, Z];
        }
    },
    xStim : xyz => xyz[0],
    yStim : xyz => xyz[1],
    zStim : xyz => xyz[2],
}

//The CIE LAB color space is a device invariant representation of color that is designed to be
// perceptually uniform - there is a linear relationship between the apparent difference and the
// numerical differance of two colors. 
//L : 0 <= L <= 100. Pereceived lightness of the color (0=Black 100=Lightest White**)
    //** Lightest White is relative to an illuminant.
//a and b represent the chromaticity of the color.
//a : -128 <= a <= 128. Position between red and green (-128 = red, 128 = green)
//b : -128 <= b <= 128. Position between yellow and blue (-128 = yellow, 128 = blue)
const LAB = {
    color : (L, A, B) => {
        if ( Number.isNaN(L) || Number.isNaN(A) || Number.isNaN(B) ) {
            throw new TypeError("LAB value is NaN. Values provided must be numbers.");
        }
        if (!inNormalUI(L)) throw new Error( "Lightness value " + L + " must be in range 0 to 100");
        if (!(A >= -128 && A <= 128)) throw new Error("A value " + A + " must be in range -128 to 128 " + L + " " + B);
        if (!(B >= -128 && B <= 128)) throw new Error("A value " + B + " must be in range -128 to 128");

        return [L, A, B];
    }, 
    LVal : lab => lab[0],
    AVal : lab => lab[1],
    BVal : lab => lab[2],
}



//Given RGB tristimulus values in the unit interval, returns luminance  
//or brightness of the color relative to reference white D65. Luminence is a 
//float in the unit interval.
function relativeLuminence(r, g, b) {
    let Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; //Second row of rgbToXYZ conversion matrix
    return Y;
}

//Normalizes relative luminence value in unit interval to float between 0.0 and 100.0.
function normalRLuminence(Y) {
    return Y * 100;
}

//Transforms single XYZ stimulus to its perceptually uniform value. This value is relative to corresponding
//stimulus of the referent white. 
function uniformPerception(XYZStim, whiteStim) {
    let r = XYZStim / whiteStim,
        e = 216 / 24389

    if ( r > e ) {
        return Math.pow(r, (1 / 3));
    }
    return ((841 / 108) * r) + (4 / 29);
}

function LABtoXYZ(lab, refWhite=illuminant.D65, clamp=false) {
    let Yf = (LAB.LVal(lab) + 16) / 116,
        Xf = (LAB.AVal(lab) / 500) + Yf,
        Zf = Yf - (LAB.BVal(lab) / 200),
        k = 24389 / 27,
        e = 216 / 24389,
        temp;
    
    let Yr = LAB.LVal(lab) > k * e ? Math.pow(Yf, 3) : LAB.LVal(lab) / k;
    temp = Math.pow(Xf, 3);
    let Xr = temp > e ? temp : (((116 * Xf) - 16) / k);
    temp = Math.pow(Zf, 3);
    let Zr = temp > e ? temp : (((116 * Zf) - 16) / k);

    return XYZ.color(Xr * XYZ.xStim(refWhite), Yr * XYZ.yStim(refWhite), Zr * XYZ.zStim(refWhite), refWhite, clamp);
}

//Converts normalized relative luminence to the perceived lightness or tone of that 
//luminence. Lightness values returned are floats in range 0.0 to 100.00 
function lightness(Y) {
    let Yn = 1.0000 //Y stimulus of the whitepoint. 

    let yr = uniformPerception(Y, Yn);
    return yr * 116 - 16;
}

function XYZtoLAB(xyz, refWhite=illuminant.D65) {
    let Xf = uniformPerception(XYZ.xStim(xyz), XYZ.xStim(refWhite));
    let Yf = uniformPerception(XYZ.yStim(xyz), XYZ.yStim(refWhite));
    let Zf = uniformPerception(XYZ.zStim(xyz), XYZ.zStim(refWhite));

    let L = 116 * Yf - 16;
    let a = 500 * (Xf - Yf);
    let b = 200 * (Yf - Zf)

    return LAB.color(L, a, b);
}

function adjustLight(lab, newLight) {
    let adjust =  newLight - LAB.LVal(lab);
    let a = (LAB.AVal(lab) - (500 * adjust / 116));
    let b = (LAB.BVal(lab) + (200 * adjust / 116));
 
    return LAB.color(newLight, a, b);;
}

module.exports = {
    relativeLuminence,
    normalRLuminence,
    lightness,
    XYZtoLAB,
    LABtoXYZ,
    adjustLight,
    illuminant,
    LAB,
    XYZ,
}

},{"./valuetype.js":8}],3:[function(require,module,exports){
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
},{"./ImageReader.js":1,"./cie":2,"./rgb":6,"./srgb":7}],4:[function(require,module,exports){
const { ImageReader } = require('./ImageReader.js');
const { histogram, cdf, equalizeImgLight } = require('./imgProcessing');
const { rgb, rgba } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
const { lightness } = require('./cie');

let img = new Image();
let animate = false;
let odd = true;
const lValRange = 255;
const gradientSize = 25;
const gradOffset = 15;
const timestep = 30;

img.onload = function() {
    let canvas = document.getElementById("manip");
    let context = canvas.getContext('2d');
    let whratio = this.height / this.width;

    let cwidth = 500;
    let cheight = whratio * cwidth;
    canvas.width = cwidth;
    canvas.height = cheight;
    context.drawImage(this, 0, 0, cwidth, cheight);
    let contextData = context.getImageData(0,0, cwidth, cheight);
    let rawImgData = contextData.data;
    console.log("image pix = " + rawImgData.length);
    console.log(rawImgData)
    let read = new ImageReader(rawImgData, true);
    let LI = read.getLightIdxs();

    // convertImagetoASCII(rawImgData, cwidth, (textImage) => {
    //     document.getElementById('result').innerHTML = textImage;
    // });

    // convertImagetoGrayscale(rawImgData, cwidth, (gsImageData) => {
    //     contextData.data.set(gsImageData);
    //     context.putImageData(contextData, 0, 0); 
    // });
    // getRandomColorsOfLight(90000, 77, (randImageData) => {
    //     contextData.data.set(randImageData);
    //     context.putImageData(randImageData, 0, 0);
    // });

    // convertImgToRandBrightGradient(rawImgData, cwidth, (rImageData) => {
    //     console.log(rImageData);
    //     contextData.data.set(rImageData);
    //     context.putImageData(contextData, 0, 0); 
    // })
    getLightnessValuesofImg(rawImgData, cwidth, (light) => {
        let lightIdxs = {};
        let original = {};
        for (let m = 1; m < light.length; m++) {
            if (!lightIdxs[light[m]]) {
                lightIdxs[light[m]] = [];
                original[light[m]] = [];
            }
            lightIdxs[light[m]].push(m * 4);
            original[light[m]].push([
                m * 4,
                rawImgData[m * 4],
                rawImgData[m * 4 + 1],
                rawImgData[m * 4 + 2],
                rawImgData[m * 4 + 3]
            ]);
        }
        let eqimg = equalizeLightness(rawImgData);
        console.log(eqimg)
        contextData.data.set(eqimg);
        context.putImageData(contextData, 0, 0); 
        // let hist = [];
        // for (let i in lightIdxs) {
        //     hist.push({name: i, value: lightIdxs[i].length / rawImgData.length})
        // }
        
        // createHistogram('#old', hist, "steelblue", 500, 1200)
        console.log("light Indexes")
        console.log(lightIdxs)
        document.getElementById('stop').addEventListener('click', function() {
            if (animate) {
                animate = false;
                console.log("stop");
                setTimeout(function() {
                    console.log("stopping")
                    reverseCanvas(lightIdxs, context, cwidth, cheight);
                },
                gradientSize * timestep * 3);
            }
        });
        document.getElementById('start').addEventListener('click', function() {
            if (!animate) {
                //make so max does not overflow
                drawTheThing(0, gradOffset ? gradOffset : gradientSize, lightIdxs, cwidth, cheight, context);
                animate = true;
            }     
        });
    });
    getLightnessHistogram(rawImgData, (hst) => {
        createHistogram('svg', hst, "steelblue", 500, 1200)
    })  
}
img.src = 'img/me.jpg';

function getLightnessHistogram(rawImgData, next) {
    let binCount = 101,
    max = 100,
    min = 0,
    range = max - min,
    binSize = range / binCount;

    let hist = histogram(rawImgData, (rgbColor) => {
        let Y = relativeLuminence(linearize8Bit(rgbColor));
        return Math.round((lightness(Y) / 100) * (max));
    },
    binCount,
    min,
    max,
    true
    );
    
    next(hist.map((p, i) => {
        return {name: (i * binSize) + min, value : p}
    }));

    // let http = new XMLHttpRequest();
    // let url = "/lhist";
    // http.open('POST', url, true);
    // http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    // http.onreadystatechange = function() {
    //     if (http.readyState == 4 && http.status == 200) {
    //         next(JSON.parse(http.responseText));
    //     }
    // }
    // http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}

function equalizeLightness(rawImgData) {
    return equalizeImgLight(rawImgData, 0, 255);
}
function reverseCanvas(original, context, cwidth, cheight) {
    let imageData = context.getImageData(0,0, cwidth, cheight);
    for (let m = 0; m < lValRange + 1; m++) {
        setTimeout(function() {
            let L = lValRange - m;
            if (original[L]) {
                original[L].forEach( p => {
                    for (let c = 1; c < 5; c++) {
                        imageData.data[p[0] + c - 1] = p[c];
                    }
                });
            }
            context.putImageData(imageData, 0 , 0);
        },
       m * timestep);
    }
    console.log(imageData.data);
}
function updateLPixels(start, y, lightIdxs, grad, imageData, context, flip) {
    let L;
    if (flip) {
        L = y + start;
    } else {
        L = lValRange - (y + start);
    }
    if (lightIdxs[L]) {
        lightIdxs[L].forEach( p => {
            for (let c = 0; c < 4; c++) {
                imageData.data[p + c] = grad[y * 4 + c];
            }
        });
    }
    context.putImageData(imageData, 0, 0);
}

function drawTheThing(min, max, lightIdxs, cwidth, cheight, context) {
    getRandomLightGradient(min, max, function(grad) {
        let imageData = context.getImageData(0,0, cwidth, cheight);
        for (let y = 0; y < max - min; y++) {
            setTimeout(function() {
                updateLPixels(min, y, lightIdxs, grad, imageData, context, odd);
            }, timestep * y)
        }
    
        if (animate) {
            setTimeout(function() {
                let nxtMin = max;
                let nxtMax = nxtMin + gradientSize;
                if (nxtMin >= lValRange) {
                    nxtMin = 0;
                    nxtMax = gradOffset === 0 ? gradientSize : nxtMin + gradOffset;
                    odd = !odd;
                }
                if (nxtMax > lValRange) {
                    nxtMax = lValRange;
                }
                drawTheThing(nxtMin, nxtMax, lightIdxs, cwidth, cheight, context)
            },
                timestep * (max - min)
            );    
        }
    });    
}
function filterImage(route, rawImgData, imageWidth, next) {
    let http = new XMLHttpRequest();
    let url = route;
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let filtrdImgData = new Uint8ClampedArray(unclampedData);
            next(filtrdImgData);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}
function convertImagetoASCII(rawImgData, imageWidth, next) {
    let http = new XMLHttpRequest();
    let url = "/ascii";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            next(http.responseText);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}
function convertImagetoGrayscale(rawImgData, imageWidth, next) {
    filterImage('/gray', rawImgData, imageWidth, next);
}
function convertImageToRand(rawImgData, imageWidth, next) {
    filterImage('/randimg', rawImgData, imageWidth, next);
}
function convertImageToRandomColorLayers(rawImgData, imageWidth, next) {
    filterImage('/randlayer', rawImgData, imageWidth, next);
}
function convertImgToRandBrightGradient(rawImgData, imageWidth, next) {
    filterImage('/randgradient', rawImgData, imageWidth, next);
}
function getLightnessValuesofImg(rawImgData, imageWidth, next) {
    filterImage('/light', rawImgData, imageWidth, next);
}

function getRandomLightGradient(Lstart, Lend, next) {
    let http = new XMLHttpRequest();
    let url = "/randlgrad";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let grad = new Uint8ClampedArray(unclampedData);
            next(grad);
        }
    }
    http.send('start=' + Lstart + "&end=" + Lend);
}
function getRandomColorsOfLight(x, L, next) {
    let http = new XMLHttpRequest();
    let url = "/rand";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let randImgData = new ImageData( new Uint8ClampedArray(unclampedData), 300);
            next(randImgData);
        }
    }
    http.send('pixels=' + x + '&' + 'light=' + L);
}

function createHistogram(selector, data, color, height, width) {
    let svg = d3.select(selector);
    let margin = ({top: 30, right: 0, bottom: 30, left: 40});
    let yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(null, data.format))
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(data.y))

    let xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(i => data[i].name).tickSizeOuter(0))

    let x = d3.scaleBand()
    .domain(d3.range(data.length))
    .range([margin.left, width - margin.right])
    .padding(0.1)

    let y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top])

    

    svg.append('g').attr("fill", color)
        .selectAll("rect")
        .data(data)
        .join("rect")
            .attr("x", (d, i) => x(i))
            .attr("y", d => y(d.value))
            .attr("height", d => y(0) - y(d.value))
            .attr("width", x.bandwidth());

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);
}

},{"./ImageReader.js":1,"./cie":2,"./imgProcessing":3,"./rgb":6,"./srgb":7}],5:[function(require,module,exports){
//Calculates and returns the inverse of a square matrix. If matrix is not valid or not square, returns false.
function invert(square) {
    let sDim = dim(square);
    if (!(sDim && sDim.rows === sDim.cols)) {
        throw new err("Given Matrix must be square.")
    } 
    
    let I = [];
    let C = [];
    for(let i = 0; i < sDim.rows; i++) {
        I.push([]);
        C.push([]);
        for (let m = 0; m < sDim.rows; m++) {
            I[i][m] = i === m ? 1 : 0;
            C[i][m] = square[i][m];
        }
    }

    let diag;
    for (let r = 0; r < sDim.rows; r++) {
        diag = C[r][r];
        if (diag === 0) {
            for (let s = r + 1; s < sDim.rows; s++) {
                if (C[s][r] !== 0) {
                    let temp = C[r];
                    C[r] = C[s];
                    C[s] = temp;
                    temp = I[r];
                    I[r] = I[s];
                    I[s] = temp;
                }
            }
            diag = C[r][r];
            if (diag === 0) {
                return false;
            }
        }

        for (let i = 0; i < sDim.rows; i++) {
            C[r][i] = C[r][i] / diag;
            I[r][i] = I[r][i] / diag;
        }
        for (let g = 0; g < sDim.rows; g++) {
            if (g === r) {
                continue;
            }

            let h = C[g][r];

            for (let j = 0; j < sDim.rows; j++) {
                C[g][j] -= h * C[r][j];
                I[g][j] -= h * I[r][j];
            }
        }
    }

    return I;
}

//Returns the rows and columns of given matrix. If matrix is not valid, returns null.
function dim(matrix) {
    if (Array.isArray(matrix) && matrix.length > 0) {
        let rows = matrix.length;
        if (matrix[0] === undefined || matrix[0] === null) {
            return null;
        } else if (!Array.isArray(matrix[0])) {
            return { "rows": rows, "cols" : 1 }
        }
        let cols = matrix[0].length;
        for (let r = 0; r < matrix.length; r++) {
            if (Array.isArray(matrix[r])) {
                if (matrix[r].length !== cols) {
                    return null;
                }
            } else {
                return null;
            }
        }
        return {rows, cols}
    }
    return null;
}


function determinant(matrix) {
    let dimM = dim(matrix);
    if (dimM && dimM.rows !== dimM.cols) {
        return null;
    }
    let det = null;

    if (dimM.rows === 2) {
        det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    } else {
        det = 0;
        let even = false;
        for(let c = 0; c < dimM.rows; c++) {
            let scalar = matrix[0][c];
            let subMatrix = [];
            for (let r = 1; r < dimM.rows; r++) {
                let smRow = [];
                for (let col = 0; col < dimM.rows; col++) {
                    if (col !== c) {
                        smRow.push(matrix[r][col]);
                    }
                }
                subMatrix.push(smRow);
            }
            
            let subDet = determinant(subMatrix);
            if (even) {
                det -= scalar * subDet;
            } else {
                det += scalar * subDet;
            }
            even = !even;
        }
    }
    return det;
}

//Given two vectors of length n, returns the dot-product of their entries
function dot(A, B) {
    if (!(A && B) || A.length === 0 || A.length !== B.length) {
        throw new Error("Vectors A and B must be Arrays of the same length.");
    }
    let product = 0;
    for (let i = 0; i < A.length; i++) {
        product += A[i] * B[i];
    }
    return product;
}

function multiply(A, B) {
    let dimA = dim(A);
    let dimB = dim(B);
    if (!(dimA && dimB)) {
        console.log(dimA);
        console.log(dimB);
        throw new Error("A and B must be valid matrices.");

    }
    if (dimA.cols !== dimB.rows) {
        throw new Error(
            "The column count of Matrix A (" + dimA.cols +
            ") and the row count of B (" + dimB.rows + ") must match."
        );
    }

    let C = []; 
    //Set up C to be a dimA.rows x dimB.cols matrix
    //only perform if product is not a vector
    if (dimB.cols > 1) {
        for (let s = 0; s < dimA.rows; s++) {
            C.push([]);
        }
    }

    for (let i = 0; i < dimA.rows; i++) {
        for (let j = 0; j < dimB.cols; j++) {
            let sum = 0;
            for (let k = 0; k < dimA.cols; k++) {
                let av, bv;
                av = dimA.cols === 1 ? A[i] : A[i][k];
                bv = dimB.cols === 1 ? B[k] : B[k][j];
                
                sum = sum + av * bv;
            }
            if (dimB.cols > 1) {
                C[i][j] = sum;
            } else {
                C[i] = sum;
            }          
        }
    }
    return C;
}

module.exports = {
    dim,
    invert,
    multiply,
    dot
}
},{}],6:[function(require,module,exports){

const { invert, dot } = require('./lin.js');

const redLevel = (rgbColor) => rgbColor[0];
const greenLevel = (rgbColor) => rgbColor[1];
const blueLevel = (rgbColor) => rgbColor[2];

let rgb = module.exports

rgb.rgba = {
    "color" : (r, g, b, a) => [r, g, b, a ? a : 255],
    redLevel,
    greenLevel,
    blueLevel,
    "alphaLevel" : (rgbaColor) => rgbaColor[3]
} 

rgb.rgb = {
    color : (r, g, b) => [r, g, b],
    redLevel,
    greenLevel,
    blueLevel
} 

rgb.averageChannelLevel = (rgbColor) => (rgbColor[0] + rgbColor[1] + rgbColor[2]) / 3;
rgb.XYZconversionMatrix = (primaryCoords, XYZWhite) => {
    let primXYZ = [
        [primaryCoords[0][0],primaryCoords[1][0], primaryCoords[2][0]],
        [primaryCoords[0][1],primaryCoords[1][1], primaryCoords[2][1]],
        [primaryCoords[0][2],primaryCoords[1][2], primaryCoords[2][2]],
    ]

    let iPXYZ = invert(primXYZ);
    let XYZScalars = multiply(iPXYZ, XYZWhite);
    scaleMatrix = [[XYZScalars[0], 0, 0], [0, XYZScalars[1], 0], [0, 0, XYZScalars[2]]];
    return multiply(primXYZ, scaleMatrix);
}

function rgbWhiteToXYZ(whiteCoords) {
    whiteY = greenLevel(whiteCoords);
    return whiteCoords.map( cc => cc / whiteY);
}

rgb.createRGBRelativeLuminance = (XYZconversionMatrix) =>
    rgb => dot([redLevel(rgb), greenLevel(rgb), blueLevel(rgb)], XYZconversionMatrix[1]);

},{"./lin.js":5}],7:[function(require,module,exports){
const { is8BitInt, inUnitInterval } = require('./valuetype.js');
const { multiply } = require('./lin.js');
const { createRGBRelativeLuminance } = require('./rgb.js');

//This matrix is used to convert linearized sRGB color to its corresponding color
//in the XYZ colorspace. The XYZ color is the matrix product of the 
//linearized sRGB color vector and the conversion matrix. 
const sRGBtoXYZMatrix = [
    [0.41239079926595923, 0.35758433938387785, 0.1804807884018343],
    [0.21263900587151022, 0.7151686787677557, 0.07219231536073371],
    [0.019330818715591835,0.11919477979462596, 0.9505321522496606]
]

const XYZtosRGBMatrix = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660,  1.8760108,  0.0415560],
    [0.0556434, -0.2040259,  1.0572252]
]

//Coordinates of sRGB red green and blue primary colors in linearized 3D space. 
const primaryChromaticityCoordinates = {
    matrix : [
        [0.64, 0.33, 0.03],
        [0.30, 0.60, 0.10],
        [0.15, 0.06, 0.79]
    ],
    obj : {
        r : {
            x : 0.64,
            y : 0.33,
            z : 0.03
        },
        g : {
            x : 0.30,
            y : 0.60,
            z : 0.10
        },
        b : {
            x : 0.15,
            y : 0.06,
            z : 0.79
        }
    }
}

//Chromaticity Coordinates of sRGB reference white (CIE Illuminant D65) in linear 3D space.
const whitepointChroma = {
    matrix : [0.3127, 0.3290, 0.3583],
    obj : {
        x : 0.3127,
        y : 0.3290,
        z : 0.3583
    }
}

//Given a linearized sRGB color, calculates the Relative Luminence of the color. 
//Relative Luminence is the Y stimulus in the XYZ colorspace.
const relativeLuminence = createRGBRelativeLuminance(sRGBtoXYZMatrix);

//Linearizes sRGB gamma-encoded color channel value in unit interval by applying
// sRGGB gamma decoding step-function. Value returned is in unit interval. 
function decodeGammaUI(stimulus) {
    if (stimulus < 0.04045) {
        return stimulus / 12.92;
    } else {
        return Math.pow(((stimulus + 0.055) / 1.055), 2.4);
    }
}

//Linearizes sRGB gamma-encoded  8bit color channel value by applying
// sRGB gamma decoding step function. Value returned is in unit interval.
function decodeGamma8Bit(colorChannel) {
    let uiCC = colorChannel / 255;
    return decodeGammaUI(uiCC);
}

//From linear stimulus in unit Interval applies sRGB piecewise gamma encoding function .
// Returned value is in Unit Interval.
function encodeGammaUI(linStim) {
    if (linStim < 0.00313080495) {
        return linStim * 12.92;
    } else {
        return Math.pow(linStim, 1 / 2.4) * 1.055 - 0.055;
    }
}

//From linear stimulus in unit interval applies sRGB piecewise gamma encoding function .
// Returned value is 8Bit Integer.
function encodeGamma8Bit(linStim) {
    let uiCC = encodeGammaUI(linStim);
    return Math.round(uiCC * 255); 
}

//Converts sRGB color to XYZ colorspace.
function sRGBtoXYZ(rgb) {
    let linRGB = linearize8Bit(rgb);
    return multiply(sRGBtoXYZMatrix, linRGB);
}

function linearize8Bit(rgb) {
    return rgb.map(cc => decodeGamma8Bit(cc));
}

function delinearize8Bit(rgb) {
    return rgb.map(cc => encodeGamma8Bit(cc));
}

function XYZtosRGB(xyz) {
    let linRGB = multiply(XYZtosRGBMatrix, xyz);
    return delinearize8Bit(linRGB);
}
//Not a proper luma conversion for sRGB, 
//relies on primaries and white point in NTSC color spaces like YIQ an YUV
// function lumaCCIR601(rPrime, gPrime, bPrime) {
//     let YPrime = 0.299 * rPrime + 0.587 * gPrime + 0.114 * bPrime;
//     return YPrime;
// }

//Again not a proper luma function for sRGB, output should be luma values between 16 and 235
//This function produces values from 0 to 255 which must be clamped.
// function lumaBT709(rPrime, gPrime, bPrime) {
//     let luma = 0.2126 * rPrime + 0.7152 * gPrime + 0.0722 * bPrime;
//     return luma;
// }

module.exports = {
    decodeGammaUI,
    decodeGamma8Bit,
    encodeGammaUI,
    encodeGamma8Bit,
    linearize8Bit,
    'primaryChroma' : primaryChromaticityCoordinates.matrix,
    'whitepointChroma' : whitepointChroma.matrix,
    relativeLuminence,
    sRGBtoXYZ,
    XYZtosRGB
}

},{"./lin.js":5,"./rgb.js":6,"./valuetype.js":8}],8:[function(require,module,exports){
function is8BitInt(value) {
    return (!isNaN(channelValue)
        && Number.isInteger(+channelValue)
        && channelValue < 256
        && channelValue >= 0);
}

function inUnitInterval(value) {
    return (!isNaN(value)
    && value >= 0.0 
    && value <= 1.0)
}

function inNormalUI(value) {
    return value >= 0 && value <= 100;
}

function clampTo(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

module.exports = {
    is8BitInt,
    inUnitInterval,
    inNormalUI,
    clampTo
}
},{}]},{},[4]);
