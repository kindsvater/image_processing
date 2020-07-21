//Calculates and returns the inverse of a square matrix. If matrix is not valid or not square, returns false.
function invert(square) {
    let sDim = dim(square);
    if (!(sDim && sDim.rows === sDim.cols)) {
        throw new err("Given Matrix must be square.")
    } 
    
    let I = [];
    let C = [];
    for(let i = 0; i < sDim.rows; i++) {
        I.push([]);
        C.push([]);
        for (let m = 0; m < sDim.rows; m++) {
            I[i][m] = i === m ? 1 : 0;
            C[i][m] = square[i][m];
        }
    }

    let diag;
    for (let r = 0; r < sDim.rows; r++) {
        diag = C[r][r];
        if (diag === 0) {
            for (let s = r + 1; s < sDim.rows; s++) {
                if (C[s][r] !== 0) {
                    let temp = C[r];
                    C[r] = C[s];
                    C[s] = temp;
                    temp = I[r];
                    I[r] = I[s];
                    I[s] = temp;
                }
            }
            diag = C[r][r];
            if (diag === 0) {
                return false;
            }
        }

        for (let i = 0; i < sDim.rows; i++) {
            C[r][i] = C[r][i] / diag;
            I[r][i] = I[r][i] / diag;
        }
        for (let g = 0; g < sDim.rows; g++) {
            if (g === r) {
                continue;
            }

            let h = C[g][r];

            for (let j = 0; j < sDim.rows; j++) {
                C[g][j] -= h * C[r][j];
                I[g][j] -= h * I[r][j];
            }
        }
    }

    return I;
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
        let even = false;
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
    if (!(A && B) || A.length === 0 || A.length !== B.length) {
        throw new Error("Vectors A and B must be Arrays of the same length.");
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

    let C = []; 
    //Set up C to be a dimA.rows x dimB.cols matrix
    //only perform if product is not a vector
    if (dimB.cols > 1) {
        for (let s = 0; s < dimA.rows; s++) {
            C.push([]);
        }
    }

    for (let i = 0; i < dimA.rows; i++) {
        for (let j = 0; j < dimB.cols; j++) {
            let sum = 0;
            for (let k = 0; k < dimA.cols; k++) {
                let av, bv;
                av = dimA.cols === 1 ? A[i] : A[i][k];
                bv = dimB.cols === 1 ? B[k] : B[k][j];
                
                sum = sum + av * bv;
            }
            if (dimB.cols > 1) {
                C[i][j] = sum;
            } else {
                C[i] = sum;
            }          
        }
    }
    return C;
}

module.exports = {
    dim,
    invert,
    multiply,
    dot
}