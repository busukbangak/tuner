import { useEffect, useState } from "react";
import { autoCorrelate, centsOffPitch, getAudioData, getFrequencyFromMidiNumber, getMidiNumberFromFrequency, getOctaveFromFrequency, setupMicrophone } from "../utils";
import notes from "../models/notes";

export function usePitchDetection(fftSize: number) {
  const [note, setNote] = useState<string | null>(null);
  const [octave, setOctave] = useState<number | null>(null);
  const [ctsOffPitch, setCtsOffPitch] = useState<number | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<number | null>(null);

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    const buffer = new Float32Array(analyser.fftSize);
    let pitchDetectionIntervalID: NodeJS.Timeout;


    const startPitchDetection = async () => {
      try {
        const mediaStream = await setupMicrophone();
        setIsPermissionGranted(true);
        const mediaSource = audioContext.createMediaStreamSource(mediaStream);

        if (isMobile) {
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 15.0; // 15x boost
          mediaSource.connect(gainNode);
          gainNode.connect(analyser);
        } else {
          mediaSource.connect(analyser);
        }

        pitchDetectionIntervalID = setInterval(() => {
          const audioBufferData = getAudioData(analyser, buffer);
          const correlatedFrequency = autoCorrelate(audioBufferData, audioContext.sampleRate);
          const midiNumber = getMidiNumberFromFrequency(correlatedFrequency);

          if (correlatedFrequency > 0 && midiNumber >= 0) {
            setFrequency(correlatedFrequency);
            setNote(notes[midiNumber % 12]);
            setOctave(getOctaveFromFrequency(correlatedFrequency));
            setCtsOffPitch(centsOffPitch(correlatedFrequency, getFrequencyFromMidiNumber(midiNumber)));
          } else {
            setFrequency(null);
            setNote(null);
            setOctave(null);
            setCtsOffPitch(null);
          }

          if (audioContext.state === "suspended") {
            audioContext.resume();
          }
        }, 100);
      } catch (err) {
        setIsPermissionGranted(false);
      }
    };

    startPitchDetection();

    return () => {
      if (pitchDetectionIntervalID) clearInterval(pitchDetectionIntervalID);
      audioContext.close();
    };
  }, [fftSize]);

  return [note, octave, ctsOffPitch, frequency, isPermissionGranted] as const;
}
