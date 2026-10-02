import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createAlerter, scrub } from "../src/alerts.js";
import { backupData } from "../src/backup.js";
import { getTools } from "../src/content/tools.js";
import { collectRecap, formatRecap, formatStats } from "../src/format.js";
import { createScoreStore } from "../src/scores.js";
import { pickKind } from "../src/script.js";
import { adaptiveWeights, createUsageStore } from "../src/usage.js";
import { createSettingsStore } from "../src/settings.js";
import { VoiceKeeper } from "../src/voice.js";

// shaped like a bot token (three dot-separated parts) but built here from pieces, so it is plainly not a real one
const fakeToken = ["a".repeat(24), "b".repeat(6), "c".repeat(27)].join(".");
const tmp = () => mkdtempSync(path.join(tmpdir(), "ops-"));

test("alerts are sent once per kind per cooldown, with pings off and tokens hidden", async () => {
  let t = 0;
  const sent = [];
  const alerter = createAlerter({
    url: "https://example.test/hook",
    now: () => t,
    fetchImpl: async (url, init) => {
      sent.push(JSON.parse(init.body));
      return { ok: true };
    },
  });
  assert.equal(await alerter.notify("a", `Companion 1 is offline. ${fakeToken}`), true);
  assert.equal(await alerter.notify("a", "again"), false, "same kind within the cooldown");
  assert.equal(await alerter.notify("b", "other kind"), true);
  t += 31 * 60_000;
  assert.equal(await alerter.notify("a", "later"), true);
  assert.equal(sent.length, 3);
  assert.deepEqual(sent[0].allowed_mentions, { parse: [] });
  assert.ok(!sent[0].content.includes(fakeToken), "token-like text is hidden");
  assert.match(sent[0].content, /\[hidden\]/);
  assert.match(sent[0].content, /offline/);
});

test("alerts do nothing without a webhook, and a failing webhook never throws", async () => {
  assert.equal(await createAlerter({}).notify("a", "x"), false);
  const failing = createAlerter({ url: "https://example.test", fetchImpl: async () => ({ ok: false, status: 500 }), log: () => {} });
  assert.equal(await failing.notify("a", "x"), false);
  const throwing = createAlerter({ url: "https://example.test", fetchImpl: async () => { throw new Error("offline"); }, log: () => {} });
  assert.equal(await throwing.notify("a", "x"), false);
  assert.equal(scrub("x".repeat(5000)).length, 1800);
});

test("the daily backup copies the json files once a day and keeps the newest days", () => {
  const dir = tmp();
  writeFileSync(path.join(dir, "companions.json"), '{"a":1}');
  writeFileSync(path.join(dir, "scores.json"), "{}");
  writeFileSync(path.join(dir, "notes.txt"), "not data");
  assert.deepEqual(backupData(dir, "2026-10-01").sort(), ["companions.json", "scores.json"]);
  assert.equal(readFileSync(path.join(dir, "backups", "2026-10-01", "companions.json"), "utf8"), '{"a":1}');
  assert.ok(!existsSync(path.join(dir, "backups", "2026-10-01", "notes.txt")));

  writeFileSync(path.join(dir, "companions.json"), '{"a":2}');
  assert.deepEqual(backupData(dir, "2026-10-01"), [], "a day that already has a backup is left alone");
  assert.equal(readFileSync(path.join(dir, "backups", "2026-10-01", "companions.json"), "utf8"), '{"a":1}');

  for (let d = 2; d <= 9; d++) backupData(dir, `2026-10-0${d}`, { keep: 3 });
  assert.deepEqual(readdirSync(path.join(dir, "backups")).sort(), ["2026-10-07", "2026-10-08", "2026-10-09"]);
  assert.deepEqual(backupData(path.join(dir, "missing"), "2026-10-10"), []);
  mkdirSync(path.join(dir, "empty"));
});

test("the keeper reports a bot that has been unable to join for a while", async () => {
  let t = 0;
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  const port = {
    candidates: () => [0],
    where: () => null,
    exists: () => true,
    sameCategory: () => false,
    join: async () => false,
    leave: async () => {},
  };
  const keeper = new VoiceKeeper({ store, port, now: () => t, settleMs: 0 });
  keeper.setRoom("g", "v", 1);
  await keeper.tick();
  assert.deepEqual(keeper.stuck(10 * 60_000), []);
  for (let i = 0; i < 6; i++) {
    t += 301_000;
    await keeper.tick();
  }
  const stuck = keeper.stuck(10 * 60_000);
  assert.equal(stuck.length, 1);
  assert.deepEqual([stuck[0].guildId, stuck[0].slot], ["g", 0]);
});

test("the weekly recap gathers last week's numbers and reads well in both languages", () => {
  const dir = tmp();
  const usage = createUsageStore(path.join(dir, "u.json"));
  const scores = createScoreStore(path.join(dir, "s.json"));
  const hours = createScoreStore(path.join(dir, "h.json"));
  // Monday 2026-10-05 is the day of the recap; the week before is Mon 09-28 to Sun 10-04
  for (const day of ["2026-09-29", "2026-10-03"]) {
    usage.record("g", day, { type: "start", kind: "question" });
    usage.record("g", day, { type: "end", kind: "question", joined: true });
    usage.record("g", day, { type: "trivia", answered: 3, correct: 2 });
  }
  usage.record("g", "2026-10-05", { type: "start", kind: "fact" }); // this week, must not be counted
  scores.add("g", "u1", "2026-09-30", 3);
  scores.add("g", "u2", "2026-10-05", 9); // this week, must not count
  hours.add("g", "u3", "2026-10-02", 125);

  const data = collectRecap({ usage, scores, hours, guildId: "g", day: "2026-10-05" });
  assert.deepEqual([data.convos, data.joined, data.triviaAnswers, data.triviaCorrect], [2, 2, 6, 4]);
  assert.deepEqual(data.topPlayer, { userId: "u1", points: 3 });
  assert.deepEqual(data.topVoice, { userId: "u3", points: 125 });

  const en = formatRecap(getTools("en"), data);
  assert.match(en, /2 conversations/);
  assert.match(en, /<@u1> with 3 points/);
  assert.match(en, /<@u3>, 125 minutes/);
  const vi = formatRecap(getTools("vi"), data);
  assert.match(vi, /2 cuộc trò chuyện/);
  assert.match(vi, /<@u3>, 125 phút/);

  const quiet = formatRecap(getTools("en"), collectRecap({ usage, scores, hours, guildId: "empty", day: "2026-10-05" }));
  assert.match(quiet, /quiet week/);
});

test("streaks count consecutive days, reset after a missed day and are peeked without changing anything", () => {
  const scores = createScoreStore(path.join(tmp(), "s.json"));
  assert.deepEqual(scores.streak("g", "u", "2026-10-01"), { current: 0, best: 0 });
  assert.deepEqual(scores.peekStreak("g", "u", "2026-10-01"), { current: 1, isNew: true });
  assert.deepEqual(scores.streak("g", "u", "2026-10-01"), { current: 0, best: 0 }, "peeking changes nothing");

  scores.add("g", "u", "2026-10-01");
  scores.add("g", "u", "2026-10-01"); // a second point the same day is not a new day
  scores.add("g", "u", "2026-10-02");
  scores.add("g", "u", "2026-10-03");
  assert.deepEqual(scores.streak("g", "u", "2026-10-03"), { current: 3, best: 3 });
  assert.deepEqual(scores.peekStreak("g", "u", "2026-10-03"), { current: 3, isNew: false });
  assert.deepEqual(scores.peekStreak("g", "u", "2026-10-04"), { current: 4, isNew: true });
  assert.equal(scores.streak("g", "u", "2026-10-04").current, 3, "still alive the day after");
  assert.deepEqual(scores.streak("g", "u", "2026-10-05"), { current: 0, best: 3 }, "a missed day ends it, the best stays");

  scores.add("g", "u", "2026-10-06");
  assert.deepEqual(scores.streak("g", "u", "2026-10-06"), { current: 1, best: 3 });
  assert.equal(scores.weekTotal("g", "u", "2026-10-02"), 4);
});

test("adaptive weights favour kinds that get people talking, stay bounded, and wait for enough data", () => {
  assert.equal(adaptiveWeights({ total: 19, totalJoined: 10, started: { question: 19 }, joined: { question: 10 } }), null, "too little data");
  const summary = {
    total: 60,
    totalJoined: 30,
    started: { question: 20, riddle: 20, fact: 15, poll: 3, trivia: 2 },
    joined: { question: 16, riddle: 2, fact: 8, poll: 0, trivia: 2 },
  };
  const w = adaptiveWeights(summary);
  assert.ok(w.question > 1.2 && w.question <= 2, `questions work well here: ${w.question}`);
  assert.ok(w.riddle < 0.8 && w.riddle >= 0.5, `riddles do not: ${w.riddle}`);
  assert.ok(Math.abs(w.fact - 1) < 0.25, `facts are about average: ${w.fact}`);
  assert.equal(w.poll, 1, "fewer than 5 tries: no opinion yet");
  assert.equal(adaptiveWeights({ total: 30, totalJoined: 0, started: { question: 30 }, joined: {} }).question, 1, "nobody ever joined: nothing to learn from");
});

test("the weights really change which kind is picked", () => {
  const bank = { questions: [{ id: "q" }], riddles: [{ id: "r" }], facts: [], banter: [], polls: [], trivia: [] };
  let seed = 7;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const count = (multipliers) => {
    const n = { question: 0, riddle: 0 };
    for (let i = 0; i < 2000; i++) n[pickKind(bank, [], rng, null, multipliers)]++;
    return n;
  };
  const plain = count(null);
  const boosted = count({ question: 2, riddle: 0.5 });
  assert.ok(boosted.question / boosted.riddle > (plain.question / plain.riddle) * 2.5, `${JSON.stringify(plain)} then ${JSON.stringify(boosted)}`);
});

test("usage keeps engagement per hour and the stats show the best hour and the adaptive mix", () => {
  const usage = createUsageStore(path.join(tmp(), "u.json"));
  for (let i = 0; i < 6; i++) {
    usage.record("g", "2026-10-01", { type: "start", kind: "question", hour: 9 });
    usage.record("g", "2026-10-01", { type: "end", kind: "question", joined: i < 1, hour: 9 });
    usage.record("g", "2026-10-01", { type: "start", kind: "question", hour: 19 });
    usage.record("g", "2026-10-01", { type: "end", kind: "question", joined: i < 5, hour: 19 });
  }
  const summary = usage.summary("g", "2026-10-02", 7);
  assert.deepEqual(summary.byHour["19"], { started: 6, joined: 5 });
  const text = formatStats(summary, { weights: { question: 1.6, riddle: 0.6 }, adaptive: true });
  assert.match(text, /Best hour.*19:00/);
  assert.match(text, /Adaptive tuning is on: picking questions ×1\.6/);
  assert.match(formatStats(summary, { adaptive: false }), /Adaptive tuning is off/);
});
