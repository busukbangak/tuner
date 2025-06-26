import React, { useEffect, useRef, useState } from 'react';
import { autoCorrelate } from '../utils/autoCorrelate';

const bufferSize = 4096;
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const HISTORY_LENGTH = 3;

const Tuner: React.FC = () => {
  const [note, setNote] = useState('—');
  const [frequency, setFrequency] = useState(0);
  const [cents, setCents] = useState(0);
  const [active, setActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isPlayingTone, setIsPlayingTone] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Float32Array>(new Float32Array(bufferSize));
  const rafRef = useRef<number | null>(null);
  const sampleRateRef = useRef<number>(44100);
  const pitchHistory = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let stream: MediaStream;

    async function start() {
      try {
        const constraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: { ideal: 44100 },
            channelCount: { ideal: 1 },
            latency: { ideal: 0.01 },
            sampleSize: { ideal: 16 }
          }
        };

        // Try to get user media with fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // Fallback to basic audio constraints if the above fails
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        // Create audio context with mobile compatibility
        const AudioContextClass = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        sampleRateRef.current = audioContext.sampleRate;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = bufferSize;
        analyser.smoothingTimeConstant = 0.3;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        
        analyserRef.current = analyser;
        source.connect(analyser);
        setActive(true);
        detect();
      } catch (error) {
        console.error('Audio setup error:', error);
        setActive(false);
        alert('Microphone access denied or not available. Please ensure microphone permissions are granted.');
      }
    }

    function detect() {
      if (!analyserRef.current) return;
      
      analyserRef.current.getFloatTimeDomainData(dataRef.current);
      
      let rms = 0;
      for (let i = 0; i < dataRef.current.length; i++) {
        rms += dataRef.current[i] * dataRef.current[i];
      }
      rms = Math.sqrt(rms / dataRef.current.length);
      setVolume(rms);
      
      const threshold = 0.005;
      if (rms < threshold) {
        pitchHistory.current = [];
        setNote('—');
        setFrequency(0);
        setCents(0);
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const pitch = autoCorrelate(dataRef.current, sampleRateRef.current);
      
      if (pitch > 0 && pitch < 3000) {
        pitchHistory.current.push(pitch);
        if (pitchHistory.current.length > HISTORY_LENGTH) {
          pitchHistory.current.shift();
        }
        
        let displayPitch;
        if (pitchHistory.current.length < HISTORY_LENGTH) {
          displayPitch = pitch;
        } else {
          const sorted = [...pitchHistory.current].sort((a, b) => a - b);
          displayPitch = sorted[Math.floor(sorted.length / 2)];
        }
        
        const midi = Math.round(12 * (Math.log2(displayPitch / 440)) + 69);
        if (midi >= 0 && midi < 127) {
          setNote(noteNames[midi % 12] + (Math.floor(midi / 12) - 1));
          setFrequency(displayPitch);
          const ref = 440 * Math.pow(2, (midi - 69) / 12);
          setCents(Math.round(1200 * Math.log2(displayPitch / ref)));
        }
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
      if (audioContextRef.current) audioContextRef.current.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const playTestTone = () => {
    if (!audioContextRef.current) return;
    
    setIsPlayingTone(true);
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4 note
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 2);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 2);
    
    setTimeout(() => setIsPlayingTone(false), 2000);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Pitch Detector</h2>
      <div style={{ fontSize: '2em', margin: '20px 0' }}>
        Note: <strong>{note}</strong>
      </div>
      <div style={{ fontSize: '1.2em', margin: '10px 0' }}>
        Frequency: <strong>{frequency ? frequency.toFixed(1) + ' Hz' : '--'}</strong>
      </div>
      <div style={{ fontSize: '1.2em', margin: '10px 0' }}>
        Cents: <strong>{cents ? (cents > 0 ? '+' : '') + cents : '--'}</strong>
      </div>
      <div style={{ fontSize: '1em', margin: '10px 0', color: '#666' }}>
        Volume: {(volume * 100).toFixed(1)}%
      </div>
      {!active && (
        <div style={{ color: 'red', margin: '20px 0' }}>
          Waiting for microphone access... Please grant microphone permissions.
        </div>
      )}
      <div style={{ fontSize: '0.9em', margin: '20px 0', color: '#888' }}>
        <p>Try humming, whistling, or playing any instrument near your microphone.</p>
        <p>Make sure your microphone is not muted and volume is turned up.</p>
      </div>
      <button 
        onClick={playTestTone}
        disabled={isPlayingTone || !active}
        style={{
          padding: '10px 20px',
          fontSize: '1em',
          backgroundColor: isPlayingTone ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isPlayingTone ? 'not-allowed' : 'pointer',
          margin: '10px'
        }}
      >
        {isPlayingTone ? 'Playing Test Tone...' : 'Play Test Tone (A4)'}
      </button>
    </div>
  );
};

export default Tuner; 