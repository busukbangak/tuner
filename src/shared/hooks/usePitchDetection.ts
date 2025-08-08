import { useEffect, useState } from "react";
import autoCorrelate, { centsOffPitch, getAudioData, getFrequencyFromMidiNumber, getMidiNumberFromFrequency, getOctaveFromFrequency, setupMicrophone } from "../utils";
import notes from "../models/notes";

export function usePitchDetection(fftSize: number) {
  const [note, setNote] = useState<string | null>(null);
  const [octave, setOctave] = useState<number | null>(null);
  const [ctsOffPitch, setCtsOffPitch] = useState<number | null>(null);

  useEffect(() => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 16384; // 2048, 4096, 8192, 16384 The higher the better for lower pitches
    const buffer = new Float32Array(analyser.fftSize);
    let pitchDetectionIntervalID: number;


    const startPitchDetection = async () => {
      const mediaStream = await setupMicrophone();
      const mediaSource = audioContext.createMediaStreamSource(mediaStream);
      mediaSource.connect(analyser);

      pitchDetectionIntervalID = setInterval(() => {
        const audioBufferData = getAudioData(analyser, buffer);
        const frequency = autoCorrelate(audioBufferData, audioContext.sampleRate);
        const midiNumber = getMidiNumberFromFrequency(frequency);

        if (frequency > 0 && midiNumber >= 0) {
          setNote(notes[midiNumber % 12]);
          setOctave(getOctaveFromFrequency(frequency));
          setCtsOffPitch(centsOffPitch(frequency, getFrequencyFromMidiNumber(midiNumber)));
        } else {
          setNote(null);
          setOctave(null);
          setCtsOffPitch(null);
        }

        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
      }, 100);
    };

    startPitchDetection();

    return () => {
      if (pitchDetectionIntervalID) clearInterval(pitchDetectionIntervalID);
      audioContext.close();
    };
  }, [fftSize]);

  return [note, octave, ctsOffPitch];
}
