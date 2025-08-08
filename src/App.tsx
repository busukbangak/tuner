import { useState } from "react";
import { usePitchDetection } from "./shared/hooks/usePitchDetection";
import fftSizes from "./shared/models/fftSizes";
import { lerp } from "./shared/utils";

function App() {
  const [fftIndex, setFftIndex] = useState(0);
  const fftSize = fftSizes[fftIndex];
  const [note, octave, ctsOffPitch, isPermissionGranted] = usePitchDetection(fftSize);

  const handleToggleFftSize = () => setFftIndex((prev) => (prev + 1) % fftSizes.length);

  if (!isPermissionGranted) {
    return (
      <>
        <div>Please allow microphone access and reload the page.</div>;
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-5 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
        >
          Retry Microphone Access
        </button>
      </>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <button
        onClick={handleToggleFftSize}
        className="px-6 py-2 mb-6 text-white bg-blue-600 rounded shadow hover:bg-blue-700 transition"
      >
        Toggle FFT Size ({fftSize})
      </button>
      <h1 className="text-3xl font-bold mb-2">
        Note: <span className="text-blue-600">{note}{octave}</span>
      </h1>
      <p className="text-lg text-gray-700">
        Offpitch: <span className="font-mono">{lerp(ctsOffPitch as number, ctsOffPitch as number, 0.1)}</span>
      </p>
    </div>
  );
}

export default App;
