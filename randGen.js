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

//Returns an integer >= min and < min + range
function randInt(min, range) {
    return Math.floor(Math.random() * range) + min;
}

// function gauss
module.exports.rhSquaredProbHist = robinHoodSquaredProbHistogram;
module.exports.randPHistInt = randProbHistogramInt;
module.exports.randInt = randInt;

