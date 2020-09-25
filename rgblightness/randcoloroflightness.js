
const { randPHistInt, rhSquaredProbHist, randInt } = require('./../src/stat/randomgeneration.js');

function randomColorFromChanTree(chanTreeArr, chanOrder) {
    let pProb = chanTreeArr.slice(2, 2 + chanTreeArr[1]);
    let pHist = rhSquaredProbHist(pProb); //should probably cache this
    let pRandIdx = randPHistInt(pHist.K, pHist.V);
    let pRand = chanTreeArr[0] + pRandIdx;
    let sIdx = 2 + chanTreeArr[1];
    let sRange = chanTreeArr[sIdx + 1];
    for (let i = 0; i < pRandIdx; i++) {
        sIdx = 2 + (sRange * 3);
        sRange = chanTreeArr[sIdx + 1];
    }
    let sProb = chanTreeArr.slice(sIdx + 2, sIdx + 2 + sRange);
    let sHist = rhSquaredProbHist(sProb);
    let sRandIdx = randPHistInt(sHist.K, sHist.V);
    let sRand = chanTreeArr[sIdx] + sRandIdx;

    let tIdx = sIdx + sRange + (2 * (1 + sRandIdx));
    let tRand = randInt(chanTreeArr[tIdx], chanTreeArr[tIdx + 1]);
    let randColor = [];
    randColor[chanOrder[0]] = pRand;
    randColor[chanOrder[1]] = sRand;
    randColor[chanOrder[2]] = tRand;
    return randColor;
}

function randomColorFromChanTreeBuff(buffer, chanOrder) {
    let bIdx = 2;
    let pProb = [];
    for (let i = 0; i < buffer.readUInt8(1); i++) {
        pProb.push(buffer.readFloatBE(bIdx));
        bIdx += 4;
    }
    let pHist = rhSquaredProbHist(pProb); //should probably cache this
    let pRandIdx = randPHistInt(pHist.K, pHist.V);
    let pRand = buffer.readUInt8(0) + pRandIdx;

    let sRange = buffer.readUInt8(bIdx + 1);
    for (let i = 0; i < pRandIdx; i++) {
        bIdx = bIdx + 2 + (sRange * 4) + (sRange * 2);
        sRange = buffer.readUInt8(bIdx + 1);
    }

    let sBase = buffer.readUInt8(bIdx);
    bIdx += 2;
    let sProb = [];
    for (let i = 0; i < sRange; i++) {
        sProb.push(buffer.readFloatBE(bIdx));
        bIdx += 4;
    }

    let sHist = rhSquaredProbHist(sProb);
    let sRandIdx = randPHistInt(sHist.K, sHist.V);
    let sRand = sBase + sRandIdx;
    bIdx = bIdx + (2 * sRandIdx);
    let tRand = randInt(buffer.readUInt8(bIdx), buffer.readUInt8(bIdx + 1));
    let randColor = [];
    randColor[chanOrder[0]] = pRand;
    randColor[chanOrder[1]] = sRand;
    randColor[chanOrder[2]] = tRand;
    return randColor;
}

function loadChanTreeFile(filepath) {
   let buffer = fs.readFileSync(filepath);
   return buffer;
}

// let filename = './cieTreeBuff/ct' + 0
// let chanTree77 = loadChanTreeFile(filename);
// chanTree77[1];
// let c = []
// for (let z = 0; z < 200; z++) {
//     let color = randomColorFromChanTreeBuff(chanTree77, [1, 0, 2]);
//     c.push(color);
// }
// console.log(c)


// let rr = rhSquaredProbHist([
//   0.18965516984462738,
//   0.17241379618644714,
//   0.1551724076271057,
//   0.13793103396892548,
//   0.12068965286016464,
//   0.09482758492231369,
//   0.06896551698446274,
//   0.043103449046611786,
//   0.017241379246115685
// ]);
// //let rr = rhSquaredProbHist([ 0.6628571152687073, 0.2857142984867096, 0.051428571343421936 ]);
// console.log(rr)
// // let ch = [0,0,0];

// // for (let i = 0; i < 400; i++) {
// //    let r = randPHistInt(rr.K, rr.V);
// //     ch[r] += 1;
// // }
// // console.log(ch)

module.exports = {
    loadChanTreeFile,
    randomColorFromChanTreeBuff,
}