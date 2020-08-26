const { zeros } = require('./utility/array_util.js');

const DiscreteDistribution = (function() {
    function Distribution(data, intervalCount, min, max) {
        this.dist = data;
        this.intervalCount = intervalCount;
        this.intervalSize = (max - min + 1) / intervalCount;
        this.min = min;
        this.max = max;
    }
    const $DD = DiscreteDistribution.prototype;

    $DD.intervalIndex = function(value) {
        return Math.floor((value - this.min) / this.intervalSize);
    }

    // $DD.midpointArea = function(intervalIndex) {
    //     return this.dist[intervalIndex] * this.intervalSize;
    // }
    // $DD.trapezoidArea = function(intervalIndex) {
    //     let sideA = intervalIndex === 0 ? 0 : ((this.dist[intervalIndex] - this.dist[intervalIndex - 1]) / 2) + this.dist[intervalIndex];
    //     let sideB = intervalIndex === this.dist.length - 1;
    // }
    return DiscreteDistribution;
})();

const ProbabilityDist = (function() {
    function ProbabilityDist(probabilities, min, max) {
        Distribution.call(this, probabilities, probabilities.length, min, max);
    }
    ProbabilityDist.prototype = Object.create(DiscreteDistribution.prototype);
    ProbabilityDist.prototype.constructor = ProbabilityDist;
    const $PD = ProbabilityDist.prototype;

    $PD.mean = function() {
        return this.dist.reduce((acc, prob, i) => acc + ((i + 1) * this.intervalSize + this.min) * prob, 0);
    }

    $PD.pdf = function() {
        return this.dist.map(prob => parseFloat(prob / this.intervalSize).toPrecision(4));
    }

    $PD.cdf = function() {
        let acc = 0;
        return this.dist.map((acc => prob => parseFloat(acc + prob).toPrecision(4))(0));
    }
    return $PD;
})();

const FrequencyDist = (function() {
    function FrequencyDist(outcomes, intervalCount, min, max) {
        this.totalOutcomes = 0;

        Distribution.call(this, zeros(intervalCount), intervalCount, min, max);
        this.populate(outcomes);
    }
    FrequencyDist.prototype = Object.create(DiscreteDistribution.prototype);
    FrequencyDist.prototype.constructor = FrequencyDist;
    const $FD = FrequencyDist.prototype;

    $FD.populate = function(outcomes) {
        for (let oc of outcomes) {
            if (oc >= this.min && oc < this.max) {
                this.totalOutcomes++;
                this.dist[this.intervalIndex(oc)] += 1;
            }
        }
    }
    $FD.mean = function() {
        return this.dist.reduce((acc, freq) => 
            acc + (freq * ((i + 1) * this.intervalSize + this.min)),
            0
        ) / this.totalOutcomes;
    }
    //Returns the cumulative frequency districution as a list A, where each element j is the sum of the 
    //frequencies of the distribution from 0 through j - 1.
    $FD.cumulativeFrequency = function() {
        return this.dist.map((acc => freq => acc + freq)(0));
    }
    //Calculates the probability of each outcome interval and returns the corresponding probability distribution object.
    $FD.toProbabilityDist = function() {
        let probData = this.dist.map(freq => freq / this.totalOutcomes);
        return new ProbabilityDist(probData, this.min, this.max);
    }
    
    $FD.pdf = function() {
        return this.dist.map(freq => parseFloat(freq / this.totalOutcomes / this.intervalSize).toPrecision(4));
    }

    $FD.cdf = function() {
        return this.dist.map((acc => freq => parseFloat(acc + freq))(0));
    }
    //Given a numerical range, equalizes the probabilities of the distribution's outcomes across the new range. 
    //Returns list of equalized value of each interval. 
    $FD.equalize = function(toRange) {
        let cumHist = this.cumulativeFrequency();
        let cumMin = 0;
        for (let i = 0; i < cumHist.length; i++) {
            if (cumHist[i] > 0) {
                cumMin = cumHist[i];
                break;
            }
        }
        let cumTotal = this.totalOutcomes - cumMin;
        return cumHist.map(cumFreq => Math.round((cumFreq - cumMin) / cumTotal * toRange));
    }
    return $FD;
})();

// function pdf(discreteDist) {
//     let callbackFn;
//     if (typeof discreteDist === ProbabilityDist) {
//         callbackFn = prob => prob / discreteDist.intervalSize;
//     }
//     if (typeof discreteDist === FrequencyDist) {
//         callbackFn = freq => freq / discreteDist.totalOutcomes / discreteDist.intervalSize;
//     }
    
//     return discreteDist.dist.map(value => parseFloat(callbackFn(value)).toPrecision(4));
// }

// function cdf(discreteDist) {
//     let acc = 0;
//     let callbackFn;

//     switch(typeof discreteDist) {
//         case ProbabilityDist :
//             callbackFn = prob => acc + prob;
//             break;
//         case FrequencyDist : 
//             callbackFn = freq => acc + (freq / discreteDist.totalOutcomes);
//             break;
//     }
//     return discreteDist.dist.map(value => parseFloat(callbackFn(value)).toPrecision(4));
// }

// function cumulativeHistogram(freqDist) {
//     if (typeof freqDist !== FrequencyDist) throw new Error(`Expected Argument 1 of type FrequencyDist, received value of type ${typeof freqDist}`);
//     let acc = 0;
    
// }

// function freqDistToProbDist(freqDist) {
//     if (typeof freqDist !== FrequencyDist) throw new Error(`Expected Argument 1 of type FrequencyDist, received value of type ${typeof freqDist}`);
//     let probData = freqDist.dist.map(freq => freq / freqDist.totalOutcomes);
//     return new ProbabilityDist(probData, freqDist.min, freqDist.max);
// }

// function equalize(discreteDist, toRange) {
//     if (typeof discreteDist === FrequencyDist) {
//         let cumHist = cumulativeHistogram(discreteDist);
//         let cumMin = 0;
//         for (let i = 0; i < cumHist.length; i++) {
//             if (cumHist[i] > 0) {
//                 cumMin = cumHist[i];
//                 break;
//             }
//         }
//         let cumTotal = discreteDist.totalOutcomes - cumMin;
//         return cumHist.map(cumFreq => Math.round((cumFreq - cumMin) / cumTotal * toRange));
//     } else if (typeof discreteDist === ProbabilityDist) {

//     }   
// }

module.exports = { 
    DiscreteDistribution,
    FrequencyDist,
    ProbabilityDist,
};