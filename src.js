'use strict';
import {DrawCircle} from './drawCircle'
import {DrawTime} from './drawTime';
import {connectAudio} from './audioStreamConnect';

const circleDrawer = new DrawCircle(document.getElementById('canvasCircle'));
const timeDrawer = new DrawTime(document.getElementById('canvasTime'));

connectAudio({
    cbTimeDataUnit8: timeDrawer.draw.bind(timeDrawer),
    cbFreqDataFloat32: circleDrawer.draw.bind(circleDrawer),
});

circleDrawer.drawSingleFrequency(5000, -60);