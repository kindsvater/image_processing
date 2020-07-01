let img = new Image();
img.onload = function() {
    let canvas = document.getElementById("manip");
    let context = canvas.getContext('2d');
    let whratio = this.height / this.width;
    
    let cwidth =200;
    let cheight = whratio * cwidth;
    // canvas.width = this.width;
    // canvas.height = this.height;
    canvas.width = cwidth;
    canvas.height = cheight;
    context.drawImage(this, 0, 0, cwidth, cheight);
    let contextData = context.getImageData(0,0, cwidth, cheight);
    let rawImgData = contextData.data;

    console.log("data size " + rawImgData.length);
    
    // convertImagetoASCII(rawImgData, cwidth, (textImage) => {
    //     document.getElementById('result').innerHTML = textImage;
    // });

    // convertImagetoGrayscale(rawImgData, cwidth, (gsImageData) => {
    //     contextData.data.set(gsImageData);
    //     context.putImageData(contextData, 0, 0); 
    // });
    let pixelCount = rawImgData.length / 4;
    // getRandomColorsOfLight(90000, 77, (randImageData) => {
    //     contextData.data.set(randImageData);
    //     context.putImageData(randImageData, 0, 0);
    // });
    convertImagetoRand(rawImgData, cwidth, (rImageData) => {
        console.log(rImageData);
        contextData.data.set(rImageData);
        context.putImageData(contextData, 0, 0); 
    })
    
}
img.src = 'puppy.jpg';



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
    let http = new XMLHttpRequest();
    let url = "/gray";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let gsImgData = new ImageData(new Uint8ClampedArray(unclampedData), imageWidth);
            next(gsImgData);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}

function convertImagetoRand(rawImgData, imageWidth, next) {
    let http = new XMLHttpRequest();
    let url = "/randimg";
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            let unclampedData = http.responseText.slice(1, http.responseText.length - 1).split(",");
            let gsImgData = new Uint8ClampedArray(unclampedData);
            next(gsImgData);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
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