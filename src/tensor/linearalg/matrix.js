'use strict'
const { Tensor } = require('../tensor.js');
const { flatten, identity } = require('../../utility/array_util.js');

const Matrix = (function() {
    function Matrix(data, rows, cols) {
        Tensor.call(this, [rows, cols], data);
    }
    Matrix.prototype = Object.create(Tensor.prototype);
    Matrix.prototype.constructor = Matrix;
    const $M = Matrix.prototype;

    $M.rows = function() {
        return this.shape[0];
    }
    $M.cols = function() {
        return this.shape[1];
    }
    $M.isSquare = function() {
        return this.rows() === this.cols();
    }
    //Calculates and returns the inverse of a square matrix. If matrix is not valid or not square, returns false.
    $M.invert = function() {
        if (!this.isSquare()) {
            throw new err(`Cannot invert non-square matrix of dimensions ${this.rows()},${this.cols}`);
        }
        let rows = this.rows();
        let ident = identity(rows);
        let copy = this.toNestedArray();
        let diag;

        for (let r = 0; r < rows; r++) {
            diag = copy[r][r];
            if (diag === 0) {
                for (let s = r + 1; s < rows; s++) {
                    if (copy[s][r] !== 0) {
                        let temp = copy[r];
                        copy[r] = copy[s];
                        copy[s] = temp;
                        temp = ident[r];
                        ident[r] = ident[s];
                        ident[s] = temp;
                    }
                }
                diag = copy[r][r];
                if (diag === 0) {
                    return false;
                }
            }

            for (let i = 0; i < rows; i++) {
                copy[r][i] = copy[r][i] / diag;
                ident[r][i] = ident[r][i] / diag;
            }
            for (let g = 0; g < rows; g++) {
                if (g === r) {
                    continue;
                }

                let h = copy[g][r];

                for (let j = 0; j < rows; j++) {
                    copy[g][j] -= h * copy[r][j];
                    ident[g][j] -= h * ident[r][j];
                }
            }
        }

        return new Matrix(flatten(ident), rows, rows);
    }

    $M.determinant = function() {
        let det = null;
        let matrix = this.toNestedArray();
        if (!this.isSquare()) {
            return det;
        }
    
        if (this.rows() === 2) {
            det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
        } else {
            det = 0;
            let even = false;
            for(let c = 0; c < this.rows(); c++) {
                let scalar = matrix[0][c];
                let subMatrix = [];
                for (let r = 1; r < this.rows(); r++) {
                    let smRow = [];
                    for (let col = 0; col < this.rows(); col++) {
                        if (col !== c) {
                            smRow.push(matrix[r][col]);
                        }
                    }
                    subMatrix.push(smRow);
                }
                
                let subDet = this.determinant(subMatrix);
                if (even) {
                    det -= scalar * subDet;
                } else {
                    det += scalar * subDet;
                }
                even = !even;
            }
        }
        return det;
    }

    $M.multiply = function(B) {
        if (typeof B === Number) {
            this.forEachVal([[],[]], (val, di) => {
                this.data[di] = val * B;
            });
            return this;
        } else if (typeof B !== Tensor) {
            throw new TypeError(`Expected Argument B to be a Scalar, Vector, or Matrix, received ${typeof B} instead.`);
        }
        if (this.shape[1] !== B.shape[0]) {
            throw new Error(
                `The column count of Matrix A (${this.shape[1]}) and the row count of B (${B.shape[0]}) must match.`
            );
        }
        let C;
        let CShape;
        if (B.rank === 1) {
            CShape = [this.shape[0]];
            C = new Tensor(CShape, zeros(CShape[0], true));
            for (let i = 0; i < this.rows(); i++) {
                let sum = 0;
                for (let k = 0; k < this.cols(); k++) {
                    sum += this.getExplicit([i, k]) + B.getExplicit([k]);
                }
                C.set([i], sum);
            }
        } else if (B.rank === 2) {
            CShape = [this.shape[0], B.shape[1]];
            C = new Matrix(zeros([CShape, true]), CShape[0], CShape[1]);
            for (let i = 0; i < this.rows(); i++) {
                for (let j = 0; j < B.shape[1]; j++) {
                    let sum = 0;
                    for (let k = 0; k < this.cols(); k++) {
                        sum += this.getExplicit([i, k]) + B.getExplicit([k, j]);
                    }
                    C.set([i, j], sum);
                }
            }
        }
        return C;
    }

    return Matrix;
})();

module.exports = { Matrix };