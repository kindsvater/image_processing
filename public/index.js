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
    
    convertImagetoASCII(rawImgData, cwidth, (textImage) => {
        document.getElementById('result').innerHTML = textImage;
    });

    convertImagetoGrayscale(rawImgData, cwidth, (gsImageData) => {
        contextData.data.set(gsImageData);
        context.putImageData(contextData, 0, 0); 
    });

    
}
img.src = 'me.jpg';



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
            let gsImgData = new Uint8ClampedArray(unclampedData);
            next(gsImgData);
        }
    }
    http.send('imageWidth=' + imageWidth + '&' + 'imageData=' + rawImgData);
}