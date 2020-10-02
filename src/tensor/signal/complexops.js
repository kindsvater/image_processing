let { ComplexSignal } = require('./complexsignal.js');

// function multiply(X, H, chans, inPlace=false) {
//     //check shapes
//     let temp;
//     let hi;
//     let xi;
//     let result = inPlace 
//         ? X
//         : new ComplexSignal(new Tensor(X.shape, X.real.data.slice(0)));

//     for (let i = 0; i < X.shape[0]; i++) {
//         for (let j = 0; j < H.shape[1]; j++) {
//             for (let c = 0; c < chans; c++) {
//                 hi = [i, j];
//                 xi = [i, j, c];
//                 temp = (X.getReal(xi) * H.getReal(hi)) - (X.getImag(xi) * H.getImag(hi));
//                 result.setImag(
//                     xi,
//                     (X.getImag(xi) * H.getReal(hi)) + (X.getReal(xi) * H.getImag(hi))
//                 );
//                 result.setReal(xi, temp);
//             }
//         }
//     }

//     return result;
// }

//todo: rework for non-image signals
function multiply(X, H, chans, inPlace=false) {
    let temp;
    let hi;
    let xi = 0;
    
    for (hi = 0; hi < H.real.data.length; hi++) {
        for (let c = 0; c < 3; c++) {
            temp = X.real.data[xi] * H.real.data[hi] - X.imag.data[xi] * H.imag.data[hi];
            X.imag.data[xi] = X.imag.data[xi] * H.real.data[hi] + X.real.data[xi] * H.imag.data[hi];
            X.real.data[xi] = temp;
            xi++;
        }  
        xi++;
    }

    return X;
}

module.exports = {
    multiply
}