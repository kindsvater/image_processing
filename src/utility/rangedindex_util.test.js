const {
    isRangeOperator,
    isEndOperator,
    isIndex,
    isRangedIndex,
    reduceRangedIndex,
    shapeToRangedIndex,
    trimRangedIndex,
    reducedIndexStride,
} = require("./rangedindex_util.js");

test('Recognize Infinity as the End Operator', () => {
    expect(isEndOperator(Infinity)).toBe(true);
});

test('Recognize Empty Array as the Range Operator', () => {
    expect(isRangeOperator([])).toBe(true);
});

test('Does not recognize Non-empty Array as the Range Operator', () => {
    expect(isRangeOperator([1])).toBe(false);
});

test('Recognizes Integer as an index in range', () => {
    expect(isIndex(1, 40, 0)).toBe(true);
});

test('Reject non-integer numbers', () => {
    expect(isIndex(2.33, 40, 0)).toBe(false);
});

test('[1, [Infinity]] is a ranged index', () => {
    expect(isRangedIndex([2, [0, [], Infinity]], [3,3])).toBe(true);
});

test('[2, [0,[],Infinity]] reduces to [[2,3],[0,3]]', () => {
    expect(reduceRangedIndex([2, [0,[],Infinity]], [3,3])).toStrictEqual([[[2,3]],[[0,3]]]);
});

test('Translate shape to ranged index', () => {
    expect(shapeToRangedIndex([4,5,6])).toStrictEqual([[0, [], 5], [0, [], 6], [0, [], 7]]);
});