

const LayerDialog = function() {
    function LayerDialog() {
        this.active;

    }
}

function appendLayerListElement(rootNode, layerNumber) {
    let layerListElement = document.getElementById('layer-list');
    let layerRadio = createElementWithAttributes(
        'input',
        {
            'id' : 'l' + layerNumber,
            'type' : 'radio',
            'name' : 'layerIndex',
            'value' : layerNumber,
        }
    );
    let layerLabel = createElementWithAttributes(
        'label',
        {
            'for' : 'l' + layerNumber,
        }
    );
    let labelEdit = createElementWithAttributes(
        'span',
        {
            'contenteditable' : 'true',
            'text' : 'New Layer ' + layerNumber,
        }
    );

    layerRadio.addEventListener('click', changeVisibleLayer(layerNumber));
    layerLabel.appendChild(labelEdit);
    layerListElement.appendChild(layerRadio);
    layerListElement.appendChild(layerLabel);
}

const LayerListItem = function() {
    function LayerListItem(layerID) {
        this.element;
        this.id = layerID;
        this.nextLayer = null;
    }
    const $LLI = LayerListItem.prototype;
    
}