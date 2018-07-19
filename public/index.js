let makePixel = (r, g, b, a) => [r, g, b, a ? a : 255];
let red_value = pixel => pixel[1]
let green_value = pixel => pixel[2]
let blue_value = pixel => pixel[3]
let rgbLuminosity = pixel => 0.21 * red_value(pixel) + 0.72 * green_value(pixel) + 0.07 * blue_value(pixel)
let rgbAverage = pixel => (red_value(pixel) + green_value(pixel) + blue_value(pixel)) / 3
let rgbLightness = pixel => (Math.max([red_value(pixel), green_value(pixel), blue_value(pixel)]) + Math.min([red_value(pixel), green_value(pixel), blue_value(pixel)])) / 2
const ASCIIByDensity = "`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

let mapToXItems = (arr, x, callback) => {
    for (let i = 0; i < x; i++) {
        callback(arr[i]);
    }
}
let apply = (vector, func) => {
    result = [];
    for (let i = 0; i < vector.length; i++) {
        result.push(func(vector[i]));
    }
    return result;
}

let convertPixelToBrightness = (pixelVector, brightness_formula) => {
    return apply(pixelVector, brightness_formula);
}

let convertBrightnessToASCII = (brightnessVector, ASCIIString) => {
    let maxBrightness = 255;
    return apply(brightnessVector, (brightnessValue) => {
        return ASCIIString.charAt(Math.floor((brightnessValue * ASCIIString.length) / maxBrightness));
    });   
}

let outputASCIIImage = (ASCIIVector, imageWidth, DOMElement) => {
    if (ASCIIVector.length % imageWidth !== 0) {
        return null;
    }
    let output = ""
    for (let i = 0; i < ASCIIVector.length; i++) {
        if ((i + 1) % imageWidth == 0) {
            output += "<br/>";
        }
        for (let r = 1; r <= 2; r++) {
            output += ASCIIVector[i];
        }    
    }
    DOMElement.innerHTML = output;
}
//refactor to use make pixel function
let get1DRGBATuples = (rawImgData) => {
    let RGBATuples = [];
    let tuple = [];
    for (let i = 1; i <= rawImgData.length; i++) {
        tuple.push(rawImgData[i - 1]);
        if (i % 4 == 0) {
            RGBATuples.push(tuple);
            tuple = [];        
        }
    }
    return RGBATuples;
}

let vectorTo2DMatrix = (vector, colSize) => {
    //ensure vector elements can be evenly divided by colSize
    if (vector.length % colSize !== 0) {
        return null;
    }
    matrix = [];
    for (let i = 0; i < vector.length; i += colSize) {
        matrix.push(vector.slice(i, i + colSize))
    }
    return matrix;
}

let img = new Image();
img.onload = function() {
    console.log("hi");
    let canvas = document.getElementById("manip");
    context = canvas.getContext('2d');
    canvas.width = this.width;
    canvas.height = this.height;
    context.drawImage(this, 0, 0, this.width, this.height);
    rawImgData = context.getImageData(0,0, this.width, this.height).data;
    RGBATuples = get1DRGBATuples(rawImgData)
    luminosityVector = convertPixelToBrightness(RGBATuples, rgbLuminosity);
    ASCIIVector = convertBrightnessToASCII(luminosityVector, ASCIIByDensity);
    outputASCIIImage(ASCIIVector, this.width, document.getElementById('result'))
    //mapToXItems(luminosityVector, 10, (item) => {console.log(item)});
    //mapToXItems(RGBATuples, 10, (item) => {console.log(item[1])});
}
img.src = 'kitty.jpeg';
