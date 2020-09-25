const fs = require('fs');
const readline = require('readline');
const { decodeGamma8Bit } = require('./srgb.js');
const { relativeLuminence, lightness, normalRLuminence } = require('./../src/colorspace/cie.js');

function hasUniformValues(arr) {
    if (!Array.isArray(arr)) {
        return false;
    }
    if (arr.length > 0) {
        let first = arr[0];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== first) {
                return false;
            }
        }
    }
    return true;
}

function writeBrightnessFiles(minR, maxR, filepath) {
    //Do chunks of 50 at a time to prevent Node from crashing
    for (let r = minR; r < maxR; r++) {
        let streams = [];
        for (let g = 0; g < 256; g++) {
            for (let b = 0; b < 256; b++) {
                let Y = relativeLuminence(decodeGamma8Bit(r),decodeGamma8Bit(g),decodeGamma8Bit(b));
                let Ynorm = normalRLuminence(Y);
                //let L = Math.round(lightness(Ynorm));

                let L = Math.round(255 * (lightness(Ynorm) / 100));
                if(!streams[L]) {
                    let file = fs.createWriteStream(filepath + L, {flags:'a'});
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

//Only Run On 20 files at a time
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
    let chanTree = {}
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
                chanTree[color[PC]] = {
                    'pFreq': 1,
                    'sVals': {}
                };
            } else {
                chanTree[color[PC]].pFreq += 1;
            }
            if (chanTree[color[PC]].sVals[color[SC]] === undefined) {
                chanTree[color[PC]].sVals[color[SC]] = {
                    'sFreq': 1,
                    'tVals': [],
                };
            } else {
                chanTree[color[PC]].sVals[color[SC]].sFreq += 1;
            }
            chanTree[color[PC]].sVals[color[SC]].tVals.push(color[TC]);
        }
    });
    
    readInterface.on('close', function() {
        let filename = './cieplTree/ct' + L
        let f = fs.createWriteStream(filename);
        let pProb, sProb, tProb;
        let pVals = Object.keys(chanTree);
        let pFreqs = pVals.map( p => chanTree[p].pFreq);
        
        if (hasUniformValues(pFreqs)) {
            pProb = [1 / pFreqs.length];
            console.log("File " + L + " has a uniform primary channel");
        } else {
            let pFreqTotal = pFreqs.reduce((total, freq) => total + freq);
            pProb = pFreqs.map( f => f / pFreqTotal);
        }
        
        f.write(Math.min(...pVals) + ',' + pVals.length + ',' + pProb.join());
        pVals.forEach( p => {
            let sVals = Object.keys(chanTree[p].sVals);
            let sFreqs = sVals.map( s => chanTree[p].sVals[s].sFreq);

            if (hasUniformValues(sFreqs)) {
                sProb = [1 / sFreqs.length];
                if(sFreqs.length > 1) {
                    console.log("File " + L + " has a uniform secondary channel. " + sFreqs);
                }
            } else {
                let sFreqTotal = sFreqs.reduce((total, freq) => total + freq);
                sProb = sFreqs.map( f => f / sFreqTotal);
            }

            f.write(',' + Math.min(...sVals) + ',' + sVals.length + ',' + sProb.join(','));
            sVals.forEach( s => {
                let tVals = chanTree[p].sVals[s].tVals;
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
//Given a csv file of sRGB color data and color channel priority list, compresses colors into a file representable as a tree of height three.
// Each tier contains values of the corresponding color channel. 
function writeChannelTreeToBuffer(L, chanOrder, inputPath, outputPath) {
    let chanTree = {}
    let readInterface = readline.createInterface({
        input: fs.createReadStream(inputPath + L),
        console: false
    });
    let nodeCount = {
        'p': 0,
        's': 0,
        't': 0
    }
    readInterface.on('line', function(line) {
        let color = line.split(',');
        for (let x = 0; x < 6; x++) {
            let PC = chanOrder[0];
            let SC = chanOrder[1];
            let TC = chanOrder[2];
            
            if (chanTree[color[PC]] === undefined) {
                chanTree[color[PC]] = {
                    'pFreq': 1,
                    'sVals': {}
                };
                nodeCount.p += 1;
            } else {
                chanTree[color[PC]].pFreq += 1;
            }
            if (chanTree[color[PC]].sVals[color[SC]] === undefined) {
                chanTree[color[PC]].sVals[color[SC]] = {
                    'sFreq': 1,
                    'tVals': [],
                };
                nodeCount.s += 1;
            } else {
                chanTree[color[PC]].sVals[color[SC]].sFreq += 1;
            }
            let uniqueT = true;
            for (let t = 0; t < chanTree[color[PC]].sVals[color[SC]].tVals.length; t++) {
                if (chanTree[color[PC]].sVals[color[SC]].tVals[t] === color[TC]) {
                    uniqueT = false;
                }
            }
            if (uniqueT) {
                chanTree[color[PC]].sVals[color[SC]].tVals.push(color[TC]);
                nodeCount.t += 1;
            }     
        }
    });
    
    readInterface.on('close', function() {
        let bufferSize = (2 + (4 * nodeCount.p)) + ((2 * nodeCount.p) + (4 * nodeCount.s)) + (2 * nodeCount.s);
        let buffer = new ArrayBuffer(bufferSize);
        let view = new DataView(buffer);
        let vIdx = 0;
        let pProb, sProb, tProb;
        let pVals = Object.keys(chanTree);
        let pFreqs = pVals.map( p => chanTree[p].pFreq);
        
        if (hasUniformValues(pFreqs)) {
            pProb = [1 / pFreqs.length];
            console.log("File " + L + " has a uniform primary channel");
        } else {
            let pFreqTotal = pFreqs.reduce((total, freq) => total + freq);
            pProb = pFreqs.map( f => f / pFreqTotal);
        }
        //
        view.setUint8(vIdx, Math.min(...pVals));
        view.setUint8(vIdx + 1, pVals.length);
        vIdx += 2;
        for (let w = 0; w < pProb.length; w++) {
            view.setFloat32(vIdx, pProb[w]);
            vIdx += 4;
        }
        pVals.forEach( p => {
            let sVals = Object.keys(chanTree[p].sVals);
            let sFreqs = sVals.map( s => chanTree[p].sVals[s].sFreq);

            if (hasUniformValues(sFreqs)) {
                sProb = [1 / sFreqs.length];
                if(sFreqs.length > 1) {
                    console.log("File " + L + " has a uniform secondary channel. " + sFreqs);
                }
            } else {
                let sFreqTotal = sFreqs.reduce((total, freq) => total + freq);
                sProb = sFreqs.map( f => f / sFreqTotal);
            }
            view.setUint8(vIdx, Math.min(...sVals));
            view.setUint8(vIdx + 1, sVals.length);
            vIdx += 2;
            for (let w = 0; w < sProb.length; w++) {
                view.setFloat32(vIdx, sProb[w]);
                vIdx += 4;
            }
            sVals.forEach( s => {
                let tVals = chanTree[p].sVals[s].tVals;
                view.setUint8(vIdx, Math.min(...tVals));
                view.setUint8(vIdx + 1, tVals.length);
                vIdx += 2;
            });
        });

        let filename = outputPath + L
        fs.writeFile(filename, view, function(err, result) {
            if (err) console.log('error: ', err);
        });
    });
}

//Only iterate through 50 rgb values at a time to prevent node from crashing.
//WriteBrightnessFiles(0, 50, './pl255/cie');

//Write around 50 buffer files at a time to prevent node from crashing.
// for (let i = 201; i < 256; i++) {
//     writeChannelTreeToBuffer(i, [1, 0, 2], './pl255/cie', './255buff/ct');
// }