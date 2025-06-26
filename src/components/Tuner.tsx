import React, { useEffect, useRef, useState } from 'react';
import { autoCorrelate } from '../utils/autoCorrelate';

const bufferSize = 8192;
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const HISTORY_LENGTH = 5;

const Tuner: React.FC = () => {
  const [note, setNote] = useState('—');
  const [frequency, setFrequency] = useState(0);
  const [cents, setCents] = useState(0);
  const [active, setActive] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Float32Array>(new Float32Array(bufferSize));
  const rafRef = useRef<number | null>(null);
  const sampleRateRef = useRef<number>(44100);
  const pitchHistory = useRef<number[]>([]);

  useEffect(() => {
    let stream: MediaStream;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new ((window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
        sampleRateRef.current = audioContext.sampleRate;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = bufferSize;
        analyserRef.current = analyser;
        source.connect(analyser);
        setActive(true);
        detect();
      } catch {
        setActive(false);
        alert('Microphone access denied or not available.');
      }
    }

    function detect() {
      if (!analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(dataRef.current);
      const pitch = autoCorrelate(dataRef.current, sampleRateRef.current);
      if (pitch > 0 && pitch < 2000) {
        pitchHistory.current.push(pitch);
        if (pitchHistory.current.length > HISTORY_LENGTH) pitchHistory.current.shift();
        let displayPitch;
        if (pitchHistory.current.length < HISTORY_LENGTH) {
          displayPitch = pitch;
        } else {
          displayPitch = Math.min(...pitchHistory.current);
        }
        const midi = Math.round(12 * (Math.log2(displayPitch / 440)) + 69);
        setNote(noteNames[midi % 12] + (Math.floor(midi / 12) - 1));
        setFrequency(displayPitch);
        const ref = 440 * Math.pow(2, (midi - 69) / 12);
        setCents(Math.round(1200 * Math.log2(displayPitch / ref)));
      } else {
        pitchHistory.current = [];
        setNote('—');
        setFrequency(0);
        setCents(0);
      }
      rafRef.current = requestAnimationFrame(detect);
    }

    start();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div>
      <div>Note: {note}</div>
      <div>Frequency: {frequency ? frequency.toFixed(2) + ' Hz' : '--'}</div>
      <div>Cents: {cents ? (cents > 0 ? '+' : '') + cents : '--'}</div>
      {!active && <div>Waiting for microphone access...</div>}
    </div>
  );
};

export default Tuner; 