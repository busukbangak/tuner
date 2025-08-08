import { useState } from "react";
import { usePitchDetection } from "./shared/hooks/usePitchDetection";
import fftSizes from "./shared/models/fftSizes";
import { lerp } from "./shared/utils";

function App() {
  const [fftIndex, setFftIndex] = useState(0);
  const fftSize = fftSizes[fftIndex];
  const [note, octave, ctsOffPitch] = usePitchDetection(fftSize);

  const handleToggleFftSize = () => setFftIndex((prev) => (prev + 1) % fftSizes.length);

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
