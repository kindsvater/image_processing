const type = require("./array_util/type");

function addTextToElement(element, textData) {
    element.appendChild(document.createTextNode(textData));
    return element;
}

function createTextElement(tagName, textData) {
    let element = document.createElement(tagName);
    addTextToElement(element, textData);
    return element;
}

function setAttributes(element, attrs) {
    for (let attribute in attrs) {
        switch (attribute) {
            case 'style' :
                if (typeof attrs[attribute] === 'object') {
                    for (let property in attrs[attribute]) {
                        element.style[property] = attrs[attribute][property];
                    }
                }
                break;
            case 'class' : 
                let classList = attrs[attribute];
                if (!Array.isArray(classList)) classList = [classList];
                let currentClassNames = element.className.split(" ");

                for (className of classList) {
                    let trimmedClassName = className.replace(/\s+/g, '');
                    if (
                        typeof className === 'string' && 
                        currentClassNames.indexOf(trimmedClassName) == -1
                    ) {
                        element.className += " " + trimmedClassName;
                    }
                }
                break;
            case 'text' : 
                element.innerText = attrs[attribute];
                break;
            default : 
                element.setAttribute(attribute, attrs[attribute]);
        }
    }
    return element;
}

function createElementWithAttributes(tagName, attrs) {
    let element = document.createElement(tagName);
    setAttributes(element, attrs);
    return element;
}

module.exports = {
    createTextElement,
    addTextToElement,
    setAttributes,
    createElementWithAttributes
}