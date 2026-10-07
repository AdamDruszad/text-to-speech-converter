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
  const themeToggle = doc.getElementById("theme-toggle");
  const sampleButton = doc.getElementById("sample-btn");
  const clearButton = doc.getElementById("clear-btn");
  const rateInput = doc.getElementById("rate-input");
  const pitchInput = doc.getElementById("pitch-input");
  const resetButton = doc.getElementById("reset-settings-btn");
  const readTime = doc.getElementById("read-time");
  const caption = doc.getElementById("playback-caption");
  const PLAY_SVG = '<path d="M7 4v16l13 -8z" stroke="none"/>';
  const STOP_SVG = '<path d="M5 5h14v14H5z" stroke="none"/>';
  let voices = [];
  let pollId = null;
  let returnFocus = null;
  let controller;

  function setTheme(theme) {
    doc.documentElement.dataset.theme = theme;
    const action = theme === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${action} mode`);
    themeToggle.title = `Switch to ${action} mode`;
    doc.getElementById("theme-label").textContent = `${action === "light" ? "Light" : "Dark"} mode`;
    doc.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#191c18" : "#f5f4ef";
  }
  function toggleTheme() {
    const theme = doc.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(theme);
    try { win.localStorage.setItem("tts-theme", theme); } catch { /* Themes also work when storage is unavailable. */ }
  }
  try { setTheme(win.localStorage.getItem("tts-theme") === "light" ? "light" : "dark"); }
  catch { setTheme("dark"); }
  themeToggle.addEventListener("click", toggleTheme);

  function updateTextStats() {
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/u).length : 0;
    const characters = [...textarea.value].length;
    doc.getElementById("word-count").textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
    doc.getElementById("char-count").textContent = `${characters.toLocaleString()} ${characters === 1 ? "character" : "characters"}`;
    const seconds = words ? Math.max(1, Math.round(words / (150 * Number(rateInput.value)) * 60)) : 0;
    readTime.textContent = `~${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    readTime.setAttribute("aria-label", `Estimated reading time: ${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds`);
    clearButton.disabled = !textarea.value || Boolean(controller?.active);
    // An example never replaces text the user is already working on.
    sampleButton.disabled = Boolean(textarea.value) || Boolean(controller?.active);
  }
  function updateSettings() {
    doc.getElementById("rate-value").textContent = `${Number(rateInput.value)}×`;
    doc.getElementById("pitch-value").textContent = Number(pitchInput.value).toString();
    rateInput.setAttribute("aria-valuetext", `${Number(rateInput.value)} times normal speed`);
    pitchInput.setAttribute("aria-valuetext", `${Number(pitchInput.value)} times normal pitch`);
    updateTextStats();
  }
  function sampleText() {
    if (textarea.value || controller?.active) return;
    textarea.value = "There is something different about hearing an idea out loud. A sentence finds its rhythm. A thought takes a little more shape. So take a breath, look away from the screen, and let the words come to you.";
    updateTextStats();
    textarea.focus();
  }
  function clearText() {
    if (controller?.active) return;
    textarea.value = "";
    updateTextStats();
    textarea.focus();
  }
  function resetSettings() {
    rateInput.value = "1";
    pitchInput.value = "1";
    updateSettings();
  }
  textarea.addEventListener("input", updateTextStats);
  sampleButton.addEventListener("click", sampleText);
  clearButton.addEventListener("click", clearText);
  rateInput.addEventListener("input", updateSettings);
  pitchInput.addEventListener("input", updateSettings);
  resetButton.addEventListener("click", resetSettings);
  updateSettings();
  function disposeEditor() {
    themeToggle.removeEventListener("click", toggleTheme);
    textarea.removeEventListener("input", updateTextStats);
    sampleButton.removeEventListener("click", sampleText);
    clearButton.removeEventListener("click", clearText);
    rateInput.removeEventListener("input", updateSettings);
    pitchInput.removeEventListener("input", updateSettings);
    resetButton.removeEventListener("click", resetSettings);
  }

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
    rateInput.disabled = true;
    pitchInput.disabled = true;
    resetButton.disabled = true;
    doc.getElementById("voice-count").textContent = "Unavailable";
    caption.textContent = "BROWSER NOT SUPPORTED";
    status.textContent = "This browser does not support text-to-speech. Please use a browser with speech synthesis support.";
    return { dispose() { closeButton.removeEventListener("click", closeError); disposeEditor(); } };
  }

  function setState(state) {
    const busy = state.status !== "idle";
    form.dataset.playback = state.status;
    textarea.readOnly = busy;
    rateInput.disabled = busy;
    pitchInput.disabled = busy;
    resetButton.disabled = busy;
    caption.textContent = state.status === "starting" ? "FINDING YOUR VOICE…"
      : state.status === "speaking" ? "A MOMENT TO LISTEN"
      : state.completed ? "THAT'S A WRAP" : "READY WHEN YOU ARE";
    updateTextStats();
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
    doc.getElementById("voice-count").textContent = `${voices.length} available`;
    if (!controller.active && voices.length) status.textContent = `${voices.length} ${voices.length === 1 ? "voice" : "voices"} available. Choose a voice and press Listen.`;
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
    controller.play(textarea.value, voices, index, { rate: rateInput.value, pitch: pitchInput.value });
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
      disposeEditor();
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
