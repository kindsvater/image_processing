//Calculates and returns the inverse of a square matrix. If matrix is not valid or not square, returns null.
function inverse(square) {
    let sDim = dim(square);
    if (!(sDim && sDim.rows === sDim.cols)) {
        return null;
    } 
    let size = sDim.rows;
    let i = [];
    for (let x = 0; x < size; x++) {
        i.push([]);
    }
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (r === c) {
                i[size - r - 1][size - c - 1] = square[r][c];
            } else {
                i[r][c] = square[r][c] * -1;
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
            if (rows > 1) {
                return null;
            }
            return { rows: 1, cols : 1 }
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

module.exports = {
    dim,
    inverse,
}