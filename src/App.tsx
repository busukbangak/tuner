import { usePitchDetection } from "./shared/hooks/usePitchDetection";

function App() {

  const [note, octave, ctsOffPitch] = usePitchDetection();


  return (
    <>
      <h1>Note: {note}{octave}</h1>
      <p>offpitch: {ctsOffPitch}</p>
    </>
  );
}

export default App;
