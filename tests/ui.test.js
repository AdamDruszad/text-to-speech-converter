import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { initTtsApp, voiceKey } from "../src/main.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
class Utterance { constructor(text) { this.text = text; } }
function setup(t, supported = true, initialVoices = []) {
  const dom = new JSDOM(html, { url: "https://speech.test/" });
  const doc = dom.window.document;
  const spoken = [];
  let voices = initialVoices;
  const synth = new dom.window.EventTarget();
  Object.assign(synth, { getVoices: () => voices, speak: (u) => spoken.push(u), cancel() {}, resume() {} });
  const app = initTtsApp(doc, { synth: supported ? synth : {}, Utterance: supported ? Utterance : undefined });
  t.after(() => { app.dispose(); dom.window.close(); });
  const submit = () => doc.getElementById("tts-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  return { dom, doc, synth, spoken, submit, setVoices(next) { voices = next; synth.dispatchEvent(new dom.window.Event("voiceschanged")); } };
}
const a = { name: "Voice A", voiceURI: "a", lang: "en-GB" };
const b = { name: "Voice B", voiceURI: "b", lang: "hu-HU" };

test("unsupported browsers show a message without constructing speech", (t) => {
  const { doc } = setup(t, false);
  assert.equal(doc.getElementById("play-btn").disabled, true);
  assert.match(doc.getElementById("playback-status").textContent, /does not support/);
});

test("later voice updates preserve the selected voice even if order changes", (t) => {
  const x = setup(t, true, [a, b]);
  x.doc.getElementById("voice-select").value = voiceKey(b);
  x.setVoices([b, a, { name: "Voice C", voiceURI: "c", lang: "de" }]);
  assert.equal(x.doc.getElementById("voice-select").value, voiceKey(b));
  assert.equal(x.doc.getElementById("voice-select").options.length, 3);
});

test("Stop remains available while the speech engine is still starting", (t) => {
  const x = setup(t, true, [a]);
  x.doc.getElementById("tts-input").value = "Hello";
  x.submit();
  assert.equal(x.doc.getElementById("play-label").textContent, "Stop");
  x.submit();
  assert.equal(x.doc.getElementById("play-label").textContent, "Listen");
  assert.equal(x.spoken[0].onerror, null);
});

test("empty text opens an accessible dialog and returns focus to the input", (t) => {
  const x = setup(t, true, [a]);
  x.submit();
  assert.equal(x.doc.getElementById("error-dialog").open, true);
  assert.equal(x.doc.activeElement.id, "close-error-btn");
  x.doc.getElementById("close-error-btn").click();
  assert.equal(x.doc.getElementById("error-dialog").open, false);
  assert.equal(x.doc.activeElement.id, "tts-input");
});

test("voices arriving after initialization can be used for playback", (t) => {
  const x = setup(t, true, []);
  x.setVoices([a]);
  x.doc.getElementById("tts-input").value = "Hello";
  x.submit();
  assert.equal(x.spoken[0].voice.name, "Voice A");
  x.spoken[0].onstart();
  x.spoken[0].onend();
  assert.equal(x.doc.getElementById("play-label").textContent, "Listen");
  assert.equal(x.doc.getElementById("voice-select").disabled, false);
});
