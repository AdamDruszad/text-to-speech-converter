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

test("theme preference persists through app initialization and works without speech support", (t) => {
  const x = setup(t, false);
  x.doc.getElementById("theme-toggle").click();
  assert.equal(x.doc.documentElement.dataset.theme, "light");
  assert.equal(x.dom.window.localStorage.getItem("tts-theme"), "light");
  assert.equal(x.doc.getElementById("theme-toggle").getAttribute("aria-label"), "Switch to dark mode");
  const dom = new JSDOM(html, { url: "https://speech.test/" });
  dom.window.localStorage.setItem("tts-theme", x.dom.window.localStorage.getItem("tts-theme"));
  const app = initTtsApp(dom.window.document, { synth: {} });
  assert.equal(dom.window.document.documentElement.dataset.theme, "light");
  app.dispose();
  dom.window.close();
});

test("example and clear update text stats without replacing the user's existing text", (t) => {
  const x = setup(t, true, [a]);
  const input = x.doc.getElementById("tts-input");
  const example = x.doc.getElementById("sample-btn");
  const clear = x.doc.getElementById("clear-btn");
  input.value = "My own words";
  input.dispatchEvent(new x.dom.window.Event("input"));
  assert.equal(example.disabled, true);
  example.click();
  assert.equal(input.value, "My own words");
  assert.equal(x.doc.getElementById("word-count").textContent, "3 words");
  clear.click();
  assert.equal(input.value, "");
  assert.equal(clear.disabled, true);
  example.click();
  assert.ok(input.value.length > 0);
  assert.notEqual(x.doc.getElementById("word-count").textContent, "0 words");
});

test("voice controls reach playback, lock while speaking, and reset to defaults", (t) => {
  const x = setup(t, true, [a]);
  const rate = x.doc.getElementById("rate-input");
  const pitch = x.doc.getElementById("pitch-input");
  const input = x.doc.getElementById("tts-input");
  input.value = "A short sentence.";
  rate.value = "1.6";
  pitch.value = "0.7";
  rate.dispatchEvent(new x.dom.window.Event("input"));
  x.submit();
  assert.equal(x.spoken[0].rate, 1.6);
  assert.equal(x.spoken[0].pitch, 0.7);
  assert.equal(rate.disabled, true);
  assert.equal(input.readOnly, true);
  assert.equal(x.doc.getElementById("clear-btn").disabled, true);
  x.submit();
  assert.equal(rate.disabled, false);
  assert.equal(input.readOnly, false);
  x.doc.getElementById("reset-settings-btn").click();
  assert.equal(rate.value, "1");
  assert.equal(pitch.value, "1");
  assert.equal(x.doc.getElementById("rate-value").textContent, "1×");
});
