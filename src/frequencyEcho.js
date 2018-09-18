'use strict';

export class FrequencyEcho {
    constructor({minDb = -140, maxDb = -30, frequencyEcho = 20, frequencyZoom = 4, cbFreqDataFloat32}) {
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
        }
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
        const harmonicMaxN = 3;
        const harmonicsNumbers = (new Array(harmonicMaxN - 1)).fill(0).map((_v, i) => 2 + i);

        if (!this._bufferdataFreqArray4 || this._bufferdataFreqArray4.length !== length * this.frequencyZoom) {
            this._bufferdataFreqArray4 = new Float32Array(this._bufferdataFreqArray.length);
            this._bufferdataFreqArray4.fill(0);


            for (let i = length * this.frequencyZoom - 1; i > 0; i--) {
                harmonicsNumbers.forEach((nHarm) => {
                    fractionalIndexSet(i, nHarm, (ind, part) => this._bufferdataFreqArray4[ind] += part);
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
                fractionalIndexSet(i, nHarm, (ind, part) => this._echoPlus(ind, part * echoValue));
            });
        }
        const shit = this._bufferdataFreqArray3.reduce((a, v) => a + v) / this._bufferdataFreqArray3.length;
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

        // high pass filter
        this.highPassSlope = 2000;
        for (let i = 1; i < this._bufferdataFreqArray.length - 1; i++) {
            this._bufferdataFreqArray2[i] -= this.highPassSlope * ((i + 1) / i - 1);
        }

        this.cbFreqDataFloat32(this._bufferdataFreqArray2, length * this.frequencyZoom, fDiscr);
    }

    _normalRange(i) {
        return (this._bufferdataFreqArray[i] - this.minDb) / this.axMinIn;
    }

    _echoPlus(idn, echoValue) {
        this._bufferdataFreqArray3[idn] += this._normalRange(idn) * echoValue;
    }
}