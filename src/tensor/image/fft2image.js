
let { ComplexSignal } = require('../signal/complexsignal.js');
let { fft1DImage } = require('./fftimage');

function fft2DComplexImage(complexImage, chans) {
    //Take FFT of rows and store in real and imaginary images.
    for (let row = 0; row < complexImage.shape[0]; row++) {
        fft1DImage(complexImage, row, false, chans);
    }
    //Take FFT of each column
    for (let col = 0; col < complexImage.shape[1]; col++) {
        fft1DImage(complexImage, col, true, chans);
    }
    return complexImage;
}

/** Calculates Fourier Transform of a 2D image represented as one flat multi-channel array.
 * @param   {Object}  rgbImage Instance of the RGBImage class.
 * @param   {Int}     chans   the number of color channels to perform the transform on.
 * @param   {Boolean} inPlace If true will alter the original image object.
 * @returns {Object} ComplexSignal     A complex representation of the image in the frequency domain.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the freq domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the freq domain.
**/
function fft2DRealImage(rgbImage, chans, inPlace=true) {
    let complexImage = new ComplexSignal(rgbImage);
    return fft2DComplexImage(complexImage, chans);
}

/** Inverse Fourier Transform of a complex 2D image in the frequency domain epresented as two flat multi-channel array components
 * @param   {Object}  complexImage  instantiation of complex image class with real and imaginary components in the frequency domain.
 * @param   {Int}     chans   the number of color channels to perform the inverse FFT on.
 * @returns {Object} ComplexSignal     References to the component arrays that have been altered in place.
 * @returns {Array}  ComplexSignal.real The real component of the signal in the time domain.
 * @returns {Array}  ComplexSignal.imag The imaginary component of the signal in the time domain.
**/
function ifft2DImage(complexImage, chans=3) {
    let normal = complexImage.shape[0] * complexImage.shape[1];
    complexImage.imag.forEachVal([[],[],[0,[],chans - 1]], (amp, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, amp * -1);
    });
    fft2DComplexImage(complexImage, chans);
    //Normalize each value by dividing by pixelWidth * pixelHeight
    complexImage.real.forEachVal([[],[],[0,[],chans - 1]], (value, dataIndex) => {
        complexImage.real.setAtDI(dataIndex, value / normal);
    });
    complexImage.imag.forEachVal([[],[],[0,[],chans - 1]], (value, dataIndex) => {
        complexImage.imag.setAtDI(dataIndex, -1 * value / normal);
    });
    return complexImage;
}

module.exports = {
    fft2DRealImage,
    fft2DComplexImage,
    ifft2DImage
}