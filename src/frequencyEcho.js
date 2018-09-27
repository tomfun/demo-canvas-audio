'use strict';

export class FrequencyEcho {
    constructor({ minDb = -140, maxDb = -30, frequencyEcho = 4, frequencyZoom = 4, cbFreqDataFloat32 }) {
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
        // plus plus
        const bases = new Map();
        const excludes = new Set();
        let pictureResolution = 8; // we look for up to 8 harmonics
        for (let i = 1; i < inArr.length / 3; i++) {
            if (excludes.has(i)) {
                continue;
            }
            const indexesRange = (new Array(pictureResolution))
                .fill(0)
                .map((_v, j) => i - 0.5 + j / pictureResolution);
            const echoPicture = indexesRange.map((ind) => {
                const c = this._calculateEchoTimes(inArr, ind);
                const v = c >= 3 ? this._calculateEchoValue(inArr, ind, c) : 0;
                return { c, v, ind };
            })
                .filter(({ v }) => v);
            if (!echoPicture.length) {
                continue;
            }
            const sum = echoPicture.reduce((a, { v }) => a + v, 0);
            const maxHarmonicCount = echoPicture.reduce((a, { c }) => a > c ? a : c, 1);
            const minHarmonicCount = echoPicture.reduce((a, { c }) => a > c ? c : a, 1);
            indexesRange.forEach((ind) => {
                for (let l = 2, j = ind * l; l < minHarmonicCount + 1; l++, j = ind * l) {
                    excludes.set(Math.round(j));
                }
            });
            bases.set(i, {sum, maxHarmonicCount});
        }
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
        // plus minus
        // for test - // inArr.forEach((v, i) => this._outThreshold[i] = v);
        bases.forEach(({sum, maxHarmonicCount}, i) => {
            const indexesRange = (new Array(pictureResolution))
                .fill(0)
                .map((_v, j) => i - 0.5 + j / pictureResolution);
            indexesRange.forEach((ind) => {
                const k = 9 * sum / pictureResolution;
                for (let l = 3, j = ind * l; l < maxHarmonicCount + 1; l++, j = ind * l) {
                    this._outThreshold[Math.round(j)] -= (maxHarmonicCount- l) * k;
                }
            });
        });
        // inArr.forEach((v, i) => this._outThreshold[i] = this.minDb);
        // bases.forEach(({sum, maxHarmonicCount}, i) => {
        //     const indexesRange = (new Array(pictureResolution))
        //         .fill(0)
        //         .map((_v, j) => i - 0.5 + j / pictureResolution);
        //     indexesRange.forEach((ind) => {
        //         const k = 6 * sum / pictureResolution;
        //         for (let l = 1, j = ind * l; l < maxHarmonicCount + 1; l++, j = ind * l) {
        //             this._outThreshold[Math.round(j)] += (maxHarmonicCount - l) * k;
        //         }
        //     });
        // });
        // console.debug('cnt', bases.size)

        // simple
        this.peaksLimit = 15;
        const threshold = this._outThreshold.slice(0)
            .sort()[this._outThreshold.length - this.peaksLimit];
        for (let i = 0; i < this._outThreshold.length; i++) {
            this._outThreshold[i] = this._outThreshold[i] >= threshold
                ? this._outThreshold[i]
                : Number.NEGATIVE_INFINITY;
        }
    }

    /**
     * @param {Float32Array|Number[]} inArr array of FFT amplitudes (in Db)
     * @param {Number} i Integer, base search frequency index
     * @return {Number} Integer - times
     * @private
     */
    _calculateEchoTimes(inArr, i) {
        let amp = inArr[i];
        let c = 1;
        let j = i * (c + 1);
        if (inArr[Math.round(j)] + 6 < amp) {
            amp = inArr[Math.round(j)];
            c++; // in some cases base f is lower than harmonic
            j = i * (c + 1);
        }
        while (inArr[Math.round(j)] < amp) {
            amp = inArr[Math.round(j)];
            c++; // in some cases base f is lower than harmonic
            j = i * (c + 1);
        }

        return c;
    }

    /**
     * @param {Float32Array|Number[]} inArr array of FFT amplitudes (in Db)
     * @param {Number} i Integer, base search frequency index
     * @param {Number} c Integer, up to c
     * @return {Number}
     * @private
     */
    _calculateEchoValue(inArr, i, c) {
        let v = (inArr[i] - this.minDb) / this.axMinIn;
        v /= 3;
        for (let l = 2, j = i * l; l < c; l++, j = i * l) {
            // this._normalRange
            const normd = (inArr[j] - this.minDb) / this.axMinIn;
            if (normd < 0) {
                continue;
            }
            v += normd;
        }

        return v;
    }
}