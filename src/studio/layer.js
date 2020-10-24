'use strict'

const Layer = (function() {
    function Layer(width, height, x, y) {
        this.id = ID_COUNTER++;
        this.x = 0;
        this.y = 0;
        this.width = width ? width : 0;
        this.height = height ? height : 0;
        this.canvas = createElementWithAttributes(
            'canvas',
            {
                'class' : 'layer',
                'style' : {
                    'display' : 'inline-block'
                },
                
            });
        this.context = canvas.getContext("2d");
    }
    const $L = Layer.prototype;
    
    $L.setPosition = function(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    $L.setDimensions = function(width, height) {
        this.width = width;
        this.height = height;
        setAttributes(
            this.canvas,
            {
                'height' : height * PIXEL_RATIO,
                'width' : width * PIXEL_RATIO,
                'style' : {
                    'height' : height + 'px',
                    'width' : width + 'px',
                }
            }
        );     
        if (PIXEL_RATIO !== 1) {
            this.context.scale(PIXEL_RATIO, PIXEL_RATIO);
        }
        return this;
    }

    $L.clear = function() {
        this.context.clearRect(0, 0, this.width * PIXEL_RATIO, this.height * PIXEL_RATIO);
        return this;
    }

    $L.toImage = function(callback) {
        let self = this;
        let imageObject = new Image();
        let dataURL = this.canvas.toDataURL('image/png');

        imageObject.onload = function() {
            imageObject.width = self.width;
            imageObject.height = self.height;
            callback(imageObject);
        };

        imageObject.src = dataURL;
    }

    return Layer;
})();