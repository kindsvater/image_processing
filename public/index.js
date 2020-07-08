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
    console.log("image pixels = " + rawImgData.length);
    console.log(rawImgData)
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

        console.log(lightIdxs)
        document.getElementById('stop').addEventListener('click', function() {
            if (animate) {
                animate = false;
                console.log("stop");
                setTimeout(function() {
                    console.log("stopping")
                    reverseCanvas(original, context, cwidth, cheight);
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
    })   
}
img.src = 'img/glenmount.jpg';

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

