import { useEffect, useRef, useState } from "react";
import { autoCorrelate, centsOffPitch, getAudioData, getFrequencyFromMidiNumber, getMidiNumberFromFrequency, getOctaveFromFrequency, setupMicrophone } from "../utils";
import notes from "../models/notes";

export function usePitchDetection(fftSize: number) {
  const [note, setNote] = useState<string | null>(null);
  const [octave, setOctave] = useState<number | null>(null);
  const [ctsOffPitch, setCtsOffPitch] = useState<number | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<number | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = fftSize;
    const buffer = new Float32Array(analyser.fftSize);
    let pitchDetectionIntervalID: NodeJS.Timeout;

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


    const startPitchDetection = async () => {
      try {
        const mediaStream = await setupMicrophone();
        setIsPermissionGranted(true);
        const mediaSource = audioContext.createMediaStreamSource(mediaStream);

        if (isMobile) {
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 25; // TODO: Find better solution than only boosting for lower frequencies on mobile
          
          /* const lowPass = audioContext.createBiquadFilter();
          lowPass.type = "lowpass";
          lowPass.frequency.setValueAtTime(1000, audioContext.currentTime); */

          mediaSource.connect(gainNode);
          /* gainNode.connect(lowPass);
          lowPass.connect(analyser); */
          gainNode.connect(analyser);
        } else {
          mediaSource.connect(analyser);
        }

        pitchDetectionIntervalID = setInterval(() => {
          const audioBufferData = getAudioData(analyser, buffer);
          const correlatedFrequency = autoCorrelate(audioBufferData, audioContext.sampleRate);
          const midiNumber = getMidiNumberFromFrequency(correlatedFrequency);

          if (correlatedFrequency > 0 && midiNumber >= 0) {

            // Clear any pending clears if new valid pitch arrives
            if (clearTimeoutRef.current) {
              clearTimeout(clearTimeoutRef.current);
              clearTimeoutRef.current = null;
            }


            setFrequency(correlatedFrequency);
            setNote(notes[midiNumber % 12]);
            setOctave(getOctaveFromFrequency(correlatedFrequency));
            setCtsOffPitch(centsOffPitch(correlatedFrequency, getFrequencyFromMidiNumber(midiNumber)));
          } else {
            // No valid pitch now — schedule clearing after 500ms
            if (!clearTimeoutRef.current) {
              clearTimeoutRef.current = setTimeout(() => {
                setFrequency(null);
                setNote(null);
                setOctave(null);
                setCtsOffPitch(null);
                clearTimeoutRef.current = null;
              }, 500);
            }
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
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
      audioContext.close();
    };
  }, [fftSize]);

  return [note, octave, ctsOffPitch, frequency, isPermissionGranted] as const;
}
