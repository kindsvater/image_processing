'use strict'
const { shallowEquals } = require('../../utility/type_util.js');
const { zeros } = require('../../utility/array_util/init.js');
const { Tensor } = require('../tensor.js');

const ComplexSignal = (function() {
    function ComplexSignal(real, imag=null) {
        if (imag) {
            if (!shallowEquals(real.shape, imag.shape)) {
                throw new Error(
                    `The shapes of the real and imaginary tensors do not match.` +
                    `\n[${real.shape}]] !== [${imag.shape}]`
                );
            }
            this.imag = imag;
        } else {
            this.imag = new Tensor(real.shape, zeros(real.shape, true));
        }
        this.real = real;
        this.shape = real.shape;
        this.size = real.size;
    }
    const $CS = ComplexSignal.prototype;
    
    $CS.getReal = function(index) {
        return this.real.getExplicit(index);
    }

    $CS.getImag = function(index) {
        return this.imag.getExplicit(index);
    }
    
    $CS.setReal = function(index, value) {
        return this.real.setExplicit(index, value);
    }

    $CS.setImag = function(index, value) {
        return this.imag.setExplicit(index, value);
    }

    return ComplexSignal;
})();

module.exports = {
    ComplexSignal
}