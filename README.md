# Text to Speech Converter

A browser-based speech app built with vanilla JavaScript, the Web Speech API, Tailwind CSS and Vite. Enter text, choose an available voice and press **Listen**. Press **Stop** to cancel, including while a voice is still starting.

[Live demo](https://text-to-speech-converter-five-orpin.vercel.app/) · [Source](https://github.com/AdamDruszad/text-to-speech-converter)

## Features

- Detect speech synthesis support before enabling playback.
- Refresh asynchronously loaded voices and preserve the selected voice when the list changes.
- Use a fresh utterance for each attempt and try each available voice at most once when startup fails with a retryable error.
- Stop playback and pending retries without letting old speech events restart the session.
- Report empty input, missing voices and playback failures in an accessible dialog.
- Labelled controls, live playback status, keyboard focus styles and reduced-motion support.
- Inline SVG icons and locally bundled fonts; no icon-font dependency.

## Run locally

Use Node.js 24.15 or newer in the Node 24 release line and npm. `.nvmrc` selects Node 24; `package.json` lists all supported Node ranges.

```bash
git clone https://github.com/AdamDruszad/text-to-speech-converter.git
cd text-to-speech-converter
npm ci
npm run dev
```

Open the address printed by Vite.

```bash
npm test
npm run build
npm run preview
```

Deploy the generated `dist/` directory. The app has no application backend.

## Speech behavior and limitations

Available voices, languages and speech reliability depend on the browser and operating system. Some device-provided voices use network services, so offline availability is not guaranteed. This app does not choose or operate the browser's speech provider.

The chosen voice is tried first. A startup timeout or retryable startup error moves to the next voice; Stop cancels the whole session. An error after speech has started ends playback with a message instead of replaying the passage from the beginning. Startup retries may use a different language, so select a suitable voice for the text.

Automatic tests use a simulated speech engine. They do **not** establish full Chrome, Edge, Firefox or Safari compatibility or verify audible output. Before publishing, manually try a short passage, a long passage, late-loading voices and Stop during startup and playback in the browsers you intend to support. Browser and operating-system restrictions can still affect long passages.

## Code and tests

- `src/speech-controller.js`: playback sessions, retries, timers and cancellation.
- `src/main.js`: voice selection, form controls, status and error dialog.
- `tests/speech.test.js`: deterministic speech-event and timer tests.
- `tests/ui.test.js`: JSDOM checks for feature detection, voice refresh and controls.
- `src/style.css`: responsive layout, contrast and interaction styles.

## License

[MIT](./LICENSE).
