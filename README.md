# 🗣️ Text-to-Speech Converter

A clean, browser-based text-to-speech converter built with vanilla JavaScript and the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API). Type or paste any text, pick a voice, and hit **Listen**.

![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **Real-time speech synthesis** — uses the browser's built-in `SpeechSynthesis` API
- **Voice selector** — pick from all voices available on your system/browser
- **Cross-browser support** — handles Chrome, Firefox, and Safari quirks (voice loading, long-text cutoff, etc.)
- **Error handling** — user-friendly error overlay for empty input and playback failures
- **Lightweight** — no backend, no external speech services, just your browser

## 🛠️ Tech Stack

| Layer     | Technology                                                       |
| --------- | ---------------------------------------------------------------- |
| Bundler   | [Vite 8](https://vite.dev/)                                     |
| Styling   | [Tailwind CSS 4](https://tailwindcss.com/)                      |
| Icons     | [Tabler Icons](https://tabler.io/icons) (webfont)               |
| Speech    | [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **18+**
- npm (comes with Node.js)

### Installation

```bash
# Clone the repo
git clone https://github.com/<your-username>/text-to-speech.git
cd text-to-speech

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview   # preview the production build locally
```

The output is written to the `dist/` directory.

## 📁 Project Structure

```
text-to-speech/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── main.js          # Speech synthesis logic
│   └── style.css         # Tailwind config & custom theme
├── index.html            # App entry point
├── vite.config.js        # Vite + Tailwind plugin
├── package.json
└── README.md
```

## 🌐 Browser Support

| Browser | Status |
| ------- | ------ |
| Chrome  | ✅ Full support (includes long-text keep-alive workaround) |
| Firefox | ✅ Full support |
| Safari  | ✅ Supported (includes voice-loading fallback polling) |
| Edge    | ✅ Full support (Chromium-based) |

> **Note:** Available voices depend on your operating system and browser. The number and quality of voices may vary.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
