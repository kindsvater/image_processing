const { zeros } = require('./utility/array_util.js');

const DiscreteDistribution = (function() {
    function DiscreteDistribution(data, intervalCount, min, max) {
        this.dist = data;
        this.intervalCount = intervalCount;
        this.intervalSize = (max - min + 1) / intervalCount;
        this.min = min;
        this.max = max;
    }
    const $DD = DiscreteDistribution.prototype;

    $DD.intervalIndex = function(value) {
        let index = Math.floor((value - this.min) / this.intervalSize);
        if (this.dist[index] === undefined) return null;
        return index;
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
        DiscreteDistribution.call(this, probabilities, probabilities.length, min, max);
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
        return this.dist.map((acc => prob => parseFloat(acc += prob).toPrecision(4))(0));
    }
    return ProbabilityDist;
})();

const FrequencyDist = (function() {
    function FrequencyDist(outcomes, intervalCount, min, max) {
        this.totalOutcomes = 0;

        DiscreteDistribution.call(this, zeros([intervalCount]), intervalCount, min, max);
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
        return this.dist.map((acc => freq => acc += freq)(0));
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
    $FD.equalize = function(toRange, withMin=0) {
        let range = toRange - 1;
        let cumHist = this.cumulativeFrequency();
        let cumMin = 0;
        for (let i = 0; i < cumHist.length; i++) {
            if (cumHist[i] > 0) {
                cumMin = cumHist[i];
                break;
            }
        }
        let cumTotal = this.totalOutcomes - cumMin;
        let outcome = cumHist.map(cumFreq => withMin + Math.round((cumFreq - cumMin) / cumTotal * range));
        for (let i = 0; i < outcome.length; i++) {
            if (outcome[i] < withMin) {
                outcome[i] = withMin;
            } else {
                break;
            }
        }
        return outcome;
    }
    return FrequencyDist;
})();

module.exports = { 
    DiscreteDistribution,
    FrequencyDist,
    ProbabilityDist,
};