const path = require('path');

module.exports = function(app) {
    app.all("*", (req, res, next) => {
        res.sendFile(path.resolve("./../public/index.html"));
    });
}