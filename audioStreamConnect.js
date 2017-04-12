if (!(window.AudioContext || window.webkitAudioContext)) {
    alert('Your browser not support Audio processing');
    throw new Error('AudioContext Not Supported')
}
console.debug('AudioContext supported.');

export function connectAudio({cbTimeDataUnit8, cbFreqDataFloat32, enableSoundOutput}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser not support Audio processing');
        throw new Error('mediaDevices.getUserMedia Not Supported')
    }
    console.debug('getUserMedia supported.');

    return navigator.mediaDevices
        .getUserMedia ({audio: true, video: false})
        .then(function(stream) {
            let audioCtx = new(window.AudioContext || window.webkitAudioContext)();
            let analyser = audioCtx.createAnalyser();

            const source = audioCtx.createMediaStreamSource(stream);

            source.connect(analyser);
            if (enableSoundOutput) {
                analyser.connect(audioCtx.destination);
            }

            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const dataTimeArray = new Uint8Array(bufferLength);
            const dataFreqArray = new Float32Array(bufferLength);

            function mainAudioLoop() {
                analyser.getByteTimeDomainData(dataTimeArray);
                analyser.getFloatFrequencyData(dataFreqArray);
                if (cbTimeDataUnit8) {
                    cbTimeDataUnit8(dataTimeArray, bufferLength)
                }
                if (cbFreqDataFloat32) {
                    cbFreqDataFloat32(dataFreqArray, bufferLength, audioCtx.sampleRate)
                }
                requestAnimationFrame(mainAudioLoop);
            }

            //Enter main Audio grab loop
            mainAudioLoop();
        })
        .catch(function(err) {
            alert('There is some error' + err);
            throw err;
        });
}
