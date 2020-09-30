function Padding(before, after) {
    if (!isArray(before)) throw new Error(
        `Expected argument 'before' to be an Array. Received ${typeof before} instead.`
    );
    if (!isArray(after)) throw new Error(
        `Expected argument 'after' to be an Array. Received ${typeof after} instead.`
    );
    before.forEach( value => {
        if (!Number.isInteger(value)) throw new Error(
            `'before' padding data contains value ${value}.
            Before must contain only non-negative integers.`
        );
    });
    after.forEach( value => {
        if (!Number.isInteger(value)) throw new Error(
            `'after' padding data contains value ${value}.
            After must contain only non-negative integers.`
        );
    });
    this.before = before;
    this.after = after;
}

module.exports = {
    Padding
}