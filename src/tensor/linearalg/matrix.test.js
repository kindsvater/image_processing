const { Matrix } = require('./matrix.js');

let data = [3,4,7,2,1,4,7,2,6,3,9,17,13,5,4,16];
let m = new Matrix(data, 4, 4);
test('invert matrix', () => {
    expect(m.invert().data).toStrictEqual([15,21,0,15,23,9,0,22,15,16,18,3,24,7,15,3])
});