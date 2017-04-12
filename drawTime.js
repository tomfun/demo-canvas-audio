import {DrawAbstract} from './drawAbstract';

export class DrawTime extends DrawAbstract {
    constructor(canvas) {
        super(canvas.getContext("2d"), canvas.width, canvas.height);
    }
    draw(uintArray, bufferLength) {
        this.clear();

        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = 'rgb(255, 255, 255)';

        this.ctx.beginPath();

        const sliceWidth = canvasTime.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            let y = uintArray[i] * canvasTime.height / 256; // UInt8 max is 256

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(canvasTime.width, canvasTime.height / 2);
        this.ctx.stroke();
    }
}