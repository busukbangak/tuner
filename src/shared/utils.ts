interface ExtendedAudioConstraints extends MediaTrackConstraints {
    sampleRate?: number;
    latency?: number;
    channelCount?: number;
}

export const setupMicrophone = async () => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const audioConstraints: ExtendedAudioConstraints = {};

    if (isMobile) {
        audioConstraints.latency = 0;        // Low latency
        audioConstraints.channelCount = 2;   // Stereo if supported
        audioConstraints.echoCancellation = false;
        audioConstraints.noiseSuppression = false;
        audioConstraints.autoGainControl = false;
    }

    try {
        const microphone = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
        });
        return microphone;
    } catch (err) {
        console.error("Microphone access failed:", err);
        throw err;
    }
};



export const getAudioData = (analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>) => {
    analyser.getFloatTimeDomainData(buffer);
    return buffer;
}

export const getMidiNumberFromFrequency = (frequency: number) => {
    return Math.round(12 * (Math.log(frequency / 440) / Math.log(2))) + 69
}

export const getFrequencyFromMidiNumber = (midiNumber: number) => {
    return 440 * Math.pow(2, ((midiNumber - 69) / 12));
}

export const getOctaveFromFrequency = (frequency: number) => {
    const midiNumber = getMidiNumberFromFrequency(frequency);
    return Math.floor(midiNumber / 12) - 1;
}

export const centsOffPitch = (frequencyPlayed: number, correctFrequency: number) => {
    return Math.floor((1200 * Math.log(frequencyPlayed / correctFrequency)) / Math.log(2));
}

// Info: Copied from here https://github.com/zplata/tuner-app/blob/main/autocorrelate.js
export const autoCorrelate = (buffer: Float32Array<ArrayBuffer>, sampleRate: number) => {
    let SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01)
        // not enough signal
        return -1;

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++)
        if (Math.abs(buffer[i]) < thres) {
            r1 = i;
            break;
        }
    for (let i = 1; i < SIZE / 2; i++)
        if (Math.abs(buffer[SIZE - i]) < thres) {
            r2 = SIZE - i;
            break;
        }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buffer[j] * buffer[j + i];

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}

/* export const lerp = (start: number, end: number, factor: number) => {
    return (1 - factor) * start + factor * end;
} */