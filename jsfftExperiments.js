'use strict';
import {ComplexArray} from 'jsfft';

const ctx = document.getElementById('canvas').getContext('2d');

class DrawOnRect {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    _getCentreX() {
        return Math.min(this.height, this.width) / 2;
    }

    clear() {
        ctx.fillStyle = 'hsla(180, 50%, 0%, 1.0)';
        ctx.fillRect(0, 0, this.width, this.height);
        const centrD2 = this._getCentreX();
        ctx.strokeStyle = 'hsl(180, 50%, 50%)';
        ctx.beginPath();
        ctx.arc(centrD2, centrD2, centrD2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
        return this;
    }

    drawSingleFrequency(freq, ampl) {
        const minFreq = 20;
        const maxFreq = 20 * 1000;
        const minDbVolume = 40;
        if (freq < minFreq || freq > maxFreq) {
            return this;
        }
        const freqLog = Math.log2(freq) - Math.log2(minFreq);
        const widthFreqLog = Math.log2(maxFreq) - Math.log2(minFreq);
        const hue = Math.round(360 * freqLog / widthFreqLog);

        const angle = (freqLog - (freqLog | 0)) * Math.PI * 2;

        const bright = Math.min(Math.max(minDbVolume + Math.log10(ampl) * 20, 0) / minDbVolume, 1);
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${bright})`;
        const centrD2 = this._getCentreX();
        ctx.beginPath();
        ctx.moveTo(centrD2, centrD2);
        ctx.lineTo(centrD2 + centrD2 * Math.sin(angle), centrD2 + centrD2 * Math.cos(angle));
        ctx.closePath();
        ctx.stroke();
        // console.log(freqLog, hue, angle, bright);
        // console.log(freq, ampl);
        // console.log(ampl, bright);
        return this;
    }
}

const drawer = new DrawOnRect(ctx, 1024, 768);
drawer.clear();

// (new Array(40)).fill(0).map((v, i) => 20 + i).forEach((f) => drawer.drawSingleFrequency(f, 3000 / (f * f * f)));

// FFT

const fDiscr = 44100;
const bufferLengthMs = 1000 / 1000;
const bufferLength = 4096;
console.log('must be buffer length', bufferLengthMs * fDiscr / 1000)
const data = new ComplexArray(/*Math.ceil(bufferLengthMs * fDiscr / 1000)*/ bufferLength).map((value, i, n) => {
    value.real = (i > n / 3 && i < 2 * n / 3) ? 1 : 0;
    // value.real = (i > n/3 && i < 2*n/3) ? 1 : 0;
    // 2 * pi * f * t
    // t: i / fDiscr
    // value.real = Math.sin(2 * Math.PI * 11025 * i / fDiscr)/* + Math.sin(2 * Math.PI * 20 * i / fDiscr)*/;
});

console.log('complex data', data)
data.FFT();

const amplitudes = new Array(bufferLength);
const norma = Math.sqrt(bufferLength) / 2;
data.map((freq, i, n) => {
    const a = Math.sqrt(freq.real * freq.real + freq.imag * freq.imag);
    amplitudes[i] = a / norma; // !!
    const f = i * fDiscr / bufferLength;
    drawer.drawSingleFrequency(f, a / norma);
});

// console.log('complex FFT', data)
console.table([data.real, data.imag, amplitudes])

// -------------------------------------

navigator.mediaDevices.getUserMedia({audio: true})
    .then((stream) => {
        /* use the stream */
        const trs = stream.getAudioTracks()
        /** @var MediaStreamTrack */
        const  track = trs[0];
        window.track = track
        console.log(trs)
    })
    .catch((err) =>
        alert(`Sorry, there is error with your audio: ${err}`)
    );