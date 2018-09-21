'use strict';

export class FrequencyEcho {
    constructor({minDb = -140, maxDb = -30, frequencyEcho = 24, frequencyZoom = 4, cbFreqDataFloat32}) {
        this.minDb = minDb;
        this.maxDb = maxDb;
        this.frequencyEcho = frequencyEcho;
        this.frequencyZoom = frequencyZoom;
        this.cbFreqDataFloat32 = cbFreqDataFloat32;
        this.axMinIn = null;
        this._bufferdataFreqArray = null;
        this._echoSum = 0;
    }

    initNewData(fftAmplitudeDbFloatArray, length) {
        if (!this._bufferdataFreqArray || this._bufferdataFreqArray.length !== length * this.frequencyZoom) {
            this._bufferdataFreqArray = new Float32Array(length * this.frequencyZoom);
            this._bufferdataFreqArray2 = new Float32Array(this._bufferdataFreqArray.length);
            this._bufferdataFreqArray3 = new Float32Array(this._bufferdataFreqArray.length);
            this._outThreshold = new Float32Array(this._bufferdataFreqArray.length);
        }
        const realMax = Math.max(Math.max.apply(Math, fftAmplitudeDbFloatArray), this.minDb + 1);
        const maxSlope = 0.1;
        this.maxDb = this.maxDb > realMax ? this.maxDb * (1 - maxSlope) + realMax * maxSlope : realMax;
        this.axMinIn = this.maxDb - this.minDb;

        this._bufferdataFreqArray3.fill(0);

        for (let i = 0; i < this.frequencyZoom; i++) {
            this._bufferdataFreqArray[i + (length - 1) * this.frequencyZoom] = fftAmplitudeDbFloatArray[length - 1];
        }
        for (let i = 0; i < length - 1; i++) {
            this._bufferdataFreqArray[i * this.frequencyZoom] = fftAmplitudeDbFloatArray[i];
            for (let j = 1; j < this.frequencyZoom; j++) {
                this._bufferdataFreqArray[i * this.frequencyZoom + j] =
                    (fftAmplitudeDbFloatArray[i] * (this.frequencyZoom - j) + fftAmplitudeDbFloatArray[i + 1] * j)
                    / this.frequencyZoom;
            }
        }

        /*
        some accumulator to correct avalanche raise
        input:
        ^
        |    ||||
        |  ||||||
        |||||||||
        will get like:
        ^  ||
        |  ||||||
        |||||||||
        |||||||||
         */
        this._echoSum = 0;
    }

    draw(fftAmplitudeDbFloatArray, length, fDiscr) {
        this.initNewData(fftAmplitudeDbFloatArray, length);

        const fractionalIndexSet = (i, nHarm, cb) => {
            if (i % nHarm) {
                const part = (i % nHarm) / nHarm;
                cb(Math.floor(i / nHarm), (1 - part));
                cb(Math.ceil(i / nHarm), part);
            } else {
                cb(i / nHarm, 1);
            }
        };
        const harmonicMaxN = 7;
        const harmonicsNumbers = (new Array(harmonicMaxN - 1)).fill(0).map((_v, i) => 2 + i);

        if (!this._bufferdataFreqArray4 || this._bufferdataFreqArray4.length !== length * this.frequencyZoom) {
            this._bufferdataFreqArray4 = new Float32Array(this._bufferdataFreqArray.length);
            this._bufferdataFreqArray4.fill(0);


            for (let i = length * this.frequencyZoom - 1; i > 0; i--) {
                harmonicsNumbers.forEach((nHarm) => {
                    fractionalIndexSet(i, nHarm, (ind, part) => this._bufferdataFreqArray4[ind] += part / nHarm);
                });
            }
        }
        for (let i = length * this.frequencyZoom - 1; i > 0; i--) {
            const echoValue = this._normalRange(i) * this.frequencyEcho;
            if (echoValue <= 0) {
                continue; // to prevent another accumulative error when input is so low
            }
            // 2. 20 - 0, 80 ...., 20 - 32 * 1/2
            // 3. 40 - 0, 120...., 106.66 - 30 * 1/3, 13.33 - 33 * 1/3
            // 4. 60 - 0, 160...., 60 - 32 * 1/4
            // 5. 80 - 0, 200...., 152 - 30 * 1/5, 8 - 35 * 1/5
            harmonicsNumbers.forEach((nHarm) => {
                fractionalIndexSet(i, nHarm, (ind, part) => this._echoPlus(ind, part * echoValue / nHarm));
            });
        }
        const shit = this._bufferdataFreqArray3.reduce((a, v) => a + v) / this._bufferdataFreqArray3.length / Math.sqrt(2);
        for (let i = length * this.frequencyZoom - 1; i > 0; i--) {
            this._bufferdataFreqArray[i] += this._bufferdataFreqArray3[i] - this._bufferdataFreqArray4[i] * shit;
        }

        // for (let i = 0; i < this._bufferdataFreqArray.length; i++) {
        //     this._bufferdataFreqArray2[i] = this._bufferdataFreqArray[i]
        // }
        // for (let i = 0; i < this.frequencyZoom; i++) {
        //     this._bufferdataFreqArray2[i] = 0;
        // }
        this.sharpenLength = this.frequencyZoom * 2;
        const tmpMatrix = new Array(this.sharpenLength).fill(0).map((_v, i) => i).slice(1);
        const sum = tmpMatrix.reduce((a, v) => a + v, 0);
        const tmpMatrix2 = tmpMatrix.map(v => -v);
        const matrix = this.sharpenLength > 1
            ? tmpMatrix2.concat([3 * sum]).concat(tmpMatrix2.reverse()).map(v => v / sum)
            : [1];
        for (let i = 0; i < this.sharpenLength; i++) {
            this._bufferdataFreqArray2[i] = this._bufferdataFreqArray[i];
        }
        for (let i = this._bufferdataFreqArray.length - this.sharpenLength; i < this._bufferdataFreqArray.length; i++) {
            this._bufferdataFreqArray2[i] = this._bufferdataFreqArray[i];
        }
        for (let i = this.sharpenLength; i < this._bufferdataFreqArray.length - this.sharpenLength; i++) {
            this._bufferdataFreqArray2[i] = matrix.reduce((a, m, j) => a + this._bufferdataFreqArray[i + j - this.sharpenLength] * m, 0);
        }

        this._highPassFilter(this._bufferdataFreqArray);

        this._dynamicThreshold(this._bufferdataFreqArray);

        this.cbFreqDataFloat32(this._outThreshold, length * this.frequencyZoom, fDiscr);
    }

    _normalRange(i) {
        return (this._bufferdataFreqArray[i] - this.minDb) / this.axMinIn;
    }

    _echoPlus(idn, echoValue) {
        this._bufferdataFreqArray3[idn] += this._normalRange(idn) * echoValue;
    }

    /**
     * @param {Float32Array|Number[]} inOutArr array of FFT amplitudes (in Db)
     * @mutate arguments.inOutArr
     * @private
     */
    _highPassFilter(inOutArr) {
        // high pass filter
        this.highPassSlope = 2000;
        for (let i = 1; i < inOutArr.length; i++) {
            inOutArr[i] -= this.highPassSlope * ((i + 1) / i - 1);
        }
    }

    _dynamicThreshold(inArr) {
        // dynamic threshold (maximums)
        // camel
        this._outThreshold.fill(Number.NEGATIVE_INFINITY);
        this._outThreshold[0] = inArr[0];
        let localMax = Number.NEGATIVE_INFINITY;
        let localMaxI = 0;
        for (let i = 1; i < inArr.length; i++) {
            if (localMax < inArr[i]) {
                localMax = inArr[i];
                localMaxI = i;
            } else if (inArr[i - 1] < inArr[i]) {
                this._outThreshold[localMaxI] = localMax;
                localMax = inArr[i];
                localMaxI = i;
            }
        }
        // simple
        this.peaksLimit = 50;
        const threshold = this._outThreshold.slice(0).sort()[this._outThreshold.length - this.peaksLimit];
        for (let i = 0; i < this._outThreshold.length; i++) {
            this._outThreshold[i] = this._outThreshold[i] >= threshold
                ? this._outThreshold[i]
                : Number.NEGATIVE_INFINITY;
        }
    }
}