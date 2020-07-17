//Calculates and returns the inverse of a square matrix. If matrix is not valid or not square, returns null.
function invert(square) {
    let sDim = dim(square);
    if (!(sDim && sDim.rows === sDim.cols)) {
        return null;
    } 
    let det = determinant(square);
    if (det === 0) {
        return false;
    }
    let size = sDim.rows;
    let i = [];
    for (let x = 0; x < size; x++) {
        i.push([]);
    }
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (r === c) {
                i[size - r - 1][size - c - 1] = square[r][c] / det;
            } else {
                i[r][c] = square[r][c] * -1 / det;
            }
        }
    }
    return i;
}

//Returns the rows and columns of given matrix. If matrix is not valid, returns null.
function dim(matrix) {
    if (Array.isArray(matrix) && matrix.length > 0) {
        let rows = matrix.length;
        if (!matrix[0]) {
            return null;
        } else if (!Array.isArray(matrix[0])) {
            return { "rows": rows, "cols" : 1 }
        }
        let cols = matrix[0].length;
        for (let r = 0; r < matrix.length; r++) {
            if (Array.isArray(matrix[r])) {
                if (matrix[r].length !== cols) {
                    return null;
                }
            } else {
                return null;
            }
        }
        return {rows, cols}
    }
    return null;
}

function determinant(matrix) {
    let dimM = dim(matrix);
    if (dimM && dimM.rows !== dimM.cols) {
        return null;
    }
    let det = null;

    if (dimM.rows === 2) {
        det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    } else {
        det = 0;
        let even = true;
        for(let c = 0; c < dimM.rows; c++) {
            let scalar = matrix[0][c];
            let subMatrix = [];
            for (let r = 1; r < dimM.rows; r++) {
                let smRow = [];
                for (let col = 0; col < dimM.rows; col++) {
                    if (col !== c) {
                        smRow.push(matrix[r][col]);
                    }
                }
                subMatrix.push(smRow);
            }
            
            let subDet = determinant(subMatrix);
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

//Given two vectors of length n, returns the dot-product of their entries
function dot(A, B) {
    if (A && B && A.length > 0 && A.length === B.length) {
        return null;
    }
    let product = 0;
    for (let i = 0; i < A.length; i++) {
        product += A[i] * B[i];
    }
    return product;
}

function multiply(A, B) {
    let dimA = dim(A);
    let dimB = dim(B);
    if (!(dimA && dimB)) {
        throw new Error("A and B must be valid matrices.");
    }
    if (dimA.cols !== dimB.rows) {
        throw new Error(
            "The column count of Matrix A (" + dimA.cols +
            ") and the row count of B (" + dimB.rows + ") must match."
        );
    }
    if (dimA.rows = 1)
    let C = []; 
    //Set up C to be a dimA.rows x dimB.cols matrix
    for (let s = 0; s < dimA.rows; s++) {
        C.push([]);
    }

    for (let i = 0; i < dimA.rows; i++) {
        for (let j = 0; j < dimB.cols; j++) {
            let sum = 0;
            for (let k = 0; k < dimA.cols; k++) {
                console.log(i + " " + k + " " + j);
                let av, bv;
                av = dimA.cols === 1 ? A[i] : A[i][k];
                bv = dimB.cols === 1 ? B[k] : B[k][j];
                
                sum = sum + av * bv;
            }
            C[i][j] = sum;
        }
    }
    return C;
}

module.exports = {
    dim,
    invert,
}