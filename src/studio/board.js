const { createTextElement, addTextToElement, setAttributes, createElementWithAttributes } = require('./utility/dom_util.js');
let ID_COUNTER = 0;
let PIXEL_RATIO = window ? window.devicePixelRatio : 1;

const Board = (function() {
    function Board(window, root) {
        this.root = root;
        this.layers = [];
        this.id = ID_COUNTER++;
    }

    const $B = Board.prototype;

    $B.addLayer = function(type="") {
        let canvas = document.createElement('CANVAS');
        this.layers.push(canvas);
        
    }

});

const Layer = (function() {
    function Layer(width, height) {
        this.width = width ? width | 0;
        this.height = height ? height | 0;

        this.id = ID_COUNTER++;
        this.canvas = createElementWithAttributes(
            'canvas',
            {
                width
            });
    }
})