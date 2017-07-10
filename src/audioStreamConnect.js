/**
 * @param {AudioContext} audioCtx
 * @param source
 * @param cbTimeDataUnit8
 * @param cbFreqDataFloat32
 * @returns {{pause: (function()), play: (function()), mute: (function()), unmute: (function())}}
 */
export function connectAudio(audioCtx, {cbTimeDataUnit8, cbFreqDataFloat32}) {
    const analyser = audioCtx.createAnalyser();
    const gainNode = audioCtx.createGain();

    analyser.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    analyser.fftSize = 2048;
    analyser.minDecibels = -140;
    analyser.maxDecibels = -30;
    analyser.smoothingTimeConstant = 0.2;
    const bufferLength = analyser.frequencyBinCount;
    const dataTimeArray = new Uint8Array(bufferLength);
    const dataFreqArray = new Float32Array(bufferLength);

    let isPaused = false;
    function mainAudioLoop() {
        analyser.getByteTimeDomainData(dataTimeArray);
        analyser.getFloatFrequencyData(dataFreqArray);
        if (cbTimeDataUnit8) {
            cbTimeDataUnit8(dataTimeArray, bufferLength)
        }
        if (cbFreqDataFloat32) {
            cbFreqDataFloat32(dataFreqArray, bufferLength, audioCtx.sampleRate)
        }
        if (!isPaused) {
            requestAnimationFrame(mainAudioLoop);
        }
    }

    //Enter main Audio grab loop
    mainAudioLoop();
    return {
        pause() {
            isPaused = true;
        },
        play() {
            isPaused = false;
            setTimeout(mainAudioLoop, 0);
        },
        outputGain(gain = 1) {
            gainNode.gain.value = gain;
        },
        connect(source) {
            source.connect(analyser);
        },
        disconnect(source) {
            source.disconnect(analyser);
        }
    }
}
