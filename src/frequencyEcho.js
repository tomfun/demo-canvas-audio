'use strict';

export class FrequencyEcho {
    constructor({minDb = -140, maxDb = -30, frequencyEcho = 40, frequencyZoom = 4, cbFreqDataFloat32}) {
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
        }
        this.axMinIn = this.maxDb - this.minDb;


        for (let i = 0; i < this.frequencyZoom; i++) {
            this._bufferdataFreqArray[i] = 0;
        }
        for (let i = 1; i < length; i++) {
            for (let j = 0; j < this.frequencyZoom; j++) {
                this._bufferdataFreqArray[(i - 1) * this.frequencyZoom + j] =
                    (fftAmplitudeDbFloatArray[i - 1] * (this.frequencyZoom - j) + fftAmplitudeDbFloatArray[i] * j)
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

        for (let i = length * this.frequencyZoom - 1; i > 0; i--) {
            const echoValue = this._normalRange(i) * this.frequencyEcho;
            if (echoValue <= 0) {
                continue; // to prevent another accumulative error when input is so low
            }
            if (i % 2) {
                // a = a + a * a2 * ef
                this._echoPlus((i - 1) / 2, echoValue * 0.5);
                this._echoPlus((i + 1) / 2, echoValue * 0.5);
            } else {
                this._echoPlus(i / 2, echoValue);
            }
        }

        // for (let i = 0; i < this._bufferdataFreqArray.length; i++) {
        //     this._bufferdataFreqArray2[i] = this._bufferdataFreqArray[i]
        // }
        // for (let i = 0; i < this.frequencyZoom; i++) {
        //     this._bufferdataFreqArray2[i] = 0;
        // }
        const tmpMatrix = new Array(this.frequencyZoom).fill(0).map((_v, i) => i).slice(1);
        const sum = tmpMatrix.reduce((a, v) => a + v);
        const tmpMatrix2 = tmpMatrix.slice(1).map(v => -v);
        const matrix = tmpMatrix2.concat([3 * sum]).concat(tmpMatrix2.reverse()).map(v => v / sum);
        for (let i = 0; i < this._bufferdataFreqArray.length - this.frequencyZoom; i++) {
            this._bufferdataFreqArray2[i] = matrix.reduce((a, m, j) => a + this._bufferdataFreqArray[i + j - this.frequencyZoom] * m, -7);
        }

        this.cbFreqDataFloat32(this._bufferdataFreqArray2, length * this.frequencyZoom, fDiscr);
    }

    _normalRange(i) {
        return (this._bufferdataFreqArray[i] - this.minDb) / this.axMinIn;
    }

    _echoPlus(id2, echoValue) {
        const plus = this._normalRange(id2) * echoValue;
        this._bufferdataFreqArray[id2] += plus - 2 * this._echoSum / this._bufferdataFreqArray.length;
        this._echoSum += plus;
    }
}