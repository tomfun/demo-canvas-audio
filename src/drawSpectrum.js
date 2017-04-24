import {DrawAbstract} from './drawAbstract';

export class DrawSpectrum extends DrawAbstract {
    constructor(canvas) {
        super(canvas.getContext("2d"), canvas.width, canvas.height);
    }

    draw(fftAmplitudeDbFloatArray, length, fDiscr) {
        this.clear(0.01);

        this.ctx.fillStyle = 'rgb(0, 0, 0)';
        this.ctx.fillRect(0, 0, 1024, 768);

        const barWidth = this.width / length;
        let x = 0;
        const minDb = -140;
        const maxDb = -30;

        for (let i = 0; i < length; i++) {
            let barHeight = this.height * (fftAmplitudeDbFloatArray[i] - minDb) / (maxDb - minDb);
            this.ctx.fillStyle = `rgb(${Math.floor(barHeight + 80)}, 50, 50)`;
            this.ctx.fillRect(x, this.height - barHeight, barWidth, this.height + barHeight);
            x += barWidth;
        }
    }
}