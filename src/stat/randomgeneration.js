const { clampTo } = require('../utility/num_util.js');

//Creates a uniform histogram of 'bins' of height a = 1/n that are the sum of 
//probabilities of two outcomes. Probability in excess of a is distributed evenly 
//using a RobinHood algorithm. Returns arrays K and V where K is indices of
//the outcomes in the upper halves of each bin and V is the probability of the
//outcome in the lower halves of the bins. 
function robinHoodSquaredProbHistogram(p) {
    let K = []; //Indices corresponding to top of bar
    let V = []; //Bar division point
    let n = p.length;
    let a = 1 / n;
    let i = 0
    let j = 0; //i is index of min p. j is index of max p

    for (let y = 0; y < n; y++) {
        K[y] = y;
        V[y] = (y + 1) * a;
    }

    for (let m = 0; m < n - 1; m++) {

        //1. Find the indices i of minimum probability and j of maximum probability
        for (let s = 0; s < p.length; s++) {
            if (p[s] < p[i]) {
                i = s;
            } else if (p[s] > p[j]) {
                j = s;
            }
        }
        //2. Distribute probability above a from maximum bar to minimum bar
        K[i] = j;
        V[i] = (i * a) + p[i];
        p[j] = p[j] - (a - p[i]);
        p[i] = a;
    }

    return {'K': K, 'V': V}
}

//Generates a random index from a probability histogram. 
//A probability histogram is represented by the arrays K and V
//First generates a random float from 0 through 1. 
//stored in arr
function randProbHistogramInt(K, V) {
    //check that K and V are arrays of the same length
    let n = K.length;
    let U = Math.random();
    let j = Math.floor(n * U);
    if (U < V[j]) {
        return j;
    }
    return K[j];
}

//Returns an integer greater or equal to min and less than (min + range).
function randInt(min, range) {
    return Math.floor(Math.random() * range) + min;
}

//Generates list of N random integers greater or equal to min and less than (min + range).
function randIntArray(min, range, n=1) {
    let ra = [];
    for (let i = 0; i < n; i++) {
        ra[i] = randInt(min, range);
    }
    return ra;
}

//Generates random values in the normal distribution from two uniform random numbers from the unit interval.
//Set xy argument to true to generate two random normal values at once. 
function BoxMuller(xy=false) {
    let U1 = Math.random(),
        U2 = Math.random(),
        x;
    if (U1 === 0) { x = 0 }
    else { x = Math.sqrt(-2 * Math.log(U1)) * Math.cos(2 * Math.PI * U2)}
    
    if (Number.isNaN(x)) {
        throw new Error("Generated values " + U1 + " " + U2 + "are undefined for BoxMuller method");
    }

    if (xy) {
        let y = Math.sqrt(-2 * Math.log(U1)) * Math.sin(2 * Math.PI * U2);
        return [x, y]
    }
    return x;  
}

//Uses the boxmuller method to generate random values in a gaussian distribution with specified mean and standard
//deviation. Set xy argument to true to generate two random gaussians at once. 
function gaussBoxMuller(mean, stdDev, xy=false) {
    let normRand = BoxMuller(xy);

    if (xy) return [normRand[0] * stdDev + mean, normRand[1] * stdDev + mean];
    return normRand * stdDev + mean;
}

//Generates random gray value from gaussian distribution. Suggested stdDeviations: 16, 32, 54
function gaussGray(res, stdDev, mean=128) {
    let randGray = [],
        p = 0,
        gVal;

    if (res % 2 === 1) {
       gVal = clampTo(Math.round(gaussBoxMuller(mean, stdDev, false)),0, 255, false);
       randGray.push(gVal);
       p++;
    }
    while (p < res) {
        gVal = gaussBoxMuller(mean, stdDev, true);
        randGray.push(Math.round(clampTo(gVal[0], 0, 255, true)));
        randGray.push(Math.round(clampTo(gVal[1], 0, 255, true)));
        p += 2;
    }
    return randGray;
}

module.exports.rhSquaredProbHist = robinHoodSquaredProbHistogram;
module.exports.randPHistInt = randProbHistogramInt;
module.exports.randInt = randInt;
module.exports.gaussGray = gaussGray;
module.exports.randIntArray = randIntArray;

