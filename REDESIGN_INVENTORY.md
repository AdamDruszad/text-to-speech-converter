# Redesign inventory

The contract for the redesign: everything a visitor can see or do in the version on `codex/frontend-fixes-20261007-141014` (commit `a372d60`). Each item is checked against the redesigned build in the **Verified** column (filled in during step 5 of the redesign).

Source files: `index.html`, `src/main.js`, `src/speech-controller.js`, `src/style.css`, `public/favicon.svg`.

## 1. Pages and routes

| # | Item | Where | Verified |
|---|------|-------|----------|
| 1.1 | Single page at `/` (no router, no other routes) | `index.html` | |
| 1.2 | `<noscript>` message: "Please enable JavaScript to use text-to-speech." | `index.html:108` | |

## 2. Document head and metadata

| # | Item | Verified |
|---|------|----------|
| 2.1 | `<title>` "Text to Speech — A little room for your words." | |
| 2.2 | Meta description "Give your words a voice. A thoughtful, free text-to-speech workspace with your device's voices and adjustable reading speed." | |
| 2.3 | `theme-color` meta, updated by the theme toggle | |
| 2.4 | SVG favicon (`/favicon.svg`, lime tile with four waveform bars) | |
| 2.5 | `lang="en"` | |
| 2.6 | Theme applied before first paint from `localStorage` (no flash of wrong theme) | |

## 3. Sections and their text content

### 3.1 Skip link
- "Skip to text editor" → focuses `#tts-input`.

### 3.2 Header
- Logo/home link to `/`, accessible name "Text to Speech home"; visible text "Text to Speech." with a four-bar waveform mark.
- Theme toggle button: sun/moon icon, visible label "Light mode" / "Dark mode" (label hidden below 640px), `aria-label` and `title` "Switch to light mode" / "Switch to dark mode".
- External link "By Ádám ↗" → `https://portfolio-orpin-eight-240etcohnd.vercel.app/` (new tab, `rel="noopener noreferrer"`).

### 3.3 Intro
- Label "01 / THE LISTENING ROOM" (the "01 /" is a decorative index).
- `<h1>` "Your words. A little more alive."
- Description "An article, a thought, a story. Make space to listen."
- Note "No account. Just press play." with a status dot (hidden below 1100px).

### 3.4 Workspace form (`#tts-form`)

**Pane 1: The words** (`<h2>` "01 The words")
- "Try an example ↗" button (`#sample-btn`).
- "Clear" button (`#clear-btn`).
- Textarea `#tts-input`, visually hidden label "Text to read aloud", placeholder "Every good idea starts with a few words. / Write or paste yours here…", spellcheck on.
- Hint "A quiet place for your text." (`#text-hint`, also the textarea's description; hidden below 1100px).
- Stats: "0 words / 0 characters" (`#word-count`, `#char-count`).

**Pane 2: The voice** (`<h2>` "02 The voice")
- Voice count `#voice-count`: "Loading…" → "N available" / "Unavailable".
- "Choose a voice" label + select `#voice-select` (initial option "Loading voices…").
- Help text "Voices come from your browser and device. Some need an internet connection."
- "Reading speed" range `#rate-input` 0.5–2 step 0.1, value readout `#rate-value` "1×", end labels "Slower" / "Faster".
- "Pitch" range `#pitch-input` 0.5–1.5 step 0.1, readout `#pitch-value` "1", end labels "Lower" / "Higher".
- "Reset voice settings ↺" button `#reset-settings-btn`.

**Playback area**
- Caption `#playback-caption` (state text, see §5).
- Estimated reading time `#read-time` "~0:00" with an `aria-label` "Estimated reading time: M minutes, S seconds".
- Decorative 32-bar waveform (animated only while speaking).
- Primary submit button `#play-btn`: play icon + "Listen" ↔ stop icon + "Stop" (`#play-icon`, `#play-label`), `aria-label` "Listen to text" / "Stop playback".
- Live status line `#playback-status` (`role="status"`, `aria-live="polite"`).

### 3.5 Below the workspace
- "↳ Read with your ears. Give your eyes a break."
- "Estimated reading time varies by voice."

### 3.6 Footer
- "A small tool. *A different perspective.*"
- "View the source ↗" → `https://github.com/AdamDruszad/text-to-speech-converter` (new tab).

### 3.7 Error dialog (`#error-dialog`, native `<dialog>`, modal)
- Label "A quick heads-up", title "Playback unavailable", message `#error-text`, button "Got it" (`#close-error-btn`).

### 3.8 Images and assets
- No content images. Inline SVG icons only (sun, moon, chevron, play, stop).
- `src/assets/logo.png` (1.4 MB) and `public/icons.svg` (Vite template social icons) exist but are **not used** anywhere.

## 4. Features and interactions

| # | Feature | Behaviour to preserve | Verified |
|---|---------|----------------------|----------|
| 4.1 | Text input | Free text; editing updates stats live | |
| 4.2 | Word count | `text.trim().split(/\s+/)`; "1 word" / "N words", locale-formatted | |
| 4.3 | Character count | Counts code points of the raw value; "1 character" / "N characters" | |
| 4.4 | Estimated time | `words / (150 × rate)` minutes, min 1 s, shown "~m:ss"; updates with rate | |
| 4.5 | Try an example | Fills the fixed sample passage, focuses the editor; disabled whenever the editor has text or playback is active | |
| 4.6 | Clear | Empties the editor, focuses it; disabled when empty or during playback | |
| 4.7 | Voice list | Loaded from `speechSynthesis.getVoices()`; option text "Name (lang)"; refreshed on `voiceschanged`, window `focus`, `pageshow`, and polled every 250 ms up to 40 times until voices appear | |
| 4.8 | Voice selection kept | Selected voice survives list refreshes even if order changes; default voice (or first) selected otherwise | |
| 4.9 | Reading speed | Range 0.5–2; readout "N×"; `aria-valuetext` "N times normal speed"; passed to every utterance | |
| 4.10 | Pitch | Range 0.5–1.5; readout "N"; `aria-valuetext` "N times normal pitch"; passed to every utterance | |
| 4.11 | Reset voice settings | Rate and pitch back to 1 | |
| 4.12 | Listen | Submits the form; empty text → error dialog; otherwise speaks with the chosen voice | |
| 4.13 | Stop | Same button while starting or speaking; cancels speech and any retry | |
| 4.14 | Voice fallback | Startup timeout (6 s) or retryable error moves to the next voice; each voice tried once; selection follows the voice being tried | |
| 4.15 | Lock during playback | Editor read-only; rate, pitch, reset, voice select, example and clear disabled | |
| 4.16 | Keep-alive | Calls `resume()` every 10 s while speaking (Chrome long-utterance workaround) | |
| 4.17 | Stop on page hide | `pagehide` stops playback and polling | |
| 4.18 | Theme toggle | Switches light/dark, updates labels and `theme-color`, saves `tts-theme` in `localStorage`; works without storage and without speech support | |
| 4.19 | Error dialog | Opens modally, focuses "Got it"; closing returns focus to Listen (text present) or the editor (empty) | |
| 4.20 | Skip link | Visible on focus, jumps to the editor | |
| 4.21 | Reduced motion | All animation/transition disabled under `prefers-reduced-motion: reduce` | |
| 4.22 | Keyboard focus | Visible focus ring on every control | |

No pause/resume, volume control, word highlighting, download or sharing exist; the redesign must not imply them.

## 5. UI states

| # | State | What the visitor sees today | Verified |
|---|-------|-----------------------------|----------|
| 5.1 | Loading voices | Count "Loading…", select "Loading voices…", status "Loading available voices…" | |
| 5.2 | Voices ready | Count "N available", status "N voice(s) available. Choose a voice and press Listen.", caption "READY WHEN YOU ARE" | |
| 5.3 | No voices (after ~10 s polling) | Select "No voices loaded yet" (disabled), count "0 available", status "No voices loaded. Press Listen to check again, or check your device's speech settings." | |
| 5.4 | Unsupported browser | Listen, select, rate, pitch, reset disabled; count "Unavailable"; caption "BROWSER NOT SUPPORTED"; status "This browser does not support text-to-speech. Please use a browser with speech synthesis support." Theme toggle, example and clear still work | |
| 5.5 | Empty text on Listen | Dialog: "Please enter some text first." | |
| 5.6 | Starting | Caption "FINDING YOUR VOICE…"; button "Stop"; status "Starting {voice} ({n} of {total}). Press Stop to cancel." | |
| 5.7 | Speaking | Caption "A MOMENT TO LISTEN"; waveform animates; button "Stop"; status "Playing with {voice}." | |
| 5.8 | Stopped by user | Caption "READY WHEN YOU ARE"; button "Listen"; status "Playback stopped." | |
| 5.9 | Finished | Caption "THAT'S A WRAP"; status "Playback finished." | |
| 5.10 | Playback error | Dialog with one of: blocked ("Your browser blocked playback. Press Listen again to allow speech."), audio busy, no audio output, text too long, invalid argument, all voices failed, generic start/mid-playback failures, no voices on device, could not create utterance | |
| 5.11 | Disabled controls | 45 % opacity, `not-allowed` cursor | |
| 5.12 | Light and dark theme | Both themes for every state above | |
