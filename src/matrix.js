'use strict'
const { Tensor } = require('./tensor.js');

const Matrix = (function() {
    function Matrix(data, rows, cols) {
        Tensor.call(this, [this.rows, this.cols], data);
    }
    const $M = Matrix.prototype;

    return Matrix;
})();

module.exports = { Matrix };