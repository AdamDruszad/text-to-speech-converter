const synth = window.speechSynthesis;
const playBtn = document.getElementById("play-btn");
const playIcon = document.getElementById("play-icon");
const playLabel = document.getElementById("play-label");
const textarea = document.getElementById("tts-input");
const voiceSelect = document.getElementById("voice-select");

let speechStarted = false;
let startWatchdogId = null;

// bail out early if the browser straight up doesn't have speech synthesis
if (!("speechSynthesis" in window)) {
  playBtn.disabled = true;
  playBtn.title = "Your browser does not support text-to-speech.";
}

const speech = new SpeechSynthesisUtterance();
let voices = [];

function populateVoices() {
  // already populated — don't run twice
  if (voices.length > 0) return;

  voices = synth.getVoices();
  if (voices.length === 0) return; // chrome fires this early with an empty list, so just wait

  voiceSelect.replaceChildren();
  voices.forEach((voice, i) => {
    voiceSelect.add(new Option(`${voice.name} (${voice.lang})`, i));
  });

  // pick the first voice as the default
  speech.voice = voices[0];
}

// firefox has voices ready synchronously, chrome needs the event
populateVoices();
if ("onvoiceschanged" in synth) {
  synth.onvoiceschanged = populateVoices;
}

// safari sometimes never fires voiceschanged at all,
// so we poll every 200ms for up to 2 seconds as a last resort
let pollCount = 0;
const pollId = setInterval(() => {
  pollCount++;
  if (voices.length > 0 || pollCount > 10) {
    clearInterval(pollId);
    return;
  }
  populateVoices();
}, 200);

voiceSelect.addEventListener("change", () => {
  speech.voice = voices[Number(voiceSelect.value)];
});

// -- button state helpers --------------------------------------------------

function setPlayingState() {
  playBtn.classList.add("btn-playing");
  playIcon.classList.replace("ti-player-play", "ti-player-pause");
  playLabel.textContent = "Playing\u2026";
}

function setIdleState() {
  playBtn.classList.remove("btn-playing");
  playIcon.classList.replace("ti-player-pause", "ti-player-play");
  playLabel.textContent = "Listen";
}

// -- speech event handlers -------------------------------------------------

// chrome kills audio after ~15s of continuous speech.
// calling resume() on a timer keeps it alive.
let keepAliveId = null;

speech.addEventListener("start", () => {
  clearInterval(keepAliveId);
  keepAliveId = setInterval(() => {
    if (synth.speaking) synth.resume();
  }, 10_000);
  speechStarted = true;
  clearTimeout(startWatchdogId);
  setPlayingState();
});

speech.addEventListener("end", () => {
  clearInterval(keepAliveId);
  setIdleState();
});

speech.addEventListener("error", (e) => {
  clearInterval(keepAliveId);
  clearTimeout(startWatchdogId);
  setIdleState();

  // surface the actual error so it's never invisible
  const code = e.error || "unknown";
  console.error("TTS error:", code);

  // "canceled" fires when we call synth.cancel() ourselves — not a real error
  if (code !== "canceled") {
    showError(`Speech failed: ${code}. Try picking a different voice.`);
  }
});

// -- error modal -----------------------------------------------------------

function showError(message) {
  document.getElementById("error-text").textContent = message;
  document.getElementById("error-card").classList.remove("hidden");
  document.getElementById("error-overlay").classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-card").classList.add("hidden");
  document.getElementById("error-overlay").classList.add("hidden");
}

document.getElementById("close-error-btn").addEventListener("click", hideError);

// -- play button -----------------------------------------------------------

playBtn.addEventListener("click", () => {
  // if something is already playing, just stop it
  if (synth.speaking) {
    synth.cancel();
    setIdleState();
    return;
  }

  const text = textarea.value.trim();
  if (!text) {
    showError("Please enter some text first!");
    return;
  }

  // re-read voices right before speaking — covers devices (like some Samsungs)
  // where getVoices() returns nothing until the user actually interacts
  if (voices.length === 0) {
    voices = synth.getVoices();
    if (voices.length > 0) {
      voiceSelect.replaceChildren();
      voices.forEach((voice, i) => {
        voiceSelect.add(new Option(`${voice.name} (${voice.lang})`, i));
      });
      speech.voice = voices[0];
    }
  }

  // make sure the voice we're about to use actually exists on this device
  const selectedIdx = Number(voiceSelect.value);
  const selectedVoice = voices[selectedIdx];
  if (selectedVoice) {
    speech.voice = selectedVoice;
  } else if (voices.length > 0) {
    // selected index is somehow invalid — fall back to the first available voice
    speech.voice = voices[0];
  }
  // if voices is still empty we let the browser use its own default — better than silence

  synth.cancel(); // clear any queued speech so the new one starts immediately
  speech.text = text;
  synth.speak(speech);

  // watchdog: if nothing fires within 3 seconds, something went wrong
  speechStarted = false;
  startWatchdogId = setTimeout(() => {
    if (!speechStarted) {
      synth.cancel();
      setIdleState();
      showError("Playback didn\u2019t start \u2014 try a different voice or check your volume.");
    }
  }, 3000);
});