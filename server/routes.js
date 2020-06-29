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
    app.all("*", (req, res, next) => {
        res.sendFile(path.resolve("public/index.html"));
    });

}