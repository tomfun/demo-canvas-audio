export function createContext() {
    if (!(window.AudioContext || window.webkitAudioContext)) {
        alert('Your browser not support Audio processing');
        throw new Error('AudioContext Not Supported')
    }
    console.debug('AudioContext supported.');

    return new (window.AudioContext || window.webkitAudioContext)();
}

export function getMicrophoneSource(audioCtx) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser not support Audio processing');
        throw new Error('mediaDevices.getUserMedia Not Supported')
    }
    console.debug('getUserMedia supported.');

    return navigator.mediaDevices
        .getUserMedia({audio: true, video: false})
        .then(function (stream) {
            return audioCtx.createMediaStreamSource(stream);
        })
        .catch(function (err) {
            alert('There is some error while get audio from you microphone: ' + err);
            throw err;
        });
}

export function getAudioElementSource(audioCtx, audioElement) {
    return audioCtx.createMediaElementSource(audioElement);
}
