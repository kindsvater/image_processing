const path = require('path');
const bodyParser = require('body-parser');
const imgController = require('./imgController.js');

module.exports = function(app) {
    app.post('/ascii', 
        bodyParser.urlencoded({ limit: '50mb', extended: true}),
        (req, res) => {
            //check if valid blah blac
            let imageData = req.body.imageData.split(',');
            let textImg = imgController.rawImgtoASCII(imageData, req.body.imageWidth, 2);
            res.send(textImg);
        }
    );
    app.post('/gray', 
        bodyParser.urlencoded({ limit: '50mb', extended: true}),
        (req, res) => {
            //check if valid blah blac
            let imageData = req.body.imageData.split(',');
            let grayImg = imgController.rawImgtoGrayscale(imageData);
            let grayVector = grayImg.flat();
            res.send(grayVector);
        }
    );
    app.post('/randimg',
    bodyParser.urlencoded({limit: '50mb', extended: true}),
    (req, res) => {
        let imageData = req.body.imageData.split(',');
        let randImg = imgController.rawImgtoRand(imageData);
        let randVector = randImg.flat();
        res.send(randVector);
    });
    app.post('/rand',
    bodyParser.urlencoded({extended: true}),
    (req, res) => {
        let pixelCount = req.body.pixels;
        let light = req.body.light;
        let colors = imgController.genXColorsOfLight(pixelCount, light);
        let colorVector = colors.flat();
        res.send(colorVector);
    });
    app.post('/randlayer',
    bodyParser.urlencoded({limit: '50mb', extended: true}),
    (req, res) => {
        let imageData = req.body.imageData.split(',');
        let randImg = imgController.imgtoRandLayer(imageData);
        let randVector = randImg.flat();
        res.send(randVector);
    });
    app.post('/randgradient',
    bodyParser.urlencoded({limit: '50mb', extended: true}),
    (req, res) => {
        let imageData = req.body.imageData.split(',');
        let randImg = imgController.imgtoRandLightGradient(imageData, 10);
        let randVector = randImg.flat();
        res.send(randVector);
    });
    app.post('/light',
    bodyParser.urlencoded({limit: '50mb', extended: true}),
    (req, res) => {
        let imageData = req.body.imageData.split(',');
        let lightness = imgController.imgtoLight(imageData, true);
        res.send(lightness);
    });
    app.post('/randlgrad',
    bodyParser.urlencoded({limit: '50mb', extended: true}),
    (req, res) => {
        let start = req.body.start;
        let end = req.body.end;
        let grad = imgController.randLGrad(start, end);
        res.send(grad.flat());
    });
    app.all("*", (req, res, next) => {
        res.sendFile(path.resolve("public/index.html"));
    });
}