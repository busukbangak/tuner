import { useEffect, useState } from "react";
import { usePitchDetection } from "./shared/hooks/usePitchDetection";
import fftSizes from "./shared/models/fftSizes";
import { lerp } from "./shared/utils";
import Tuner from "./components/tuner";
import { Button } from "./components/ui/button";
import { Moon, Sun } from "lucide-react";

function App() {
  const [fftIndex, setFftIndex] = useState(0);
  const [note, octave, ctsOffPitch, frequency, isPermissionGranted] = usePitchDetection(fftSizes[fftIndex]);

  // TODO: Move this to usePitchDetection with optional Parameter if is smoothing
  const [smoothFrequency, setSmoothFrequency] = useState(0);
  const [smoothPitch, setSmoothPitch] = useState(0);

  useEffect(() => {
    if (frequency == null) {
      setSmoothFrequency(0);
    } else {
      setSmoothFrequency(prev => lerp(prev, frequency, 0.1));
    }
  }, [frequency]);

  useEffect(() => {
    if (ctsOffPitch == null) {
      setSmoothPitch(0);
    } else {
      setSmoothPitch(prev => lerp(prev, ctsOffPitch, 0.1));
    }
  }, [ctsOffPitch]);

  const handleToggleFftSize = () => setFftIndex((prev) => (prev + 1) % fftSizes.length);

  // TODO: move this into its own hook the dark/light system
  // TODO: Automatically take in system theme first
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  // Initialize theme from storage or system preference
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null
    if (stored === "light" || stored === "dark") {
      setTheme(stored)
    } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }, [])

  // Persist and set html.dark class
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("theme", theme)
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  // Update meta tag
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    (document.querySelector('meta[name="theme-color"]') as HTMLMetaElement).content =
      theme === "dark" ? "#171717" : "#f9f9f9";
  }, [theme]);

  const isDark = theme === "dark"

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
    <main
      className={`min-h-dvh p-6 sm:p-8 transition-colors ${isDark ? "bg-neutral-900 text-neutral-200" : "bg-neutral-50 text-neutral-900"
        }`}
    >
      {/* Card fills the available content box; padding acts as uniform outer margin */}
      <section
        className={`w-full rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col flex-1 min-h-[calc(100dvh-3rem)] sm:min-h-[calc(100dvh-4rem)] transition-colors ${isDark ? "border border-neutral-700/60 bg-neutral-900/60" : "border border-neutral-200 bg-white"
          }`}
      >
        {/* Title */}
        <h2 className={`text-2xl font-semibold mb-4 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>Tuner</h2>

        {/* Tuner area grows and stays centered when there's extra vertical space */}
        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-4xl">
            <Tuner value={smoothPitch} note={`${(note || octave) == null ? "—" : note as string + octave}`} />
          </div>
        </div>

        {/* Footer with horizontal divider line */}
        <div
          className={`mt-8 pt-4 flex items-center justify-between transition-colors ${isDark ? "border-t border-neutral-700/60" : "border-t border-neutral-200"
            }`}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="bg-amber-500 text-black hover:bg-amber-400 border-0 px-4 py-2 font-semibold rounded-lg"
              onClick={handleToggleFftSize}
            >
              FFT Size ({fftSizes[fftIndex]})
            </Button>

            {/* Theme toggle button (icons) */}
            <Button
              variant="secondary"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="bg-amber-500 text-black hover:bg-amber-400 border-0 px-3 py-2 rounded-lg"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">{isDark ? "Light mode" : "Dark mode"}</span>
            </Button>
          </div>

          {/* Frequency stacked on two lines */}
          <div className="text-right leading-tight">
            <div className={`${isDark ? "text-neutral-400" : "text-neutral-600"} text-sm`}>{"Frequency"}</div>
            <div className="text-cyan-500 font-medium text-lg">{frequency ? smoothFrequency.toFixed(2) : "000.00"} Hz</div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App;
