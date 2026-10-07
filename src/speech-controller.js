const RETRYABLE_ERRORS = new Set([
  "voice-unavailable", "language-unavailable", "synthesis-failed", "synthesis-unavailable", "network",
]);
const ERROR_MESSAGES = {
  "not-allowed": "Your browser blocked playback. Press Listen again to allow speech.",
  "audio-busy": "Your audio device is busy. Close other audio apps and try again.",
  "audio-hardware": "No audio output is available. Check your speakers or headphones.",
  "text-too-long": "This voice cannot read that much text at once. Try a shorter passage.",
  "invalid-argument": "This voice could not read the text. Try another voice.",
};

// Each attempt owns an utterance and its timers. Late events from a stopped or
// replaced attempt cannot restart speech or change the current button state.
export function createSpeechController({
  synth, Utterance, timers = globalThis, onState = () => {}, onError = () => {},
  onVoice = () => {}, startTimeoutMs = 6000, keepAliveMs = 10000,
}) {
  let session = null;

  function clearAttempt(run) {
    const attempt = run?.current;
    if (!attempt) return;
    timers.clearTimeout(attempt.watchdog);
    timers.clearInterval(attempt.keepAlive);
    attempt.utterance.onstart = null;
    attempt.utterance.onend = null;
    attempt.utterance.onerror = null;
    run.current = null;
  }

  function stop() {
    const previous = session;
    session = null;
    clearAttempt(previous);
    try { synth.cancel(); } catch { /* A stopped engine needs no further cleanup. */ }
    onState({ status: "idle" });
  }

  function fail(message) {
    stop();
    onError(message);
  }

  function nextAttempt(run) {
    if (session !== run) return;
    clearAttempt(run);
    try { synth.cancel(); } catch { /* Still try a fresh utterance. */ }
    if (run.index >= run.voices.length) {
      fail("None of the available voices could start playback. Check your device's speech settings or try again.");
      return;
    }
    const voice = run.voices[run.index++];
    let utterance;
    try { utterance = new Utterance(run.text); } catch {
      fail("Speech playback could not be created in this browser.");
      return;
    }
    utterance.voice = voice;
    if (voice.lang) utterance.lang = voice.lang;
    const attempt = { utterance, started: false, watchdog: null, keepAlive: null };
    run.current = attempt;
    const isCurrent = () => session === run && run.current === attempt;
    onVoice(voice);
    onState({ status: "starting", voice, attempt: run.index, total: run.voices.length });

    utterance.onstart = () => {
      if (!isCurrent()) return;
      attempt.started = true;
      timers.clearTimeout(attempt.watchdog);
      onState({ status: "speaking", voice });
      attempt.keepAlive = timers.setInterval(() => {
        if (!isCurrent() || !synth.speaking || synth.paused) return;
        try { synth.resume(); } catch { /* The speech engine may already have stopped. */ }
      }, keepAliveMs);
    };
    utterance.onend = () => {
      if (!isCurrent()) return;
      clearAttempt(run);
      session = null;
      onState({ status: "idle", completed: true });
    };
    utterance.onerror = (event) => {
      if (!isCurrent()) return;
      const code = event.error || "unknown";
      if (code === "canceled" || code === "interrupted") {
        stop();
      } else if (!attempt.started && RETRYABLE_ERRORS.has(code)) {
        nextAttempt(run);
      } else {
        fail(ERROR_MESSAGES[code] || (attempt.started
          ? "Playback stopped unexpectedly. Try another voice or a shorter passage."
          : "Playback failed. Try another voice or check your device's speech settings."));
      }
    };
    // Set the watchdog before speak(): some engines can dispatch start immediately.
    attempt.watchdog = timers.setTimeout(() => {
      if (isCurrent() && !attempt.started) nextAttempt(run);
    }, startTimeoutMs);
    try { synth.speak(utterance); } catch {
      if (isCurrent()) fail("Your browser could not start speech playback. Try again.");
    }
  }

  function play(text, voices, selectedIndex = 0) {
    stop();
    const cleanText = String(text).trim();
    if (!cleanText) { onError("Please enter some text first."); return; }
    if (!voices.length) { onError("No voices are available on this device. Check your speech settings and try again."); return; }
    const start = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < voices.length ? selectedIndex : 0;
    const run = { text: cleanText, voices: [...voices.slice(start), ...voices.slice(0, start)], index: 0, current: null };
    session = run;
    nextAttempt(run);
  }

  return { play, stop, get active() { return session !== null; } };
}
