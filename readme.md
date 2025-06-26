# 🎵 React Tuner App

A simple and responsive tuner app built with **React** and using **Pitchy.js** for real-time pitch detection. It detects musical notes from microphone input, displays the closest note, and how off-pitch the input is in **cents** (±50 cents range).

## 📦 Tech Stack

- **React** – UI and app logic
- **Pitchy.js** – Real-time pitch detection
- **Web Audio API** – Microphone access
- **Canvas or SVG** – Optional for visual feedback (needle/indicator)

---

## 🎯 Features

### 🔊 Real-Time Pitch Detection
- Uses the microphone to capture audio input.
- Detects pitch in real-time using **Pitchy.js**.

### 🎼 Closest Note Display
- Converts the detected pitch (Hz) to the **nearest musical note**.
- Displays:
  - The detected note (e.g., A4, G#3)
  - The frequency in Hz

### 🎯 Cents Deviation
- Calculates the **cents offset** from the detected pitch to the closest note.
- Displays a value from **-50 to +50 cents**.
- If the detected tone is closer to a different note, it automatically **switches the note display** and updates the cents deviation.

### 📊 Visual Indicator
- Horizontal scale from -50 to +50 cents (like a classic tuner).
- Optional: a moving needle or color indicator to show if you are flat, sharp, or in tune.

### 🔄 Reactive UI
- Updates in real time as sound is detected.
- If no sound is detected for a short period, reset UI.

---

## 🧩 Components Overview

- `App`: Main container, initializes audio and state.
- `Tuner`: Handles pitch detection and UI display.
- `NoteDisplay`: Shows note name and frequency.
- `CentsIndicator`: Visual representation (e.g., bar/needle).

---
