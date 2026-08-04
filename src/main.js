const synth = window.speechSynthesis;
const playBtn = document.getElementById('play-btn');
const textarea = document.querySelector("textarea");
const voiceSelect = document.querySelector("select");
let speechStarted = false;
let startWatchdogId = null;

// Explicit feature detection - ne omoljon össze csendben régi/egzotikus böngészőn
if (!("speechSynthesis" in window)) {
  playBtn.disabled = true;
  playBtn.title = "Your browser does not support text-to-speech.";
  console.error("The Web Speech API is not available in this browser.");
}

const speech = new SpeechSynthesisUtterance();
let voices = [];

function populateVoices() {
  if (voices.length > 0) return; // We already have the list, so let's not run it twice
  voices = synth.getVoices();
  if (voices.length === 0) return; // In Chrome, you still have to wait for the event to start

  voiceSelect.replaceChildren(); // Just to be on the safe side: no duplication
  voices.forEach((voice, i) => {
    voiceSelect.add(new Option(`${voice.name} (${voice.lang})`, i));
  });
  speech.voice = voices[0];
}

populateVoices(); // In Firefox, this already populates the list here
if ("onvoiceschanged" in synth) {
  synth.onvoiceschanged = populateVoices; // Chrome-nak ez kell
}

// Safari fallback: dokumentáltan előfordul, hogy a voiceschanged sosem tüzel el.
// 200ms-enként próbálkozunk, max 2 másodpercig, aztán feladjuk.
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

// Chrome ~15 mp után elnémítja a hosszú szöveget - a resume() életben tartja.
let keepAliveId = null;
speech.addEventListener("start", () => {
  clearInterval(keepAliveId);
  keepAliveId = setInterval(() => {
    if (synth.speaking) synth.resume();
  }, 10000);
  speechStarted = true;
  clearTimeout(startWatchdogId);
});
speech.addEventListener("end", () => clearInterval(keepAliveId));
speech.addEventListener("error", (e) => {
  clearInterval(keepAliveId);
  console.error("Beszédszintézis hiba:", e.error);
  clearTimeout(startWatchdogId);
});

function showError(message) {
  const card = document.getElementById('error-card');
  const overlay = document.getElementById('error-overlay');
  document.getElementById('error-text').textContent = message;
  card.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-card').classList.add('hidden');
  document.getElementById('error-overlay').classList.add('hidden');
}

document.getElementById('close-error-btn').addEventListener('click', hideError);

playBtn.addEventListener("click", () => {
  const text = textarea.value.trim();
  if (!text) {
    showError("Nem írtál be szöveget!");
    return;
  } // üres szöveget sose küldjünk - Chrome-ban elronthatja a motort

  synth.cancel(); // különben minden kattintás sorba állna a régi mögé, nem felülírná
  speech.text = text;
  synth.speak(speech);
  speechStarted = false;
  const timeLimit = setTimeout(() => {
    if (!speechStarted) {
      synth.cancel();
      console.error("Hiba történt a lejátszással, próbáld újra!");
    }
  }, 3000)
  startWatchdogId = timeLimit;
});