import { useEffect, useState } from "react";
import { autoCorrelate, centsOffPitch, getAudioData, getFrequencyFromMidiNumber, getMidiNumberFromFrequency, getOctaveFromFrequency, setupMicrophone } from "../utils";
import notes from "../models/notes";

export function usePitchDetection(fftSize: number) {
  const [note, setNote] = useState<string | null>(null);
  const [octave, setOctave] = useState<number | null>(null);
  const [ctsOffPitch, setCtsOffPitch] = useState<number | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<number | null>(null);



  useEffect(() => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    const buffer = new Float32Array(analyser.fftSize);
    let pitchDetectionIntervalID: NodeJS.Timeout;
    let autoGainIntervalID: NodeJS.Timeout;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const startPitchDetection = async () => {
      try {
        const mediaStream = await setupMicrophone();
        setIsPermissionGranted(true);
        const mediaSource = audioContext.createMediaStreamSource(mediaStream);

        let inputAnalyser: AnalyserNode | null = null;
        let gainNode: GainNode | null = null;

        if (isMobile) {
          gainNode = audioContext.createGain();
          gainNode.gain.value = 1.0; // Start at normal volume

          inputAnalyser = audioContext.createAnalyser();
          inputAnalyser.fftSize = 512; // Small buffer for faster reaction

          mediaSource.connect(gainNode);
          gainNode.connect(inputAnalyser);
          inputAnalyser.connect(analyser);

          // Auto-gain loop
          const inputBuffer = new Uint8Array(inputAnalyser.frequencyBinCount);
          const targetLevel = 100; // Target average loudness (0–255)
          autoGainIntervalID = setInterval(() => {
            if (!inputAnalyser || !gainNode) return;

            inputAnalyser.getByteTimeDomainData(inputBuffer);

            // Calculate average loudness
            let sum = 0;
            for (let i = 0; i < inputBuffer.length; i++) {
              const val = inputBuffer[i] - 128; // Centered at 128
              sum += Math.abs(val);
            }
            const avg = sum / inputBuffer.length;

            // Adjust gain slowly toward target
            if (avg < targetLevel) {
              gainNode.gain.value = Math.min(gainNode.gain.value + 0.05, 4.0);
            } else if (avg > targetLevel * 1.2) {
              gainNode.gain.value = Math.max(gainNode.gain.value - 0.05, 1.0);
            }
          }, 200);
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
      if (autoGainIntervalID) clearInterval(autoGainIntervalID);
      audioContext.close();
    };
  }, [fftSize]);

  return [note, octave, ctsOffPitch, frequency, isPermissionGranted] as const;
}
