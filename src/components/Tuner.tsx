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
  const [gainLevel, setGainLevel] = useState(5.0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Float32Array>(new Float32Array(bufferSize));
  const rafRef = useRef<number | null>(null);
  const sampleRateRef = useRef<number>(44100);
  const pitchHistory = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    let stream: MediaStream;

    async function start() {
      try {
        // More aggressive audio constraints for mobile
        const constraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
            sampleRate: { ideal: 44100 },
            channelCount: { ideal: 1 },
            // Mobile-specific optimizations
            latency: { ideal: 0.01 },
            sampleSize: { ideal: 16 }
          }
        };

        // Try multiple constraint sets for mobile compatibility
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          try {
            // Fallback 1: Try with different sample rate
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: true,
                sampleRate: { ideal: 22050 }
              }
            });
          } catch {
            try {
              // Fallback 2: Try with minimal constraints
              stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: true
                }
              });
            } catch {
              // Final fallback: basic audio
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
          }
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
        
        // Add a gain node to boost the signal
        const gainNode = audioContext.createGain();
        gainNode.gain.value = gainLevel; // Use the state value
        gainNodeRef.current = gainNode; // Store reference for later updates
        
        analyser.fftSize = bufferSize;
        analyser.smoothingTimeConstant = 0.3; // Reduced for more responsive detection
        analyser.minDecibels = -90; // Lower threshold for mobile
        analyser.maxDecibels = -10;
        
        // Connect: source -> gain -> analyser
        source.connect(gainNode);
        gainNode.connect(analyser);
        
        analyserRef.current = analyser;
        setActive(true);
        
        // Log successful audio setup for debugging
        console.log('Audio setup successful:', {
          sampleRate: audioContext.sampleRate,
          bufferSize: bufferSize,
          constraints: constraints
        });
        
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
      
      // Use a lower threshold for mobile devices
      const threshold = 0.001; // Further reduced from 0.005 for mobile
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

  const updateGain = (newGain: number) => {
    setGainLevel(newGain);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newGain;
    }
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
        {volume < 0.001 && (
          <span style={{ color: 'red', marginLeft: '10px' }}>
            ⚠️ Too quiet - speak louder or move closer to microphone
          </span>
        )}
      </div>
      <div style={{ margin: '15px 0' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Gain Boost: {gainLevel.toFixed(1)}x
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="0.5"
          value={gainLevel}
          onChange={(e) => updateGain(parseFloat(e.target.value))}
          style={{ width: '200px' }}
        />
        <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
          Increase this if volume is too low
        </div>
      </div>
      {!active && (
        <div style={{ color: 'red', margin: '20px 0' }}>
          Waiting for microphone access... Please grant microphone permissions.
        </div>
      )}
      <div style={{ fontSize: '0.9em', margin: '20px 0', color: '#888' }}>
        <p>Try humming, whistling, or playing any instrument near your microphone.</p>
        <p>Make sure your microphone is not muted and volume is turned up.</p>
        <p><strong>Mobile Tips:</strong></p>
        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          <li>Hold your phone close to your mouth (2-3 inches)</li>
          <li>Try speaking loudly or whistling</li>
          <li>Make sure your phone's microphone isn't blocked</li>
          <li>Try in a quiet environment</li>
          <li>Some phones have aggressive noise suppression - try different browsers</li>
        </ul>
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