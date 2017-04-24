'use strict';

export class DrawAbstract {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    _getCentreX() {
        return Math.min(this.height, this.width) / 2;
    }

    clear(opacity = 1.0) {
        this.ctx.fillStyle = `hsla(180, 50%, 0%, ${opacity})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        return this;
    }

    draw() {
        throw new Error('This method is abstract and must be implemented');
    }
}
