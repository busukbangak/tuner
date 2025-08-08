import { useEffect } from "react";
import autoCorrelate, { getAudioData, setupMicrophone } from "./shared/utils";

function App() {

  useEffect(() => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    const buffer = new Float32Array(analyser.fftSize);
    let pitchDetectionIntervalID: number;

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const startPitchDetection = async () => {
      const mediaStream = await setupMicrophone(); // Setup Microphone
      const mediaSource = audioContext.createMediaStreamSource(mediaStream); // Stream all the audio from microphone into audioContext
      mediaSource.connect(analyser); // Connect the audio data to an analyser

      pitchDetectionIntervalID = setInterval(() => {
        const audioBufferData = getAudioData(analyser, buffer);
        console.log("Buffer:", audioBufferData);
        const frequency = autoCorrelate(audioBufferData, audioContext.sampleRate)
        console.log("Frequency:", frequency);
      }, 1000);
    };

    startPitchDetection();

    return () => {
      if (pitchDetectionIntervalID) clearInterval(pitchDetectionIntervalID);
      audioContext.close();
    }
  }, [])

  return (
    <>
      <button>asd</button>
    </>
  )
}

export default App
