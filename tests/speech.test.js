import test from "node:test";
import assert from "node:assert/strict";
import { createSpeechController } from "../src/speech-controller.js";

export class FakeUtterance {
  constructor(text) { this.text = text; }
  emit(type, error) { this[`on${type}`]?.({ error }); }
}
export function fakeTimers() {
  let id = 0;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    setTimeout: (fn) => { timeouts.set(++id, fn); return id; },
    clearTimeout: (key) => timeouts.delete(key),
    setInterval: (fn) => { intervals.set(++id, fn); return id; },
    clearInterval: (key) => intervals.delete(key),
    timeout() { const [key, fn] = timeouts.entries().next().value; timeouts.delete(key); fn(); },
    interval() { for (const fn of [...intervals.values()]) fn(); },
    get pending() { return timeouts.size + intervals.size; },
  };
}
function setup(extra = {}) {
  const spoken = [], states = [], errors = [];
  const timers = fakeTimers();
  const synth = { speaking: false, paused: false, cancel() {}, resume() {}, speak: (utterance) => spoken.push(utterance) };
  const controller = createSpeechController({ synth, Utterance: FakeUtterance, timers, onState: (s) => states.push(s), onError: (e) => errors.push(e), ...extra });
  const voices = Array.from({ length: 3 }, (_, i) => ({ name: `Voice ${i}`, lang: "en-GB" }));
  return { controller, synth, timers, spoken, states, errors, voices };
}

test("failed voices are each tried exactly once, starting with the user's choice", () => {
  const x = setup();
  x.controller.play("Hello", x.voices, 2);
  x.spoken[0].emit("error", "voice-unavailable");
  x.spoken[1].emit("error", "synthesis-failed");
  x.spoken[2].emit("error", "network");
  assert.deepEqual(x.spoken.map((u) => u.voice.name), ["Voice 2", "Voice 0", "Voice 1"]);
  assert.equal(new Set(x.spoken).size, 3);
  assert.equal(x.errors.length, 1);
  assert.equal(x.controller.active, false);
  assert.equal(x.timers.pending, 0);
});

test("Stop during startup cancels pending retries and ignores delayed events", () => {
  const x = setup();
  x.controller.play("Hello", x.voices);
  const { onstart, onerror } = x.spoken[0];
  x.controller.stop();
  onstart();
  onerror({ error: "voice-unavailable" });
  assert.equal(x.spoken.length, 1);
  assert.equal(x.controller.active, false);
  assert.equal(x.errors.length, 0);
  assert.equal(x.timers.pending, 0);
});

test("an intentional stop after speech starts does not produce a playback error", () => {
  const x = setup();
  x.controller.play("Hello", x.voices);
  x.spoken[0].emit("start");
  const onerror = x.spoken[0].onerror;
  x.controller.stop();
  onerror({ error: "interrupted" });
  assert.equal(x.errors.length, 0);
  assert.equal(x.spoken.length, 1);
  assert.equal(x.timers.pending, 0);
});

test("a stalled voice falls back and old events cannot stop the replacement", () => {
  const x = setup();
  x.controller.play("Hello", x.voices);
  const staleEnd = x.spoken[0].onend;
  x.timers.timeout();
  x.spoken[1].emit("start");
  staleEnd();
  assert.equal(x.controller.active, true);
  assert.equal(x.states.at(-1).status, "speaking");
  x.spoken[1].emit("end");
  assert.equal(x.timers.pending, 0);
  assert.equal(x.controller.active, false);
});

test("mid-speech errors do not restart the entire passage in another voice", () => {
  const x = setup();
  x.controller.play("A long passage", x.voices);
  x.spoken[0].emit("start");
  x.spoken[0].emit("error", "network");
  assert.equal(x.spoken.length, 1);
  assert.match(x.errors[0], /stopped unexpectedly/);
  assert.equal(x.timers.pending, 0);
});

test("permission failures stop immediately instead of cycling through voices", () => {
  const x = setup();
  x.controller.play("Hello", x.voices);
  x.spoken[0].emit("error", "not-allowed");
  assert.equal(x.spoken.length, 1);
  assert.match(x.errors[0], /blocked playback/);
});

test("synchronous start events clear the startup watchdog", () => {
  const timers = fakeTimers();
  const synth = { cancel() {}, speak(u) { u.emit("start"); }, speaking: true, paused: false, resume() {} };
  const controller = createSpeechController({ synth, Utterance: FakeUtterance, timers });
  controller.play("Hello", [{ name: "Default", lang: "en" }]);
  assert.equal(timers.pending, 1); // Only the keep-alive interval remains.
  controller.stop();
  assert.equal(timers.pending, 0);
});

test("starting new text ignores events from the previous playback", () => {
  const x = setup();
  x.controller.play("Old text", x.voices);
  const staleStart = x.spoken[0].onstart;
  x.controller.play("New text", x.voices, 1);
  staleStart();
  assert.equal(x.states.at(-1).status, "starting");
  assert.equal(x.spoken.at(-1).text, "New text");
  x.controller.stop();
});

test("system cancellation is not retried", () => {
  const x = setup();
  x.controller.play("Hello", x.voices);
  x.spoken[0].emit("error", "interrupted");
  assert.equal(x.spoken.length, 1);
  assert.equal(x.controller.active, false);
  assert.equal(x.errors.length, 0);
});

test("empty text and empty voice lists do not call the speech engine", () => {
  const x = setup();
  x.controller.play("  ", x.voices);
  x.controller.play("Hello", []);
  assert.equal(x.spoken.length, 0);
  assert.equal(x.errors.length, 2);
  assert.equal(x.timers.pending, 0);
});
