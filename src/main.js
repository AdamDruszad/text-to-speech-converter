import { createSpeechController } from "./speech-controller.js";

export const voiceKey = (voice) => JSON.stringify([voice.voiceURI || "", voice.name, voice.lang]);

export function initTtsApp(doc = document, options = {}) {
  const win = doc.defaultView;
  const synth = options.synth ?? win.speechSynthesis;
  const Utterance = options.Utterance ?? win.SpeechSynthesisUtterance;
  const timers = options.timers ?? win;
  const form = doc.getElementById("tts-form");
  const playBtn = doc.getElementById("play-btn");
  const playIcon = doc.getElementById("play-icon");
  const playLabel = doc.getElementById("play-label");
  const textarea = doc.getElementById("tts-input");
  const voiceSelect = doc.getElementById("voice-select");
  const status = doc.getElementById("playback-status");
  const dialog = doc.getElementById("error-dialog");
  const closeButton = doc.getElementById("close-error-btn");
  const PLAY_SVG = '<path d="M7 4v16l13 -8z" stroke="none"/>';
  const STOP_SVG = '<path d="M5 5h14v14H5z" stroke="none"/>';
  let voices = [];
  let pollId = null;
  let returnFocus = null;
  let controller;

  function closeError() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    returnFocus?.focus();
  }
  function showError(message) {
    doc.getElementById("error-text").textContent = message;
    returnFocus = textarea.value.trim() ? playBtn : textarea;
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    closeButton.focus();
  }
  closeButton.addEventListener("click", closeError);
  dialog.addEventListener("close", () => returnFocus?.focus());

  const supported = synth && typeof synth.getVoices === "function" &&
    typeof synth.speak === "function" && typeof synth.cancel === "function" && typeof Utterance === "function";
  if (!supported) {
    playBtn.disabled = true;
    voiceSelect.disabled = true;
    status.textContent = "This browser does not support text-to-speech. Please use a browser with speech synthesis support.";
    return { dispose() { closeButton.removeEventListener("click", closeError); } };
  }

  function setState(state) {
    const busy = state.status !== "idle";
    playBtn.classList.toggle("btn-playing", state.status === "speaking");
    playBtn.setAttribute("aria-label", busy ? "Stop playback" : "Listen to text");
    playIcon.innerHTML = busy ? STOP_SVG : PLAY_SVG;
    playLabel.textContent = busy ? "Stop" : "Listen";
    voiceSelect.disabled = busy || voices.length === 0;
    status.textContent = state.status === "starting"
      ? `Starting ${state.voice.name} (${state.attempt} of ${state.total}). Press Stop to cancel.`
      : state.status === "speaking" ? `Playing with ${state.voice.name}.`
      : state.completed ? "Playback finished." : "Playback stopped.";
  }
  controller = createSpeechController({
    synth, Utterance, timers, onState: setState, onError: showError,
    onVoice: (voice) => { voiceSelect.value = voiceKey(voice); },
  });

  function refreshVoices() {
    const previous = voiceSelect.value;
    try { voices = [...synth.getVoices()]; } catch { voices = []; }
    voiceSelect.replaceChildren();
    if (!voices.length) {
      const placeholder = doc.createElement("option");
      placeholder.textContent = "No voices loaded yet";
      placeholder.value = "";
      voiceSelect.append(placeholder);
    } else {
      for (const voice of voices) {
        const option = doc.createElement("option");
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voiceKey(voice);
        voiceSelect.append(option);
      }
      voiceSelect.value = voices.some((voice) => voiceKey(voice) === previous)
        ? previous : voiceKey(voices.find((voice) => voice.default) ?? voices[0]);
      timers.clearInterval(pollId);
      pollId = null;
    }
    voiceSelect.disabled = controller.active || voices.length === 0;
    if (!controller.active && voices.length) status.textContent = `${voices.length} voices available. Choose a voice and press Listen.`;
    return voices;
  }

  function startPolling() {
    refreshVoices();
    if (voices.length || pollId !== null) return;
    let polls = 0;
    pollId = timers.setInterval(() => {
      refreshVoices();
      if (++polls >= 40) {
        timers.clearInterval(pollId);
        pollId = null;
        if (!voices.length && !controller.active) status.textContent = "No voices loaded. Press Listen to check again, or check your device's speech settings.";
      }
    }, 250);
  }

  function submit(event) {
    event.preventDefault();
    if (controller.active) { controller.stop(); return; }
    if (!textarea.value.trim()) { showError("Please enter some text first."); return; }
    // Some devices expose voices only after the first user gesture.
    refreshVoices();
    const index = voices.findIndex((voice) => voiceKey(voice) === voiceSelect.value);
    controller.play(textarea.value, voices, index);
  }
  function pageHide() {
    controller.stop();
    timers.clearInterval(pollId);
    pollId = null;
  }
  form.addEventListener("submit", submit);
  synth.addEventListener("voiceschanged", refreshVoices);
  win.addEventListener("focus", refreshVoices);
  win.addEventListener("pagehide", pageHide);
  win.addEventListener("pageshow", startPolling);
  status.textContent = "Loading available voices…";
  startPolling();

  return {
    dispose() {
      pageHide();
      form.removeEventListener("submit", submit);
      closeButton.removeEventListener("click", closeError);
      synth.removeEventListener("voiceschanged", refreshVoices);
      win.removeEventListener("focus", refreshVoices);
      win.removeEventListener("pagehide", pageHide);
      win.removeEventListener("pageshow", startPolling);
    },
  };
}

if (typeof document !== "undefined") initTtsApp();
