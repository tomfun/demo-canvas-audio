'use strict';
import {DrawCircle} from './drawCircle'
import {DrawSpectrum} from './drawSpectrum'
import {DrawTime} from './drawTime';
import {connectAudio} from './audioStreamConnect';

const circleDrawer = new DrawCircle(document.getElementById('canvasCircle'));
const spectrumDrawer = new DrawSpectrum(document.getElementById('canvasSpectrum'));
const timeDrawer = new DrawTime(document.getElementById('canvasTime'));

connectAudio({
    cbTimeDataUnit8: timeDrawer.draw.bind(timeDrawer),
    // cbFreqDataFloat32: circleDrawer.draw.bind(circleDrawer),
    // cbFreqDataFloat32: spectrumDrawer.draw.bind(spectrumDrawer),
    cbFreqDataFloat32(...args) {
        circleDrawer.draw(...args);
        spectrumDrawer.draw(...args);
    },
});

// circleDrawer.drawSingleFrequency(5000, -60);