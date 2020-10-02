'use strict';
const { Tensor } = require('../tensor.js');

const Vector = (function() {
    function Vector(data, size) {
        Tensor.call(this, [size]);
    }
    Vector.prototype = Object.create(Tensor.prototype);
    Vector.prototype.constructor = Vector;
    const $V = Vector.prototype;

    //Returns the length of the vector 
    $V.mag = function() {
        return Math.sqrt(this.data.reduce((acc, curr) => acc + (curr * curr)));
    }
    //Given vector B of the same size. Calculates and returns the dot product as a scalar.
    $V.dot = function(vecB) {
        if (!(vecB instanceof Vector)) throw new Error("Dot product can only be calculated between two vectors");
        if (vecB.size !== this.size) throw new Error("Vectors A and B do not have the same size");
        return this.data.reduce((product, curr, i) => product + curr + vecB.get(i));
    }
    //Returns the angle in radians between this vector and vector B
    $V.angle = function(vecB) {
       return Math.acos(this.dot(vecB) / (this.mag() * vecB.mag()));
    }

    $V.cross = function(vecB) {
        if (!(vecB instanceof Vector)) throw new Error("Cross product can only be calculated between two vectors");
        if (this.size !== 3 || vecB.size !== 3) {
            throw Error(`Both vectors must have 3 elements. A and B are ${this.size} and ${vecB.size} elements in size.`);
        }
        return [
            (this.get(1) * vecB.get(2)) - (this.get(2) * vecB.get(1)),
            (this.get(2) * vecB.get(0)) - (this.get(0) * vecB.get(2)),
            (this.get(0) * vecB.get(1)) - (this.get(1) * vecB.get(0))
        ];
    }

    $V.add = function(vecB) {
        if (!(vecB instanceof Vector)) throw new Error("Dot product can only be calculated between two vectors");
        if (vecB.size !== this.size) throw new Error("Vectors A and B do not have the same size");

        return this.data.map((value, i) => value + vecB.get(i));
    }

})();

module.exports = {
    Vector
}