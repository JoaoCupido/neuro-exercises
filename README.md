# Neuro Exercises

A collection of cognitive tools built with **Astro**, **Tailwind CSS**, and optional **Tauri** integration. It currently includes these interactive modules:

* **🖌️ Drawing Tool** – A URL‑configurable drawing canvas
* **🔗 Trail Making Test (TMT)** – A neuropsychological sequencing exercise
* **📷 Camera** – Camera-based activities including object detection and facial emotion recognition using webcam
* **🔣 Text Recognition** – Convert handwritten/drawn content to text with OCR capabilities
* **🔍 Find Shapes** – A dynamic visual search game with customizable targets, movement, and difficulty

The app can be used:

* **Online**, with the help of GitHub Pages
* **Locally**, with `npm run dev`
* **As a desktop app**, using **Tauri**.
* **As a mobile app**, using **Tauri** (NOTE: it's an experimental feature, meaning some features might be broken).

---

## Features

### Drawing Tool

* 🎨 Customizable brush sizes and colors
* 🧹 Optional eraser mode
* 🖼️ Background image support with opacity control
* 🔲 Grid/pattern background option
* 🔗 Fully configurable through URL parameters
* 📱 Touch‑friendly and responsive

### Trail Making Test (TMT)

* 🔢 Auto-generated TMT layout (nodes placed at random or fixed, based on user's request)
* 🔤 Configurable symbol order: numbers / letters / mixed
* ⏱️ Built‑in timer
* 🖼️ Background image support with opacity control
* 🔲 Grid/pattern background option
* 📝 Result logging

### Camera Exercise

* 🎯 **Object Detection** – Real-time identification of everyday objects through webcam
* 😊 **Facial Emotion Recognition** – Detects and displays emotional expressions (happy, sad, angry, surprised, etc.)
* 📱 **Front/Back Camera Selection** – Switch between user-facing and environment-facing cameras
* 🎚️ **Adjustable Sensitivity** – Fine-tune detection thresholds (0 to 1)
* 📊 **Customizable Display** – Control position and maximum number of detection results shown
* 🎨 **Camera Opacity Control** – Adjust camera feed transparency (0.0 to 1.0)

### Text Recognition Exercise

* ✍️ **Handwriting to Text** – Convert drawn/written content to digital text using OCR (Optical Character Recognition)
* ✅ **Answer Validation** – Compare recognized text against predefined correct answers
* 🌐 **Multi-Language Support** – Configurable OCR language (English, Spanish, Portuguese, etc.)
* 🔤 **Detection Modes** – Restrict recognition to letters only, numbers only, or both
* 🎨 **Drawing Controls** – Adjustable pencil color and size
* 🧹 **Canvas Management** – Clear, undo/redo functionality with customizable button positions
* 🎯 **Multiple OCR Engines** – Support for Tesseract, Guten, and PaddleOCR engines

### Find Shapes Exercise
* 🎯 **Target-Based Gameplay** – Find shapes based on color, shape, or specific combinations
* 🔢 **Configurable Target Count** – Guarantee an exact number of targets using targetCount
* 🎲 **Deterministic Mode** – Use seed for reproducible shape layouts and movement
* 🎨 **Custom Shape & Color Pools** – Fully control which shapes and colors appear
* 🌀 **Multiple Movement Types** – Linear, swirly, bouncy, wavy, spiral, and random motion
* 🧱 **Border Behaviors** – Collision (bounce) or wrap-around screen edges
* ⏱️ **Built-in Timer & Performance Tracking** – Tracks time, correct selections, and errors
* 🧾 **Detailed Logging** – Captures user interactions for analysis or external integrations

---

## Getting Started

### Development

```bash
npm install
npm run dev
```

---

## Tauri Usage

The project supports **Tauri**, allowing it to run as a full desktop and mobile application.

### 1. Local Tauri Development (served by Astro dev server)

```bash
npx tauri dev
```

### 2. Tauri Build (production executable)

```bash
npx tauri build
```

### Localhost Exposure in Final Build (Desktop only!)

The **final desktop Tauri build** also exposes a local web server accessible externally:

```
http://localhost:9527/
```

This allows you to open the app in a browser even when running the desktop executable.

---

## Pages

* `/` – Home menu
* `/:exercise` – Individual exercise page (available exercises: drawing, tmt, camera, text-recognition, find-shapes)
* `/:exercise/docs` – API documentation for any exercise
* `/:exercise/generate` – URL generator for any exercise

> **Example:** `/drawing`, `/drawing/docs`, `/drawing/generate`

