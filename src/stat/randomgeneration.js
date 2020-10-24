const { clampTo } = require('../utility/num_util.js');
const { sizeFrom } = require('../utility/array_util/shape.js');
const { toNestedArray } = require('../utility/array_util/dimension.js');

//Creates a uniform histogram of 'bins' of height a = 1/n that are the sum of 
//probabilities of two outcomes. Probability in excess of a is distributed evenly 
//using a RobinHood algorithm. Returns arrays K and V where K is indices of
//the outcomes in the upper halves of each bin and V is the probability of the
//outcome in the lower halves of the bins. 
function robinHoodProbHist(p) {
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
function randProbHistInt(K, V) {
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
function randUniformInt(min, range, shape=1) {
    let n = sizeFrom(shape);
    if (n === 1) {
        return Math.floor(Math.random() * range) + min;
    }
    let randVals = [];
    for (let i = 0; i < n; i++) {
        randVals[i] = Math.floor(Math.random() * range) + min;
    }
    toNestedArray(randVals, shape);
    return randVals;
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

function randGaussian(mean, stdDev, shape=[1]) {
    let n = sizeFrom(shape);
    if (n === 1) return BoxMuller(false) * stdDev + mean;
    let randomVals = [];
    let rvi = 0;
    
    if (n % 2 === 1) {
        randomVals[rvi++] = BoxMuller(false) * stdDev + mean;
    }
    while (rvi < n) {
        let xy = BoxMuller(true);
        randomVals[rvi++] = xy[0] * stdDev + mean;
        randomVals[rvi++] = xy[1] * stdDev + mean;
    }
    toNestedArray(randomVals, shape);
    return randomVals;
}

function randNormal(shape=[1]) {
    return randGaussian(0, 1, shape);
}

//Generates n random gray value from gaussian distribution. Suggested stdDeviations: 16, 32, 54
function random8BitGray(n, stdDev, mean=128) {
    let randGaussVals = randGaussian(mean, stdDev, n);
    return randGaussVals.map( 
        randVal => clampTo(Math.round(randVal), 0, 255, false)
    );
}

module.exports = {
    robinHoodProbHist,
    randProbHistInt,
    randUniformInt,
    randGaussian,
    randNormal,
    random8BitGray
}

