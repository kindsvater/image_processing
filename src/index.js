const { ImageReader } = require('./ImageReader.js');
const { histogram, cdf, equalizeImgLight, realFFT2DImage } = require('./imageProcessing');
const { RGB, RGBA } = require('./rgb');
const { relativeLuminence, linearize8Bit } = require('./srgb');
const { lightness } = require('./cie');
const { gaussGray } = require('./randGen');
const { zeros, round } = require('./valuetype');
const { randIntArray } = require('./randGen');
const { extendRealFreqDomain, FFT, inverseFFT } = require('./signal');
const { impulse, psf } = require('./filter');

// function checkFFT() {
//     let r = randIntArray(0, 10, 32);
//     let i = zeros(32);
//     console.log(r);
//     console.log(i);
//     FFT(r, i);
//     console.log(r);
//     console.log(i);
//     inverseFFT(r, i);
//     console.log(r);
//     console.log(i);
// }

let img = new Image();
let animate = false;
let odd = true;
const lValRange = 255;
const gradientSize = 25;
const gradOffset = 15;
const timestep = 30;
img.src = 'img/flowers.jpg';
img.onload = function() {
    //checkFFT();
    console.log(psf.gauss(5, 5, 1));
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
    let read = new ImageReader(rawImgData, cwidth, true);
    // console.log(read.getRedChannel());
    // console.log(read.widthRes);
    // console.log(read.heightRes);
    // console.log(read.widthRes * read.heightRes * 4);
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
    let grays = gaussGray((10 * 10), 32);
    console.log(grays.length)
    let hist = [];
    for (let m = 0; m < 256; m++) {
        hist[m] = 0;
    }
    for (let g = 0; g < grays.length; g++) {
        hist[grays[g]] += 1;
    }

    let data = [];
    for (let i = 0; i < hist.length; i++) {
        data.push({name: i, value: hist[i] / grays.length})
    }
    displayHistogram('#old', data, "steelblue", 500, 1200)
    let grayImg = [];
    for (let g = 0; g < grays.length; g++) {
        grayImg.push(grays[g], grays[g], grays[g], 255);
    }
    console.log("Fourier");
    realFFT2DImage(grayImg, 10, 4, true);
    console.log(grayImg);
    contextData.data.set(new Uint8ClampedArray(grayImg));
    context.putImageData(contextData, 0, 0); 

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
        // let eqimg = equalizeLightness(rawImgData);
        // console.log(eqimg)
        // contextData.data.set(eqimg);
        // context.putImageData(contextData, 0, 0); 
 
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
        displayHistogram('svg', hst, "steelblue", 500, 1200)
    })  
}


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

function displayHistogram(selector, data, color, height, width) {
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
