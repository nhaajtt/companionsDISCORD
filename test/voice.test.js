import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import tools, { getTools } from "../src/content/tools.js";
import { createReminderStore, parseDuration } from "../src/reminders.js";
import { createScoreStore } from "../src/scores.js";
import { createSettingsStore } from "../src/settings.js";
import { PomodoroSessions } from "../src/pomodoro.js";
import { VoiceKeeper } from "../src/voice.js";
import { VoiceTools } from "../src/voicetools.js";

const MIN = 60_000;
const tmp = () => mkdtempSync(path.join(tmpdir(), "voice-"));

function fakePort(candidates = [0, 1, 2]) {
  const inRoom = new Set();
  const port = {
    joins: [],
    leaves: [],
    failNext: 0,
    candidates: () => candidates,
    isIn: (slot) => inRoom.has(slot),
    async join(slot) {
      port.joins.push(slot);
      if (port.failNext > 0) {
        port.failNext--;
        return false;
      }
      inRoom.add(slot);
      return true;
    },
    async leave(slot) {
      port.leaves.push(slot);
      inRoom.delete(slot);
    },
    drop: (slot) => inRoom.delete(slot),
  };
  return port;
}

test("the keeper joins the wanted number of bots and brings them back when they get dropped", async () => {
  let t = 0;
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  store.update("g", { voiceChannelId: "v", voiceBots: 2 });
  const port = fakePort();
  const keeper = new VoiceKeeper({ store, port, now: () => t });
  await keeper.tick();
  assert.deepEqual(port.joins, [0, 1]);
  assert.equal(keeper.status("g").wanted, 2);
  assert.equal(keeper.status("g").present, 2);
  port.drop(1);
  await keeper.tick();
  assert.deepEqual(port.joins, [0, 1, 1], "only the missing bot rejoins");
});

test("failed joins back off, and the wait grows", async () => {
  let t = 0;
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  store.update("g", { voiceChannelId: "v" });
  const port = fakePort();
  port.failNext = 2;
  const keeper = new VoiceKeeper({ store, port, now: () => t });
  await keeper.tick(); // fails, waits 5 s
  await keeper.tick();
  assert.equal(port.joins.length, 1, "does not retry at once");
  t += 5_001;
  await keeper.tick(); // fails again, waits 15 s
  t += 10_000;
  await keeper.tick();
  assert.equal(port.joins.length, 2);
  t += 6_000;
  await keeper.tick(); // succeeds
  assert.equal(port.joins.length, 3);
  assert.equal(keeper.status("g").present, 1);
});

test("lowering the number of bots makes the extra ones leave, and leave() clears the room", async () => {
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  store.update("g", { voiceChannelId: "v", voiceBots: 3 });
  const port = fakePort();
  const keeper = new VoiceKeeper({ store, port });
  await keeper.tick();
  store.update("g", { voiceBots: 1 });
  await keeper.tick();
  assert.deepEqual(port.leaves.sort(), [1, 2]);
  await keeper.removeRoom("g");
  assert.deepEqual(store.get("g").voiceRooms, []);
  await keeper.tick();
  assert.equal(port.joins.length, 3, "nothing joins after leave()");
});

test("bots are handed out room by room in order, and later rooms move up when one is removed", async () => {
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  const port = fakePort([0, 1, 2, 3]);
  const keeper = new VoiceKeeper({ store, port });
  keeper.setRoom("g", "a", 2);
  keeper.setRoom("g", "b", 1);
  keeper.setRoom("g", "c", 1);
  assert.deepEqual(keeper.plan("g").map((r) => [r.channelId, r.slots]), [["a", [0, 1]], ["b", [2]], ["c", [3]]]);

  keeper.setRoom("g", "b", 2); // changing b to two bots pushes c's bot out of the pool
  assert.deepEqual(keeper.plan("g").map((r) => r.slots), [[0, 1], [2, 3], []]);
  keeper.setRoom("g", "b", 1);

  await keeper.removeRoom("g", "a");
  assert.deepEqual(keeper.plan("g").map((r) => [r.channelId, r.slots]), [["b", [0]], ["c", [1]]], "b and c move up to the first bots");
  await keeper.removeRoom("g", "b");
  assert.deepEqual(keeper.plan("g").map((r) => [r.channelId, r.slots]), [["c", [0]]]);
});

test("a bot that moves to another room is sent there", async () => {
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  const joined = [];
  const sitting = new Map();
  const port = {
    candidates: () => [0, 1],
    isIn: (slot, g, c) => sitting.get(slot) === c,
    async join(slot, g, c) {
      joined.push([slot, c]);
      sitting.set(slot, c);
      return true;
    },
    async leave(slot) {
      sitting.delete(slot);
    },
  };
  const keeper = new VoiceKeeper({ store, port });
  keeper.setRoom("g", "a", 1);
  keeper.setRoom("g", "b", 1);
  await keeper.tick();
  assert.deepEqual(joined, [[0, "a"], [1, "b"]]);
  await keeper.removeRoom("g", "a");
  await keeper.tick();
  assert.deepEqual(joined.at(-1), [0, "b"], "the bot that sat in b is first now, so it takes the first room left");
});

test("settings with the older single room still work", () => {
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  store.update("g", { voiceChannelId: "old", voiceBots: 2 });
  const keeper = new VoiceKeeper({ store, port: fakePort() });
  assert.deepEqual(keeper.plan("g").map((r) => [r.channelId, r.slots]), [["old", [0, 1]]]);
  keeper.setRoom("g", "new", 1);
  assert.deepEqual(store.get("g").voiceRooms, [{ channelId: "old", bots: 2 }, { channelId: "new", bots: 1 }]);
  assert.equal(store.get("g").voiceChannelId, null);
});

test("no eligible bot means nobody is assigned", () => {
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  store.update("g", { voiceChannelId: "v" });
  assert.deepEqual(new VoiceKeeper({ store, port: fakePort([]) }).assigned("g"), []);
});

function makeTools(overrides = {}) {
  let t = Date.parse("2026-10-02T20:00:00Z");
  const said = [];
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  store.update("g", { enabled: true, channelId: "c", voiceChannelId: "v", voiceGreet: true, language: "en", quietStart: 3, quietEnd: 4, ...overrides });
  const hours = createScoreStore(path.join(tmp(), "h.json"));
  let humans = 1;
  const vt = new VoiceTools({ store, hours, tools: getTools, say: (m) => said.push(m), humansIn: () => humans, timezone: "UTC", now: () => t, rng: () => 0 });
  return { vt, said, hours, store, advance: (ms) => (t += ms), setHumans: (n) => (humans = n) };
}

test("someone joining the room is greeted once, not twice in a row", () => {
  const { vt, said, advance } = makeTools();
  vt.userJoined({ guildId: "g", userId: "u1", channelId: "v" });
  vt.userLeft({ guildId: "g", userId: "u1" });
  vt.userJoined({ guildId: "g", userId: "u1", channelId: "v" });
  assert.equal(said.length, 1);
  assert.match(said[0].text, /<@u1>/);
  advance(31 * MIN);
  vt.userJoined({ guildId: "g", userId: "u1", channelId: "v" });
  assert.equal(said.length, 2, "greeted again after the cooldown");
});

test("no greeting when it is off, in another channel, for people already there, or in quiet hours", () => {
  const off = makeTools({ voiceGreet: false });
  off.vt.userJoined({ guildId: "g", userId: "u", channelId: "v" });
  assert.equal(off.said.length, 0);

  const other = makeTools();
  other.vt.userJoined({ guildId: "g", userId: "u", channelId: "elsewhere" });
  assert.equal(other.said.length, 0);

  const existing = makeTools();
  existing.vt.userJoined({ guildId: "g", userId: "u", channelId: "v", existing: true });
  assert.equal(existing.said.length, 0);

  const quiet = makeTools({ quietStart: 19, quietEnd: 22 });
  quiet.vt.userJoined({ guildId: "g", userId: "u", channelId: "v" });
  assert.equal(quiet.said.length, 0);
});

test("voice minutes are counted while someone sits in the room", async () => {
  const { vt, hours, advance } = makeTools();
  vt.userJoined({ guildId: "g", userId: "u", channelId: "v" });
  advance(10 * MIN + 20_000);
  await vt.tick();
  assert.equal(hours.top("g")[0].points, 10);
  advance(5 * MIN);
  vt.userLeft({ guildId: "g", userId: "u" });
  assert.equal(hours.top("g")[0].points, 15);
  assert.equal(hours.forget("u"), 1);
});

test("a Pomodoro session walks through work, break and done, and stops when the room stays empty", async () => {
  const { vt, said, advance, setHumans } = makeTools();
  const started = vt.pomodoro.start("g", { work: 5, brk: 1, rounds: 2 });
  assert.equal(started.ok, true);
  assert.equal(vt.pomodoro.start("g").ok, false, "only one at a time");
  assert.match(vt.startText("g", started.session), /5 minutes/);

  advance(5 * MIN);
  await vt.tick();
  assert.match(said.at(-1).text, /Round 1 of 2/);
  assert.equal(vt.pomodoro.status("g").phase, "break");
  advance(1 * MIN);
  await vt.tick();
  assert.equal(vt.pomodoro.status("g").round, 2);
  advance(5 * MIN);
  await vt.tick();
  assert.match(said.at(-1).text, /All 2 rounds/);
  assert.equal(vt.pomodoro.status("g"), null);

  vt.pomodoro.start("g", { work: 25 });
  setHumans(0);
  await vt.tick();
  advance(5 * MIN + 1);
  await vt.tick();
  assert.match(said.at(-1).text, /empty/);
  assert.equal(vt.pomodoro.status("g"), null);
});

test("Pomodoro numbers are clamped", () => {
  const sessions = new PomodoroSessions();
  const { session } = sessions.start("g", { work: 500, brk: 0, rounds: 99 });
  assert.deepEqual([session.work, session.brk, session.rounds], [90, 1, 8]);
});

test("durations are parsed", () => {
  assert.equal(parseDuration("10m"), 10 * MIN);
  assert.equal(parseDuration("1d12h"), (24 + 12) * 60 * MIN);
  assert.equal(parseDuration("2 h"), 120 * MIN);
  assert.equal(parseDuration("soon"), null);
  assert.equal(parseDuration("0m"), null);
});

test("reminders are delivered once, stripped of pings, limited per person and erasable", () => {
  const store = createReminderStore(path.join(tmp(), "r.json"));
  const item = store.add({ kind: "remind", guildId: "g", channelId: "c", userId: "u", inMs: 10 * MIN, text: "@everyone call <@123> mum", now: 0 });
  assert.equal(item.text, "call mum");
  assert.deepEqual(store.due(5 * MIN), []);
  assert.equal(store.due(10 * MIN).length, 1);
  store.done(item.id);
  assert.equal(store.due(11 * MIN).length, 0);

  assert.throws(() => store.add({ kind: "remind", guildId: "g", channelId: "c", userId: "u", inMs: 1000, text: "x", now: 0 }), /too soon/);
  for (let i = 0; i < 20; i++) store.add({ kind: "remind", guildId: "g", channelId: "c", userId: "u", inMs: 5 * MIN, text: `r${i}`, now: 0 });
  assert.throws(() => store.add({ kind: "remind", guildId: "g", channelId: "c", userId: "u", inMs: 5 * MIN, text: "one more", now: 0 }), /already have 20/);
  assert.equal(store.forget("u"), 20);
});

test("an event is announced a day before, an hour before and when it starts, each only once", () => {
  const store = createReminderStore(path.join(tmp(), "r.json"));
  store.add({ kind: "event", guildId: "g", channelId: "c", userId: "m", inMs: 3 * 24 * 60 * MIN, text: "Movie night", now: 0 });
  const day = 24 * 60 * MIN;
  assert.deepEqual(store.due(day).map((d) => d.stage), []);
  assert.deepEqual(store.due(2 * day + 1).map((d) => d.stage), ["day"]);
  assert.deepEqual(store.due(2 * day + 2).map((d) => d.stage), []);
  assert.deepEqual(store.due(3 * day - 30 * MIN).map((d) => d.stage), ["hour"]);
  assert.deepEqual(store.due(3 * day).map((d) => d.stage), ["due"]);

  const soon = createReminderStore(path.join(tmp(), "r2.json"));
  soon.add({ kind: "event", guildId: "g", channelId: "c", userId: "m", inMs: 30 * MIN, text: "Soon", now: 0 });
  assert.deepEqual(soon.due(MIN).map((d) => d.stage), [], "no 'a day before' for something 30 minutes away");
});

test("the voice, welcome and reminder lines exist in both languages", () => {
  assert.deepEqual(Object.keys(tools.en).sort(), Object.keys(tools.vi).sort());
  for (const key of Object.keys(tools.en)) {
    assert.equal(Array.isArray(tools.en[key]), Array.isArray(tools.vi[key]), key);
    if (Array.isArray(tools.en[key])) assert.equal(tools.en[key].length, tools.vi[key].length, key);
  }
  for (const line of [...tools.en.greet, ...tools.vi.greet, ...tools.en.welcome, ...tools.vi.welcome]) assert.match(line, /\{user\}/);
  for (const line of [...tools.en.remind, ...tools.vi.remind]) assert.match(line, /\{user\}.*\{text\}|\{text\}.*\{user\}/);
});
