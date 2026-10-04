import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import DEBATE from "../src/content/debate.js";
import DRAMA from "../src/content/drama.js";
import { CLUTCH, FAIL } from "../src/content/events.js";
import { buildDebate } from "../src/debate.js";
import { COUPLES, WHO_SLOT, pickScene } from "../src/drama.js";
import { HYPE_LIMITS, HypeSessions } from "../src/hype.js";
import { MALE_SLOTS, buildPraise } from "../src/praise.js";
import { createPraiseStore } from "../src/praisestats.js";
import { DEFAULTS } from "../src/settings.js";
import { clutchCommand, dramaCommand, failCommand, hypeCommand, khenTopCommand, tranhluanCommand } from "../src/runtime.js";

const all = (count) => Array.from({ length: count }, (_, i) => i);
const clean = (line) => !line.includes("\n") && !line.includes("—") && !line.includes("@") && line.length > 5;

test("clutch and fail: every bot gets its own line in both languages, no placeholder left", () => {
  for (const mood of ["clutch", "fail"]) {
    for (const language of ["vi", "en"]) {
      for (const goi of ["anh", "chị", "bạn"]) {
        for (const ten of ["", "Minh"]) {
          const round = buildPraise({ mood, language, goi, ten, slots: all(30) });
          assert.equal(new Set(round.map((r) => r.text)).size, 30, `${mood} ${language} ${goi} ${ten}`);
          for (const { text } of round) assert.ok(!/\{|\}|undefined|@/.test(text) && text.length < 130, text);
        }
      }
    }
  }
  const em = /(^|[\s,.!?])[Ee]m([\s,.!?]|$)/;
  for (const mood of ["clutch", "fail"]) {
    for (const { slot, text } of buildPraise({ mood, language: "vi", goi: "anh", slots: all(30) })) if (MALE_SLOTS.has(slot)) assert.ok(!em.test(text), text);
  }
  for (const bank of [CLUTCH, FAIL]) for (const group of Object.values(bank.vi)) for (const line of Object.values(group).flat()) assert.ok(clean(line), line);
});

test("hype: it speaks first at once, one bot at a time, never twice in a row, and stops when time is up", async () => {
  let t = 0;
  const timers = [];
  const said = [];
  const hype = new HypeSessions({
    send: async ({ slot, text }) => said.push({ slot, text }),
    now: () => t,
    rng: () => 0.5,
    setTimer: (fn, ms) => {
      const timer = { fn, ms, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => timer && (timer.cleared = true),
  });
  const started = hype.start({ key: "g:c", minutes: 10, mood: "mix", slots: all(30) });
  assert.equal(started.ok, true);
  assert.equal(hype.start({ key: "g:c", slots: all(30) }).ok, false, "one session per channel");
  assert.equal(timers[0].ms, 0, "the first message comes at once");
  await timers[0].fn();
  assert.equal(said.length, 1);
  assert.ok(timers[1].ms >= 20_000 && timers[1].ms <= 45_000, `the next one comes in 20 to 45 seconds (${timers[1].ms})`);
  await timers[1].fn();
  assert.equal(said.length, 2);
  assert.notEqual(said[0].text, said[1].text);
  assert.deepEqual(hype.status("g:c"), { minutesLeft: 10, sent: 2 });
  t = 11 * 60_000;
  await timers.at(-1).fn();
  assert.equal(said.length, 2, "nothing is said after the time is up");
  assert.equal(hype.status("g:c"), null);
  assert.equal(hype.start({ key: "g:c", minutes: 5, slots: [1, 2] }).ok, true, "it can start again once it ended");
  assert.equal(hype.stop("g:c"), true);
  assert.equal(hype.stop("g:c"), false);
  assert.equal(HYPE_LIMITS.defaultMinutes, 15);
  assert.equal(hype.start({ key: "x", minutes: 9999, slots: [0] }).minutes, 60, "the length is limited");
  assert.equal(hype.start({ key: "y", minutes: 1, slots: [0] }).minutes, 5);
  hype.stopAll();
});

test("tranhluan: two camps take turns with the right names, then one verdict", () => {
  const out = buildDebate({ language: "vi", a: "phở", b: "bún", slots: all(30), rng: () => 0.3 });
  assert.ok(out);
  assert.ok(out.script.length >= 4 && out.script.length <= 12, `a readable length (${out.script.length})`);
  assert.equal(new Set(out.script.map((l) => l.text)).size, out.script.length, "no line is said twice");
  const text = out.script.map((l) => l.text).join(" ");
  assert.ok(text.includes("phở") && text.includes("bún"));
  for (const { text: line } of out.script) assert.ok(!/\{|\}|undefined|@/.test(line) && line.length < 200, line);
  assert.ok(["a", "b", "tie"].includes(out.winner));
  const em = /(^|[\s,.!?])[Ee]m([\s,.!?]|$)/;
  for (const { slot, text: line } of buildDebate({ language: "vi", a: "x", b: "y", slots: all(30), maxBots: 30 }).script) if (MALE_SLOTS.has(slot)) assert.ok(!em.test(line), line);
  assert.equal(buildDebate({ language: "vi", a: "", b: "bún", slots: all(30) }), null);
  assert.equal(buildDebate({ language: "vi", a: "phở", b: "bún", slots: [1] }), null);
  const safe = buildDebate({ language: "en", a: "@everyone", b: "`pizza`", slots: all(5) });
  assert.ok(safe.script.every((l) => !l.text.includes("@") && !l.text.includes("`")));
  for (const language of ["vi", "en"]) {
    const bank = DEBATE[language];
    for (const line of [...bank.girl.camp, ...bank.boy.camp, ...bank.opener, ...bank.verdict, ...bank.tie]) assert.ok(clean(line), line);
    for (const line of [...bank.girl.camp, ...bank.boy.camp]) assert.ok(line.includes("{mine}"), line);
    assert.ok(bank.girl.camp.length >= 20 && bank.verdict.length >= 8 && bank.opener.length >= 4 && bank.tie.length >= 3);
  }
});

test("drama: every scene belongs to its pair, reads the same in both languages, and only plays when both bots are there", () => {
  const pairs = { "lai-six": ["laibang", "six"], "giang-phuong": ["giang", "phuong"], "fury-chamy": ["fury", "chamy"] };
  assert.deepEqual(COUPLES, Object.keys(pairs));
  const ids = new Set();
  for (const scene of DRAMA.scenes) {
    assert.ok(!ids.has(scene.id), scene.id);
    ids.add(scene.id);
    assert.equal(scene.vi.length, scene.en.length, scene.id);
    assert.ok(scene.vi.length >= 3 && scene.vi.length <= 4, scene.id);
    for (const line of [...scene.vi, ...scene.en]) {
      assert.ok(pairs[scene.couple].includes(line.who), `${scene.id}: ${line.who}`);
      assert.ok(clean(line.text) && line.text.length <= 170 && !/[{}]/.test(line.text), line.text);
    }
    assert.deepEqual(scene.vi.map((l) => l.who), scene.en.map((l) => l.who), `${scene.id}: the same speakers`);
  }
  for (const couple of COUPLES) assert.ok(DRAMA.scenes.filter((s) => s.couple === couple).length >= 6, couple);
  const everyone = new Set(all(30));
  for (const couple of COUPLES) {
    const scene = pickScene({ language: "vi", couple, available: everyone });
    assert.ok(scene.every(({ slot }) => pairs[couple].some((who) => WHO_SLOT[who] === slot)));
  }
  assert.equal(pickScene({ language: "vi", couple: "lai-six", available: new Set([WHO_SLOT.six]) }), null, "needs both bots");
  assert.ok(pickScene({ language: "en", available: new Set([WHO_SLOT.fury, WHO_SLOT.chamy]) }).every(({ slot }) => [21, 22].includes(slot)), "any pair that fits");
  assert.equal(pickScene({ language: "vi", available: new Set() }), null);
});

test("cheer counts: a week at a time, names only, case-insensitive, erased with the server", () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "praise-")), "praise.json");
  const store = createPraiseStore(file);
  const mon = "2026-10-05";
  store.record("g", "khen", "Minh", mon);
  store.record("g", "khen", "minh", "2026-10-07");
  store.record("g", "khen", "Lan", mon);
  store.record("g", "che", "Minh", mon);
  store.record("g", "khen", "", mon);
  store.record("g", "other", "Minh", mon);
  assert.deepEqual(store.top("g", "khen", "2026-10-08"), [{ name: "Minh", count: 2 }, { name: "Lan", count: 1 }]);
  assert.deepEqual(store.top("g", "che", "2026-10-08"), [{ name: "Minh", count: 1 }]);
  assert.deepEqual(store.top("g", "khen", "2026-10-12"), [], "a new week starts from zero");
  assert.deepEqual(createPraiseStore(file).top("g", "khen", "2026-10-08")[0], { name: "Minh", count: 2 }, "it is saved");
  assert.equal(store.forgetGuild("g"), true);
  assert.equal(store.forgetGuild("g"), false);
  assert.deepEqual(store.top("g", "khen", "2026-10-08"), []);
  assert.deepEqual(createPraiseStore().top("g", "khen", mon), [], "works without a file");
});

test("the new commands are valid and the evening scene is off by default", () => {
  const names = (c) => c.toJSON().options.map((o) => o.name);
  assert.deepEqual(names(clutchCommand), ["nguoi", "goi", "ten", "language"]);
  assert.deepEqual(names(failCommand), ["nguoi", "goi", "ten", "language"]);
  assert.deepEqual(names(tranhluanCommand), ["a", "b", "language"]);
  assert.deepEqual(names(dramaCommand), ["couple", "language"]);
  assert.deepEqual(hypeCommand.toJSON().options.map((o) => o.name), ["start", "stop"]);
  assert.deepEqual(hypeCommand.toJSON().options[0].options.map((o) => o.name), ["minutes", "mood", "nguoi", "goi", "ten", "language"]);
  assert.equal(khenTopCommand.toJSON().name, "khen-top");
  assert.equal(DEFAULTS.drama, false);
  assert.equal(DEFAULTS.lastDramaDay, "");
});
