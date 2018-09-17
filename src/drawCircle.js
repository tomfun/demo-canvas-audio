'use strict';
import {DrawAbstract} from './drawAbstract';

export class DrawCircle extends DrawAbstract {
    constructor(canvas) {
        super(canvas.getContext("2d"), canvas.width, canvas.height);
    }

    clear() {
        super.clear();
        const centrD2 = this._getCentreX();
        this.ctx.strokeStyle = 'hsl(180, 50%, 50%)';
        this.ctx.beginPath();
        this.ctx.arc(centrD2, centrD2, centrD2, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.stroke();
        return this;
    }

    _drawSingleFrequency(freq, ampl) {
        const minFreq = 80;
        const maxFreq = 16 * 1000;
        const minDbVolume = 90;
        if (freq < minFreq || freq > maxFreq) {
            return this;
        }
        const freqLog = Math.log2(freq) - Math.log2(minFreq);
        const widthFreqLog = Math.log2(maxFreq) - Math.log2(minFreq);
        const hue = Math.round(360 * freqLog / widthFreqLog);

        const angle = (freqLog - (freqLog | 0)) * Math.PI * 2;

        // if ampl is not in DB: ampl is in [0, 1]
        // const bright = Math.min(Math.max(minDbVolume + Math.log10(ampl) * 20, 0) / minDbVolume, 1);
        const bright = Math.min(Math.max(minDbVolume + ampl, 0) / minDbVolume, 1);
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${bright})`;
        const centrD2 = this._getCentreX();
        this.ctx.moveTo(centrD2, centrD2);
        this.ctx.lineTo(centrD2 + centrD2 * Math.sin(angle), centrD2 + centrD2 * Math.cos(angle));

        // debug info
        // console.log(freqLog, hue, angle, bright);
        // console.log(freq, ampl);
        // console.log(ampl, bright);
        return this;
    }

    drawSingleFrequency(freq, ampl) {
        // this.clear();
        this.ctx.beginPath();
        this._drawSingleFrequency(freq, ampl);
        this.ctx.closePath();
        this.ctx.stroke();
        return this;
    }

    draw(fftAmplitudeDbFloatArray, length, fDiscr) {
        this.clear();
        // this.ctx.beginPath();
        const fftLength = length * 2;
        const norma = 1; // Math.sqrt(bufferLength) / 2; - for real FFT
        for (let i = 0; i < length; i++) {
            // const freq = fftAmplitudeDbFloatArray[i];
            // const a = Math.sqrt(freq.real * freq.real + freq.imag * freq.imag);
            const a = fftAmplitudeDbFloatArray[i] / norma; // !!
            const f = i * fDiscr / fftLength;
            this.drawSingleFrequency(f, a);
            // this._drawSingleFrequency(f, a);
        }
        // this.ctx.closePath();
        // this.ctx.stroke();
        return this;
    }
}
