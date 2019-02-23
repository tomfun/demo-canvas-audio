'use strict';
import {DrawCircle} from './drawCircle';
import {DrawSpectrum} from './drawSpectrum';
import {DrawTime} from './drawTime';
import {connectAudio} from './audioStreamConnect';
import {createContext, getAudioElementSource, getMicrophoneSource} from './audioSource';

const micToggleControl = document.getElementById('mic-toggle');

let isAppStarted = false;

function startApp() {
    if (isAppStarted) {
        return;
    }
    isAppStarted = true;

    const audioCtx = createContext();

    const circleDrawer = new DrawCircle(document.getElementById('canvasCircle'));
    const spectrumDrawer = new DrawSpectrum(document.getElementById('canvasSpectrum'));
    const timeDrawer = new DrawTime(document.getElementById('canvasTime'));

    const visualizeApi = connectAudio(audioCtx, {
        cbTimeDataUnit8: timeDrawer.draw.bind(timeDrawer),
        cbFreqDataFloat32(...args) {
            circleDrawer.draw(...args);
            spectrumDrawer.draw(...args);
        },
    });

// ---------------------- mute --------------------

    const muteToggleControl = document.getElementById('mute-toggle');
    muteToggleControl.addEventListener('click', () => {
        const mute = !muteToggleControl.dataset['isMute'] || '';
        muteToggleControl.value = mute ? 'unmute' : 'mute';
        visualizeApi.outputGain(mute ? 0 : 1);
        muteToggleControl.dataset['isMute'] = mute;
    });


    // --------------- get audio microphone ------------
    let micSource = null;
    micToggleControl.addEventListener('click', () => {
        if (!micSource) {
            getMicrophoneSource(audioCtx)
                .then((source) => {
                    micSource = source;
                    visualizeApi.connect(micSource);
                });

        }
        if (!micSource) {
            micToggleControl.value = 'disconnect microphone';
            micToggleControl.dataset['isMute'] = '';
            return;
        }
        const mute = !micToggleControl.dataset['isMute'] || '';
        micToggleControl.value = mute ? 'connect microphone' : 'disconnect microphone';
        micToggleControl.dataset['isMute'] = mute;
        if (mute) {
            visualizeApi.disconnect(micSource);
        } else {
            visualizeApi.connect(micSource);
        }
    });

    // --------------- get audio from local file ------------
    const fileSource = getAudioElementSource(audioCtx, audio);
    visualizeApi.connect(fileSource);
}


// --------------- get audio microphone ------------

micToggleControl.addEventListener('click', initAppOnMicClick);

function initAppOnMicClick() {
    startApp(); // add another onClick listener
    micToggleControl.removeEventListener('click', initAppOnMicClick);
    micToggleControl.click(); // send virual click to another listener
}

// --------------- get audio from local file ------------

const audio = document.getElementById('audio-source');

document.getElementById('file-uploader').addEventListener('change', (e) => {
    startApp();
    const el = e.target;
    const file = el.files[0];
    audio.src = URL.createObjectURL(file);
});
