let img = new Image();
img.onload = function() {
    let canvas = document.getElementById("manip");
    let context = canvas.getContext('2d');
    canvas.width = this.width;
    canvas.height = this.height;
    context.drawImage(this, 0, 0, this.width, this.height);
    let rawImgData = context.getImageData(0,0, this.width, this.height).data;
    let http = new XMLHttpRequest();
    let url = "/ascii";
    http.open('POST', url, true);

    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            document.getElementById('result').innerHTML = http.responseText;
        }
    }
    http.send('imageWidth=' + this.width + '&' + 'imageData=' + rawImgData);
    
}
img.src = 'kitty.jpeg';
