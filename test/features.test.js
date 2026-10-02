import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getContent } from "../src/content/index.js";
import { createCustomStore, cleanText, CustomError, MAX_PER_KIND } from "../src/custom.js";
import { CompanionEngine } from "../src/engine.js";
import { formatContentList, formatStats, formatTop } from "../src/format.js";
import { CONTENT_KEY } from "../src/script.js";
import { createScoreStore, weekStart } from "../src/scores.js";
import { createUsageStore, dayRange } from "../src/usage.js";

const MIN = 60_000;
const NOON = Date.UTC(2026, 9, 2, 12, 0, 0); // a Friday

function seeded(seed = 1) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tmp() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "musi-feat-"));
  return { dir, file: (name) => path.join(dir, name), done: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Engine + fake bots + fake clock, with usage and scores recorded in memory. */
function harness({ slots = [0, 1, 2], settings = {}, only = null, language = "en", seed = 3, startAt = NOON, custom = null, transform = null } = {}) {
  let time = startAt;
  let counter = 0;
  const sent = [];
  const edits = [];
  const usage = [];
  const scoreRows = [];
  const state = { enabled: true, channelId: "chan", language, preset: "normal", quietStart: 23, quietEnd: 8, trivia: true, polls: true, qotdHour: null, ...settings };
  const store = { get: () => state, all: () => [["guild", state]] };
  const base = (lang, guildId) => {
    const bank = custom ? custom.merge(getContent(lang), guildId) : getContent(lang);
    return transform ? transform(bank) : bank;
  };
  const content = (lang, guildId) => {
    const bank = base(lang, guildId);
    if (!only) return bank;
    const keep = CONTENT_KEY[only];
    return { ...bank, ...Object.fromEntries(Object.values(CONTENT_KEY).filter((k) => k !== keep).map((k) => [k, []])) };
  };
  const bots = {
    available: () => slots.map((slot) => ({ slot })),
    send: async (m) => {
      const id = `m${++counter}`;
      sent.push({ ...m, id, at: time });
      return id;
    },
    edit: async (m) => edits.push(m),
  };
  const engine = new CompanionEngine({
    store,
    content,
    bots,
    timezone: "UTC",
    rng: seeded(seed),
    now: () => time,
    usage: { record: (guildId, day, event) => usage.push({ guildId, day, ...event }) },
    scores: { add: (guildId, userId, day, points) => scoreRows.push({ guildId, userId, day, points }) },
  });
  const tickBy = async (ms, step = MIN) => {
    for (let waited = 0; waited < ms; waited += step) {
      time += step;
      await engine.tick();
    }
  };
  return {
    engine,
    sent,
    edits,
    usage,
    scoreRows,
    state,
    now: () => time,
    setTime: (t) => (time = t),
    tickBy,
    /** Moves time in small steps until a new message appears (or gives up). */
    untilSpeaks: async (maxMs = 12 * 60 * MIN, step = MIN) => {
      const before = sent.length;
      for (let waited = 0; waited < maxMs && sent.length === before; waited += step) await tickBy(step, step);
      return sent.length > before;
    },
  };
}

// ---------------------------------------------------------------- stores

test("usage: counts per day, summaries over a window, no ids stored", () => {
  const t = tmp();
  try {
    const store = createUsageStore(t.file("usage.json"));
    store.record("g", "2026-10-02", { type: "start", kind: "question" });
    store.record("g", "2026-10-02", { type: "start", kind: "fact" });
    store.record("g", "2026-10-02", { type: "end", kind: "question", joined: true });
    store.record("g", "2026-10-02", { type: "end", kind: "fact", joined: false });
    store.record("g", "2026-10-02", { type: "reply", kind: "question" });
    store.record("g", "2026-10-02", { type: "ack" });
    store.record("g", "2026-10-02", { type: "trivia", answered: 4, correct: 3 });
    store.record("g", "2026-09-20", { type: "start", kind: "poll" });
    store.record("other", "2026-10-02", { type: "start", kind: "poll" });

    const week = store.summary("g", "2026-10-02", 7);
    assert.deepEqual([week.total, week.totalJoined, week.totalReplies, week.acks], [2, 1, 1, 1]);
    assert.deepEqual([week.triviaAnswers, week.triviaCorrect], [4, 3]);
    assert.equal(week.started.poll, undefined, "a start 12 days ago is outside the 7 day window");
    assert.equal(store.summary("g", "2026-10-02", 30).total, 3);
    assert.equal(store.summary("nobody", "2026-10-02").total, 0);

    // it survives a restart, and the file holds only counters
    const again = createUsageStore(t.file("usage.json"));
    assert.equal(again.summary("g", "2026-10-02", 7).total, 2);
    const raw = JSON.parse(readFileSync(t.file("usage.json"), "utf8"));
    const keys = new Set();
    const walk = (value) => {
      if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) (keys.add(k), walk(v));
    };
    walk(raw);
    for (const forbidden of ["userId", "user", "author", "message", "content", "text"]) assert.ok(!keys.has(forbidden), `the usage file must not hold ${forbidden}`);
  } finally {
    t.done();
  }
});

test("usage: old days are forgotten and dayRange is plain calendar arithmetic", () => {
  assert.deepEqual(dayRange("2026-03-02", 3), ["2026-03-02", "2026-03-01", "2026-02-28"]);
  assert.deepEqual(dayRange("2026-01-01", 2), ["2026-01-01", "2025-12-31"]);

  const t = tmp();
  try {
    const store = createUsageStore(t.file("usage.json"));
    store.record("g", "2026-01-01", { type: "start", kind: "fact" });
    store.record("g", "2026-10-02", { type: "start", kind: "fact" });
    assert.equal(store.summary("g", "2026-10-02", 365).total, 1, "the January day was dropped after 120 days");
  } finally {
    t.done();
  }
});

test("scores: weeks start on Monday; weekly and all-time boards; forget erases a person everywhere", () => {
  assert.equal(weekStart("2026-10-02"), "2026-09-28"); // Friday -> Monday
  assert.equal(weekStart("2026-09-28"), "2026-09-28");
  assert.equal(weekStart("2026-10-04"), "2026-09-28"); // Sunday belongs to the week before
  assert.equal(weekStart("2026-10-05"), "2026-10-05");

  const t = tmp();
  try {
    const scores = createScoreStore(t.file("scores.json"));
    scores.add("g1", "alice", "2026-10-02");
    scores.add("g1", "alice", "2026-10-03");
    scores.add("g1", "bob", "2026-10-03");
    scores.add("g1", "bob", "2026-09-20"); // an older week
    scores.add("g1", "bob", "2026-09-21");
    scores.add("g2", "alice", "2026-10-02");

    assert.deepEqual(scores.top("g1", { day: "2026-10-02" }), [{ userId: "alice", points: 2 }, { userId: "bob", points: 1 }]);
    assert.deepEqual(scores.top("g1"), [{ userId: "bob", points: 3 }, { userId: "alice", points: 2 }]);
    assert.deepEqual(scores.top("g1", { limit: 1 }).length, 1);
    assert.deepEqual(scores.top("nobody"), []);

    const reread = createScoreStore(t.file("scores.json"));
    assert.equal(reread.top("g1")[0].userId, "bob");

    assert.equal(reread.forget("alice"), 2);
    assert.equal(reread.forget("alice"), 0);
    assert.deepEqual(reread.top("g1").map((r) => r.userId), ["bob"]);
    assert.deepEqual(createScoreStore(t.file("scores.json")).top("g2"), []);
  } finally {
    t.done();
  }
});

test("custom content: validation, pings are stripped, limits, list, remove, and merging into the bank", () => {
  assert.equal(cleanText("hi @everyone and @here <@123> <#456> <@&789> there"), "hi and there");
  assert.equal(cleanText("   lots   of\n\nspace\t"), "lots of space");

  const t = tmp();
  try {
    const custom = createCustomStore(t.file("custom.json"));
    assert.throws(() => custom.add("g", "question", { text: "short" }), CustomError);
    assert.throws(() => custom.add("g", "joke", { setup: "setup is fine", punchline: "" }), CustomError);
    assert.throws(() => custom.add("g", "poll", { question: "A fine question?", options: ["only one"] }), CustomError);
    assert.throws(() => custom.add("g", "poll", { question: "A fine question?", options: ["a", "b", "c", "d", "e"] }), CustomError);
    assert.throws(() => custom.add("g", "poll", { question: "A fine question?", options: ["same", "same"] }), CustomError, "duplicates collapse to one option");
    assert.throws(() => custom.add("g", "nonsense", { text: "whatever it is" }), CustomError);

    const q = custom.add("g", "question", { text: "What is the best snack @everyone?" });
    assert.equal(q.text, "What is the best snack ?");
    custom.add("g", "joke", { setup: "Why did the bot cross the road?", punchline: "To reach the other server." });
    custom.add("g", "fact", { text: "Our server was founded on a Tuesday." });
    custom.add("g", "poll", { question: "Cats or dogs in this server?", options: ["Cats", "Dogs", "Both"] });
    custom.add("other", "fact", { text: "Another server's private fact." });

    assert.equal(custom.count("g"), 4);
    assert.equal(custom.list("g", "question")[0].id, q.id);

    const bank = custom.merge(getContent("en"), "g");
    assert.equal(bank.questions.length, getContent("en").questions.length + 1);
    assert.ok(bank.questions.at(-1).answers.length === 0, "custom questions fall back to the bots' own reactions");
    assert.equal(bank.riddles.at(-1).punchline, "To reach the other server.");
    assert.equal(bank.polls.length, getContent("en").polls.length + 1);
    assert.ok(!bank.facts.some((f) => f.text.includes("Another server")), "other servers' content is not mixed in");
    assert.equal(custom.merge(getContent("en"), "nobody"), getContent("en"));

    // ids are unique, survive a restart and are never reused after a removal
    const ids = new Set(["question", "joke", "fact", "poll"].flatMap((k) => custom.list("g", k).map((e) => e.id)));
    assert.equal(ids.size, 4);
    assert.equal(custom.remove("g", "question", 5), null);
    assert.equal(custom.remove("g", "question", 1).id, q.id);
    const reread = createCustomStore(t.file("custom.json"));
    assert.equal(reread.count("g"), 3);
    assert.ok(!ids.has(reread.add("g", "fact", { text: "A brand new fact for you." }).id));

    for (let i = 0; i < MAX_PER_KIND - 2; i++) reread.add("g", "fact", { text: `Fact number ${i} about us.` });
    assert.throws(() => reread.add("g", "fact", { text: "One fact too many for this server." }), /already have/);
  } finally {
    t.done();
  }
});

test("formatting: stats, leaderboard and content list", () => {
  assert.match(formatStats({ days: 7, total: 0, started: {}, joined: {}, replies: {}, totalJoined: 0, totalReplies: 0, acks: 0, triviaAnswers: 0, triviaCorrect: 0 }), /No conversations yet/);

  const text = formatStats({
    days: 7,
    started: { question: 4, trivia: 2, qotd: 1 },
    joined: { question: 2, trivia: 2 },
    replies: { question: 3 },
    total: 7,
    totalJoined: 4,
    totalReplies: 3,
    acks: 2,
    triviaAnswers: 5,
    triviaCorrect: 4,
  });
  assert.match(text, /\*\*7\*\* conversations started, \*\*4\*\* \(57%\)/);
  assert.match(text, /questions: 4 started, 2 engaged \(50%\), 3 direct replies/);
  assert.match(text, /trivia rounds: 2 started, 2 engaged \(100%\)/);
  assert.match(text, /question of the day: 1 started/);
  assert.match(text, /Trivia: 5 answers, 4 correct \(80%\)/);
  assert.doesNotMatch(text, /polls:/);

  const top = formatTop([{ userId: "1", points: 5 }, { userId: "2", points: 1 }, { userId: "3", points: 1 }, { userId: "4", points: 1 }], "Board");
  assert.match(top, /🥇 <@1>: 5 points/);
  assert.match(top, /🥈 <@2>: 1 point$/m);
  assert.match(top, /\*\*4\.\*\* <@4>/);

  assert.match(formatContentList("fact", []), /not added any facts/);
  const list = formatContentList("joke", [{ setup: "Setup?", punchline: "Punch." }]);
  assert.match(list, /\*\*1\.\*\* Setup\? → Punch\./);
  assert.match(formatContentList("poll", [{ question: "Q?", options: ["a", "b"] }]), /Q\? \(a \/ b\)/);
});

// ---------------------------------------------------------------- content

test("content: labels, polls and trivia are complete and well-formed in both languages", () => {
  const needed = ["qotd", "trivia", "triviaLocked", "triviaAlready", "triviaClosed", "triviaReveal", "triviaNobody", "triviaNoAnswers", "winners", "topWeek", "topAll", "topEmpty", "forgetDone", "forgetNone"];
  for (const language of ["en", "vi"]) {
    const c = getContent(language);
    for (const key of needed) assert.ok(c.labels[key]?.length > 3, `${language}: label ${key}`);
    assert.match(c.labels.triviaReveal, /\{letter\}.*\{option\}.*\{correct\}.*\{total\}/);

    assert.ok(c.polls.length >= 15);
    assert.equal(new Set(c.polls.map((p) => p.id)).size, c.polls.length);
    for (const p of c.polls) {
      assert.ok(p.question.endsWith("?") || p.question.endsWith("."), p.question);
      assert.ok(p.options.length >= 2 && p.options.length <= 4, p.id);
      assert.equal(new Set(p.options).size, p.options.length, `${p.id}: distinct options`);
      assert.ok(p.options.every((o) => o.length >= 1 && o.length <= 55), `${p.id}: option length`);
    }

    assert.ok(c.trivia.length >= 250, `${language}: ${c.trivia.length} trivia questions`);
    assert.equal(new Set(c.trivia.map((t) => t.id)).size, c.trivia.length);
    const positions = [0, 0, 0, 0];
    for (const t of c.trivia) {
      assert.ok(t.q.length > 10 && t.q.endsWith("?"), t.q);
      assert.equal(t.options.length, 4, t.id);
      assert.equal(new Set(t.options.map((o) => o.toLowerCase())).size, 4, `${t.id}: distinct options`);
      assert.ok(t.options.every((o) => o.length >= 1 && o.length <= 40), `${t.id}: option length`);
      assert.ok(Number.isInteger(t.answer) && t.answer >= 0 && t.answer <= 3, t.id);
      positions[t.answer]++;
    }
    assert.ok(Math.min(...positions) > c.trivia.length * 0.18, `${language}: the right answer moves around ${positions}`);
  }
  // both languages hold the same questions with the same right answer
  const en = getContent("en").trivia;
  const vi = getContent("vi").trivia;
  assert.equal(en.length, vi.length);
  assert.ok(en.every((t, i) => t.answer === vi[i].answer));
});

// ---------------------------------------------------------------- engine: usage

test("usage: a conversation people join is counted as engaged, replies and thank-yous are counted", async () => {
  const h = harness({ only: "fact" });
  await h.untilSpeaks();
  assert.equal(h.usage.filter((u) => u.type === "start").length, 1);
  assert.equal(h.usage.find((u) => u.type === "start").kind, "fact");

  h.engine.noteHumanMessage({ guildId: "guild", channelId: "chan", messageId: "r1", replyToMessageId: h.sent[0].id });
  await h.tickBy(5 * MIN);
  assert.equal(h.usage.filter((u) => u.type === "reply").length, 1);
  assert.equal(h.usage.find((u) => u.type === "reply").kind, "fact");
  assert.equal(h.usage.filter((u) => u.type === "ack").length, 1);

  await h.tickBy(15 * MIN);
  const end = h.usage.find((u) => u.type === "end");
  assert.deepEqual([end.kind, end.joined], ["fact", true]);
  assert.ok(h.usage.every((u) => u.day === "2026-10-02"));
});

test("usage: a conversation nobody touched ends as not engaged", async () => {
  const h = harness({ only: "fact" });
  await h.untilSpeaks();
  await h.untilSpeaks();
  await h.tickBy(MIN);
  const end = h.usage.find((u) => u.type === "end");
  assert.deepEqual([end.kind, end.joined], ["fact", false]);
});

// ---------------------------------------------------------------- engine: question of the day

test("question of the day: once a day at the chosen hour, even during quiet hours, with its label", async () => {
  const h = harness({ settings: { qotdHour: 9 }, startAt: Date.UTC(2026, 9, 2, 6, 0), only: "question" });
  h.state.quietStart = 5; // 9:00 is inside the quiet window on purpose
  h.state.quietEnd = 11;

  await h.tickBy(2 * 60 * MIN); // 06:00 -> 08:00: nothing
  assert.equal(h.sent.length, 0);

  await h.tickBy(90 * MIN); // reaches 09:00..09:30
  const first = h.sent[0];
  assert.ok(first, "posted at 9");
  assert.ok(first.text.startsWith("Question of the day:"));
  assert.equal(h.usage.find((u) => u.type === "start").kind, "qotd");

  // let the conversation finish, then nothing more is started for the rest of the day
  await h.tickBy(30 * MIN);
  const startersToday = () => h.sent.filter((m) => m.replyTo === null && m.text.startsWith("Question of the day:")).length;
  await h.tickBy(8 * 60 * MIN);
  assert.equal(startersToday(), 1);

  // next morning it posts again
  h.setTime(Date.UTC(2026, 9, 3, 8, 30));
  await h.tickBy(60 * MIN);
  assert.equal(startersToday(), 2);
});

test("question of the day: off by default, and it does not use up the daily limit", async () => {
  const off = harness({ only: "question", startAt: Date.UTC(2026, 9, 2, 8, 30) });
  off.state.qotdHour = null;
  await off.tickBy(40 * MIN);
  assert.equal(off.sent.filter((m) => m.text.startsWith("Question of the day:")).length, 0);

  const h = harness({ settings: { qotdHour: 9, preset: "calm", quietStart: 0, quietEnd: 0 }, only: "question", startAt: Date.UTC(2026, 9, 2, 8, 50) });
  await h.tickBy(20 * MIN);
  assert.ok(h.sent[0].text.startsWith("Question of the day:"));
  assert.equal(h.engine.status("guild").startsToday, 0, "the question of the day is not counted against the limit");
});

test("question of the day: waits for two bots and tries again", async () => {
  const h = harness({ slots: [0], settings: { qotdHour: 9 }, only: "question", startAt: Date.UTC(2026, 9, 2, 8, 55) });
  await h.tickBy(25 * MIN);
  assert.equal(h.sent.length, 0);
});

// ---------------------------------------------------------------- engine: polls

test("polls: one bot posts a poll, another reacts later unless people start talking", async () => {
  const h = harness({ only: "poll" });
  await h.untilSpeaks();
  const poll = h.sent[0];
  assert.ok(poll.poll.question.length > 5);
  assert.ok(poll.poll.options.length >= 2 && poll.poll.options.length <= 4);
  assert.equal(poll.trivia, undefined);

  assert.ok(await h.untilSpeaks());
  const react = h.sent[1];
  assert.notEqual(react.slot, poll.slot);
  assert.equal(react.replyTo, poll.id);

  const h2 = harness({ only: "poll", seed: 8 });
  await h2.untilSpeaks();
  h2.engine.noteHumanMessage({ guildId: "guild", channelId: "chan", messageId: "x" });
  assert.equal(await h2.untilSpeaks(30 * MIN), false);
});

test("settings can switch polls and trivia off", async () => {
  const noPolls = harness({ settings: { polls: false }, seed: 4, startAt: NOON });
  const noTrivia = harness({ settings: { trivia: false }, seed: 4, startAt: NOON });
  for (const h of [noPolls, noTrivia]) {
    h.state.preset = "lively";
    h.state.quietStart = 0;
    h.state.quietEnd = 0;
    for (let i = 0; i < 400; i++) await h.tickBy(15 * MIN, 5 * MIN);
  }
  assert.ok(noPolls.sent.length > 40);
  assert.ok(noPolls.sent.every((m) => !m.poll), "no polls");
  assert.ok(noPolls.sent.some((m) => m.trivia), "trivia still appears");
  assert.ok(noTrivia.sent.every((m) => !m.trivia), "no trivia");
  assert.ok(noTrivia.sent.some((m) => m.poll), "polls still appear");
});

// ---------------------------------------------------------------- engine: trivia

async function startTrivia(opts = {}) {
  const h = harness({ only: "trivia", ...opts });
  await h.untilSpeaks();
  const round = h.sent[0];
  return { h, round, t: round.trivia };
}

test("trivia: a question with four options and a token; answers lock in; the reveal scores the right ones", async () => {
  const { h, round, t } = await startTrivia();
  assert.equal(t.options.length, 4);
  assert.match(t.token, /^t[0-9a-z]+$/);
  assert.equal(t.label, getContent("en").labels.trivia);
  const bank = getContent("en").trivia.find((x) => x.q === t.question);
  assert.ok(bank, "the question comes from the bank");
  const right = bank.answer;
  const wrong = (right + 1) % 4;
  const g = (userId, choice, token = t.token) => h.engine.noteTriviaAnswer({ guildId: "guild", token, userId, choice });

  assert.equal(g("alice", right).status, "locked");
  assert.equal(g("bob", wrong).status, "locked");
  assert.equal(g("carol", right).status, "locked");
  assert.equal(g("alice", wrong).status, "already", "the first answer counts");
  assert.equal(g("dave", 7).status, "closed", "not a valid button");
  assert.equal(g("dave", 0, "tzzz").status, "closed", "an unknown round");
  assert.equal(g("erin", right, t.token).message, getContent("en").labels.triviaLocked);

  assert.ok(await h.untilSpeaks(), "another bot reveals the answer");
  const reveal = h.sent[1];
  assert.notEqual(reveal.slot, round.slot);
  assert.equal(reveal.replyTo, round.id);
  assert.ok(reveal.text.startsWith(`Answer: ${"ABCD"[right]}) ${bank.options[right]}.`), reveal.text);
  assert.match(reveal.text, /3 of 4 got it right/);
  for (const winner of ["alice", "carol", "erin"]) assert.ok(reveal.text.includes(`<@${winner}>`), `${winner} is listed`);
  assert.ok(!reveal.text.includes("<@bob>"));

  // scores for the right answers only, in this day
  assert.deepEqual(h.scoreRows.map((r) => r.userId).sort(), ["alice", "carol", "erin"]);
  assert.ok(h.scoreRows.every((r) => r.points === 1 && r.day === "2026-10-02"));
  // the buttons were turned off, and the usage counted the answers
  assert.equal(h.edits.length, 1);
  assert.deepEqual([h.edits[0].messageId, h.edits[0].closeTrivia], [round.id, true]);
  const counts = h.usage.find((u) => u.type === "trivia");
  assert.deepEqual([counts.answered, counts.correct], [4, 3]);

  // late presses are told the round is over and change nothing
  assert.equal(g("zed", right).status, "closed");
  assert.equal(h.scoreRows.length, 3);
});

test("trivia: everyone wrong, and nobody playing, get their own lines", async () => {
  const wrongRound = await startTrivia({ seed: 12 });
  const bank = getContent("en").trivia.find((x) => x.q === wrongRound.t.question);
  wrongRound.h.engine.noteTriviaAnswer({ guildId: "guild", token: wrongRound.t.token, userId: "u1", choice: (bank.answer + 1) % 4 });
  await wrongRound.h.untilSpeaks();
  assert.match(wrongRound.h.sent[1].text, /1 tried and nobody got it/);
  assert.equal(wrongRound.h.scoreRows.length, 0);

  const empty = await startTrivia({ seed: 13 });
  await empty.h.untilSpeaks();
  assert.match(empty.h.sent[1].text, /Nobody played this round/);
  assert.equal(empty.h.edits.length, 1, "the buttons are turned off even if nobody played");
});

test("trivia: playing counts as engaging, and the round does not stop for chatter", async () => {
  const { h, t } = await startTrivia({ seed: 14 });
  h.engine.noteHumanMessage({ guildId: "guild", channelId: "chan", messageId: "chat" });
  h.engine.noteTriviaAnswer({ guildId: "guild", token: t.token, userId: "u1", choice: 0 });
  assert.ok(await h.untilSpeaks(), "the reveal still comes");
  await h.tickBy(MIN);
  assert.equal(h.usage.find((u) => u.type === "end").joined, true);
});

test("trivia: Vietnamese rounds use Vietnamese labels and options", async () => {
  const { h, t } = await startTrivia({ language: "vi", seed: 15 });
  assert.equal(t.label, getContent("vi").labels.trivia);
  const bank = getContent("vi").trivia.find((x) => x.q === t.question);
  assert.deepEqual(t.options, bank.options);
  assert.equal(h.engine.noteTriviaAnswer({ guildId: "guild", token: t.token, userId: "a", choice: 0 }).message, getContent("vi").labels.triviaLocked);
  await h.untilSpeaks();
  assert.match(h.sent[1].text, /^Đáp án: [ABCD]\)/);
});

test("trivia: two rounds in a row do not repeat the same question", async () => {
  const h = harness({ only: "trivia", settings: { preset: "lively", quietStart: 0, quietEnd: 0 }, seed: 21 });
  const questions = [];
  for (let i = 0; i < 400 && questions.length < 12; i++) {
    await h.tickBy(10 * MIN, 5 * MIN);
    for (const m of h.sent) if (m.trivia && !questions.includes(m.trivia.question)) questions.push(m.trivia.question);
  }
  assert.ok(questions.length >= 12, `only ${questions.length} rounds happened`);
  assert.equal(new Set(questions).size, questions.length);
});

// ---------------------------------------------------------------- engine: custom content

test("custom content is spoken in that server only", async () => {
  const t = tmp();
  try {
    const custom = createCustomStore(t.file("custom.json"));
    custom.add("guild", "fact", { text: "Our channel was created on a rainy Tuesday." });
    custom.add("guild", "joke", { setup: "Why is our server so loud?", punchline: "Because of the cow." });
    custom.add("elsewhere", "fact", { text: "Another server's private fact." });

    // keep only the custom entries so the first thing said has to be one of them
    const onlyCustom = (bank) => ({ ...bank, facts: bank.facts.filter((f) => f.id.startsWith("c")), riddles: bank.riddles.filter((r) => r.id.startsWith("c")) });

    const fact = harness({ only: "fact", custom, transform: onlyCustom });
    await fact.untilSpeaks();
    assert.equal(fact.sent[0].text, "Our channel was created on a rainy Tuesday.");

    const joke = harness({ only: "riddle", custom, transform: onlyCustom });
    await joke.untilSpeaks();
    assert.equal(joke.sent[0].text, "Why is our server so loud?");
    await joke.untilSpeaks();
    await joke.untilSpeaks();
    assert.equal(joke.sent[2].text, "Because of the cow.");
  } finally {
    t.done();
  }
});

test("/companions now can ask for a specific kind of conversation", async () => {
  const h = harness();
  const result = await h.engine.startNow("guild", { kind: "trivia" });
  assert.equal(result.started, true);
  assert.ok(h.sent[0].trivia, "a trivia round was started");

  const h2 = harness();
  await h2.engine.startNow("guild", { kind: "poll" });
  assert.ok(h2.sent[0].poll);
});
