const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { CIEPerceivedLightness, luminence } = require('./srgb');

function writeBrightnessFiles() {
    //Do chunks of 50 at a time to prevent Node from crashing
    for (let r = 200; r < 256; r++) {
        let streams = [];
        for (let g = 0; g < 256; g++) {
            for (let b = 0; b < 256; b++) {
                let Y = luminence(r, g, b);
                let L = Math.round(CIEPerceivedLightness(Y));
                
                if(!streams[L]) {
                    let file = fs.createWriteStream('./ciepl/cie' + L, {flags:'a'});
                    file.on('error', function(err) {
                        console.log(err);
                    });
                    streams[L] = file;
                }
                streams[L].write(r + ',' + g + ',' + b +'\n');
            }
        }
        for (let i = 0; i < streams.length; i++) {
            if (streams[i]) {
                streams[i].end();
            }
        }
    }    
}


//Which Color components are most compressable?
function uniqueColorChannelValues(L, writeToFile) {
    let uniqueChannelVals = [{},{},{}];
    let totalColors = 0;
    let readInterface = readline.createInterface({
        input: fs.createReadStream('./ciepl/cie' + L),
        console: false
    });

    readInterface.on('line', function(line) {
        let color = line.split(',');
        totalColors++;
        for (let cc = 0; cc < 3; cc++) {
            let ccval = color[cc];
            if (uniqueChannelVals[cc][ccval] === undefined) {
                uniqueChannelVals[cc][ccval] = 0;
            }
            uniqueChannelVals[cc][ccval] += 1;
        }
    });

    readInterface.on('close', function() {
        let rVals = Object.keys(uniqueChannelVals[0]);
        let gVals = Object.keys(uniqueChannelVals[1]);
        let bVals = Object.keys(uniqueChannelVals[2]);
        if (writeToFile) {
            let f = fs.createWriteStream('./ciepl/summary', {flags: 'a'});
            f.write(L + "," + totalColors + "," + rVals.length + "," + gVals.length + "," + bVals.length +'\n');
            f.end();
        } else {
            console.log(rVals);    
            console.log(gVals);
            console.log(bVals);
            console.log("Total Colors: " + totalColors);
            console.log("Red Unique Vals " + rVals.length);
            console.log("Green Unique Vals " + gVals.length);
            console.log("Blue Unique Vals " + bVals.length);
        }
    });

}

//Only Run On 20 files at a time.
function bestChannelCompOrder(L, writeToFile) {
    let totalColors = 0;
    let chanTree = [{},{},{},{},{},{}];
    let chanOrder = [[0, 1, 2],[0, 2, 1],[2,0,1],[2,1,0],[1,2,0],[1,0,2]];
    let nodeCount = [0,0,0,0,0,0];
    let readInterface = readline.createInterface({
        input: fs.createReadStream('./ciepl/cie' + L),
        console: false
    });

    readInterface.on('line', function(line) {
        let color = line.split(',');
        totalColors++;
        for (let x = 0; x < 6; x++) {
            let PC = chanOrder[x][0];
            let SC = chanOrder[x][1];
            let TC = chanOrder[x][2];
            

            if (chanTree[x][color[PC]] === undefined) {
                chanTree[x][color[PC]] = {};
                nodeCount[x]++;
            }
            if (chanTree[x][color[PC]][color[SC]] === undefined) {
                chanTree[x][color[PC]][color[SC]] = [];
                nodeCount[x]++;
            }
            chanTree[x][color[PC]][color[SC]].push(color[TC]);
            nodeCount[x]++;
        }
    });

    readInterface.on('close', function() {
        let minNodeIndex = 0;
        for (let n = 1; n < 6; n++) {
            if (nodeCount[n] < nodeCount[minNodeIndex]) {
                minNodeIndex = n;
            }
        }
        if (writeToFile) {
            let f = fs.createWriteStream('./ciepl/treeInfo.csv', {flags: 'a'});
            f.write(L + "," + chanOrder[minNodeIndex] + "," +  (nodeCount[minNodeIndex] / (totalColors * 3)) + '\n');
            f.end();
        } else {
            console.log("Grayscale Value: " + L);
            console.log("color components: " + (totalColors * 3));
            console.log("nodes: " + nodeCount);
            console.log("Minimum Node Count: " + nodeCount[minNodeIndex]);
            console.log("info: " + nodeCount[minNodeIndex] / (totalColors * 3));
            console.log("Best Channel Sequence: " + chanOrder[minNodeIndex]);
        }
    });
}

//Given a csv file of sRGB color data and color channel priority list, compresses colors into a file representable as a tree of height three.
// Each tier contains values of the corresponding color channel. 
function writeChannelTreeToFile(L, chanOrder) {
    let chanTree = {};
    let readInterface = readline.createInterface({
        input: fs.createReadStream('./ciepl/cie' + L),
        console: false
    });
    readInterface.on('line', function(line) {
        let color = line.split(',');
        for (let x = 0; x < 6; x++) {
            let PC = chanOrder[0];
            let SC = chanOrder[1];
            let TC = chanOrder[2];
            

            if (chanTree[color[PC]] === undefined) {
                chanTree[color[PC]] = {};
            }
            if (chanTree[color[PC]][color[SC]] === undefined) {
                chanTree[color[PC]][color[SC]] = [];
            }
            let tValFound = false;
            for (let h = 0; h < chanTree[color[PC]][color[SC]].length; h++) {
                if (chanTree[color[PC]][color[SC]][h] === color[TC]) {
                    tValFound = true;
                    break;
                }
            }
            if (!tValFound) {
                chanTree[color[PC]][color[SC]].push(color[TC]);
            }   
        }
    });
    
    readInterface.on('close', function() {
        let filename = './cieplTree/' + L
        let f = fs.createWriteStream(filename, {flags: 'a'});
        let pVals = Object.keys(chanTree);
        f.write(Math.min(...pVals) + ',' + pVals.length);
        pVals.forEach( p => {
            let sVals = Object.keys(chanTree[p]);
            f.write(',' + Math.min(...sVals) + ',' + sVals.length);
            sVals.forEach( s => {
                let tVals = chanTree[p][s];
                f.write(',' + Math.min(...tVals) + ',' + tVals.length);
            });
        });
        // f.write("p," + pVals.length + "\n");
        // f.write(pVals.join(',') + '\n');
        // pVals.forEach( p => {
        //     let sVals = Object.keys(chanTree[p]);
        //     console.log(sVals);
        //     f.write(sVals.join(',') + '\n');
        //     sVals.forEach( s => {
        //         let tVals = chanTree[p][s];
        //         console.log(tVals)
        //         f.write(tVals.join(',') + '\n');
        //     });
        // })
        // f.end();
        // console.log("finished writing channel tree to " + filename);
    })
}

writeChannelTreeToFile(77, [1, 0, 2]);

function readChannelTreeFromFile(L) {
    let chanTree = null;
    let f = readSync
}