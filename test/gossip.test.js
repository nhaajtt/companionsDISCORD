import assert from "node:assert/strict";
import test from "node:test";
import SCENES from "../src/content/gossip.js";
import PREDICT from "../src/content/predict.js";
import TIME_NOTES from "../src/content/timenotes.js";
import { getContent } from "../src/content/index.js";
import { GOSSIP_TAGS, SEEN_LIMIT, castScene, personaName, pickGossip, rememberScene } from "../src/gossip.js";
import { MALE_SLOTS } from "../src/praise.js";
import { PREDICT_LIMITS, Predictions, announceText, closedText, planBets, predictLine, resultText } from "../src/predict.js";
import { periodOf, timeNotesFor } from "../src/timenotes.js";
import { presenceText } from "../src/voicetools.js";
import { getTools } from "../src/content/tools.js";
import { dudoanCommand, tamchuyenCommand } from "../src/runtime.js";
import { DEFAULTS } from "../src/settings.js";

const all = (n = 30) => new Set(Array.from({ length: n }, (_, i) => i));
const NAMES = getContent("en").personas.map((p) => p.name);
const emojiOnly = (text) => !/[\p{L}\p{N}]/u.test(text);

test("gossip content: every scene is well-formed in both languages", () => {
  assert.ok(SCENES.length >= 50, `${SCENES.length} scenes`);
  const ids = new Set();
  const seenText = new Set();
  const quick = { vi: 0, en: 0 };
  for (const scene of SCENES) {
    assert.ok(!ids.has(scene.id), `duplicate id ${scene.id}`);
    ids.add(scene.id);
    assert.ok(scene.tags.length >= 1 && scene.tags.every((t) => GOSSIP_TAGS.includes(t)), `${scene.id}: tags`);
    const roles = Object.keys(scene.cast);
    assert.ok(roles.length >= 3 && roles.length <= 5, `${scene.id}: 3 to 5 roles`);
    for (const [role, who] of Object.entries(scene.cast)) {
      if (who === "girl") assert.match(role, /^g[1-4]$/, `${scene.id}: generic roles are g1 to g4`);
      else assert.ok(NAMES.includes(who), `${scene.id}: unknown bot ${who}`);
    }
    assert.equal(scene.vi.length, scene.en.length, `${scene.id}: same length`);
    assert.ok(scene.vi.length >= 6 && scene.vi.length <= 10, `${scene.id}: 6 to 10 lines`);
    const used = new Set();
    scene.vi.forEach((line, i) => {
      const twin = scene.en[i];
      assert.equal(line.r, twin.r, `${scene.id}#${i}: same speaker`);
      assert.equal(line.re, twin.re, `${scene.id}#${i}: same reply target`);
      assert.ok(roles.includes(line.r), `${scene.id}#${i}: role ${line.r}`);
      used.add(line.r);
      if (line.re !== undefined) assert.ok(Number.isInteger(line.re) && line.re >= 0 && line.re < i, `${scene.id}#${i}: reply points back`);
    });
    assert.deepEqual([...used].sort(), [...roles].sort(), `${scene.id}: every role speaks`);
    assert.ok(scene.vi.filter((l) => l.re !== undefined).length >= 2, `${scene.id}: at least two threaded replies`);
    for (const [language, lines] of [["vi", scene.vi], ["en", scene.en]]) {
      lines.forEach((line, i) => {
        const where = `${scene.id} ${language}#${i}`;
        assert.ok(line.text.length > 0 && line.text.length <= 160, `${where}: length ${line.text.length}`);
        assert.ok(!/\n|—|@/.test(line.text), `${where}: ${line.text}`);
        for (const [, name] of line.text.matchAll(/\{(\w+)\}/g)) {
          if (name === "owner") assert.ok(scene.tags.includes("owner"), `${where}: {owner} only in owner scenes`);
          else {
            assert.ok(roles.includes(name), `${where}: unknown placeholder {${name}}`);
            assert.notEqual(name, line.r, `${where}: names its own speaker`);
          }
        }
        assert.ok(!/\{(?!\w+\})|(?<!\{\w{0,20})\}/.test(line.text.replace(/\{\w+\}/g, "")), `${where}: stray brace`);
        if (!emojiOnly(line.text)) {
          assert.ok(!seenText.has(`${language}|${line.text}`), `${where}: repeated text`);
          seenText.add(`${language}|${line.text}`);
        }
      });
      if (lines.some((l) => emojiOnly(l.text) || l.text.replace(/\{\w+\}/g, "x").split(/\s+/).length <= 5)) quick[language]++;
    }
  }
  for (const language of ["vi", "en"]) assert.ok(quick[language] / SCENES.length >= 0.8, `${language}: most scenes have a quick reaction (${quick[language]} of ${SCENES.length})`);
  assert.ok(SCENES.filter((s) => s.tags.includes("owner")).length >= 8, "owner scenes");
  const vietnamese = SCENES.flatMap((s) => s.vi.map((l) => l.text)).filter((t) => /[a-z]/i.test(t));
  const accented = vietnamese.filter((t) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(t)).length;
  assert.ok(accented / vietnamese.length > 0.6, `Vietnamese has accents (${accented} of ${vietnamese.length})`);
});

test("gossip: boys never take a generic role, specific roles go to that very bot", () => {
  for (const scene of SCENES) {
    const cast = castScene(scene, { available: all(), rng: () => 0.37 });
    assert.ok(cast, scene.id);
    assert.equal(new Set(cast.values()).size, cast.size, `${scene.id}: one bot per role`);
    for (const [role, who] of Object.entries(scene.cast)) {
      if (who === "girl") assert.ok(!MALE_SLOTS.has(cast.get(role)), `${scene.id}: a boy took ${role}`);
      else assert.equal(NAMES[cast.get(role)], who);
    }
  }
  const couple = SCENES.find((s) => Object.values(s.cast).includes("Six"));
  assert.equal(castScene(couple, { available: new Set([24]) }), null, "needs the other bots too");
  const generic = SCENES.find((s) => Object.values(s.cast).every((w) => w === "girl"));
  assert.equal(castScene(generic, { available: new Set([0, 1]) }), null, "not enough girls");
  assert.equal(castScene(generic, { available: new Set([23, 25]) }), null, "boys do not play girl roles");
});

test("gossip: the names are filled in, threaded replies are kept, the owner needs to be around", () => {
  for (const language of ["vi", "en"]) {
    for (let i = 0; i < 40; i++) {
      const picked = pickGossip({ language, available: all(), ownerName: "Minh", rng: Math.random });
      assert.ok(picked.script.length >= 6);
      picked.script.forEach((line, n) => {
        assert.ok(Number.isInteger(line.slot) && line.slot >= 0 && line.slot < 30);
        assert.ok(!/[{}]/.test(line.text), line.text);
        if (line.re !== undefined) assert.ok(line.re < n);
      });
    }
  }
  const owner = pickGossip({ language: "vi", available: all(), tag: "owner", ownerName: "Minh" });
  assert.ok(owner.tags.includes("owner") && owner.script.some((l) => l.text.includes("Minh")), "the owner's name is said");
  assert.equal(pickGossip({ language: "vi", available: all(), tag: "owner", ownerName: "" }), null, "no owner around, no owner gossip");
  for (let i = 0; i < 60; i++) assert.ok(!pickGossip({ language: "vi", available: all(), ownerName: "" }).tags.includes("owner"), "owner scenes only when the owner is around");
  const food = pickGossip({ language: "en", available: all(), tag: "food" });
  assert.ok(food.tags.includes("food"));
  assert.equal(personaName("vi", 22), "Chamy");
  const nameInText = SCENES.find((s) => /\{a\}|\{b\}/.test(JSON.stringify(s.vi)) && Object.values(s.cast).includes("Six"));
  if (nameInText) assert.ok(pickGossip({ language: "en", available: all(), scenes: [nameInText] }).script.some((l) => NAMES.some((n) => l.text.includes(n))));
});

test("gossip: a server does not see the same scene again until the rest were seen", () => {
  const seen = [];
  const first = new Set();
  let reset = false;
  for (let i = 0; i < SCENES.length; i++) {
    const picked = pickGossip({ language: "vi", available: all(), seen, ownerName: "Minh" });
    assert.ok(!first.has(picked.id), `repeated too soon: ${picked.id}`);
    first.add(picked.id);
    seen.splice(0, seen.length, ...rememberScene(seen, picked.id, picked.reset));
    reset ||= picked.reset;
  }
  assert.equal(reset, false, "nothing repeated during the first full round");
  assert.equal(pickGossip({ language: "vi", available: all(), seen: SCENES.map((s) => s.id), ownerName: "Minh" }).reset, true, "when all were seen it starts again");
  assert.deepEqual(rememberScene(["a", "b"], "c", true), ["c"]);
  assert.deepEqual(rememberScene(["a", "b"], "a"), ["b", "a"]);
  assert.equal(rememberScene(Array.from({ length: 100 }, (_, i) => `x${i}`), "y").length, SEEN_LIMIT);
});

test("dudoan: votes can change, close once, the result lists who was right, and the bets are counted", () => {
  const timers = [];
  const closed = [];
  const predictions = new Predictions({ rng: () => 0.5, setTimer: (fn, ms) => (timers.push({ fn, ms }), timers.length), clearTimer: () => {}, onClose: (s) => closed.push(s.token) });
  const started = predictions.start({ key: "g:c", starterId: "u1", ten: "Minh", minutes: 99, slots: [1, 2, 3] });
  assert.equal(started.ok, true);
  assert.equal(started.session.minutes, PREDICT_LIMITS.maxMinutes, "the time is limited");
  assert.equal(predictions.start({ key: "g:c", starterId: "u2" }).ok, false, "one prediction per channel");
  const { token } = started.session;
  assert.equal(predictions.vote(token, "a", "An", "win").ok, true);
  assert.equal(predictions.vote(token, "b", "Bình", "lose").ok, true);
  assert.equal(predictions.vote(token, "c", "Chi", "win").ok, true);
  const changed = predictions.vote(token, "b", "Bình", "win");
  assert.equal(changed.changed, true);
  assert.deepEqual(changed.counts, { win: 3, lose: 0, botWin: 0, botLose: 0 });
  assert.equal(predictions.vote(token, "d", "D", "maybe").ok, false);
  predictions.addBet(token, 1, "lose");
  predictions.addBet(token, 2, "win");
  assert.deepEqual(predictions.counts(token), { win: 3, lose: 0, botWin: 1, botLose: 1 });
  timers[0].fn();
  assert.deepEqual(closed, [token], "closing fires once");
  assert.equal(predictions.close(token), null, "and only once");
  assert.equal(predictions.vote(token, "e", "E", "win").reason, "closed");
  const done = predictions.resolve("g:c", "lose");
  assert.deepEqual(done.right, []);
  assert.deepEqual(done.wrong.sort(), ["An", "Bình", "Chi"]);
  assert.deepEqual(done.botRight, [1]);
  assert.deepEqual(done.botWrong, [2]);
  assert.equal(predictions.find("g:c"), null, "it is over");
  assert.equal(predictions.vote(token, "a", "An", "win").reason, "unknown");
  assert.equal(predictions.resolve("g:c", "win"), null);
  assert.equal(predictions.start({ key: "g:c", starterId: "u1" }).ok, true, "a new one can start");
  predictions.stopAll();
});

test("dudoan: the bets, the lines and the messages read well in both languages", () => {
  const bets = planBets({ slots: Array.from({ length: 30 }, (_, i) => i), rng: Math.random });
  assert.equal(bets.length, 8);
  assert.equal(new Set(bets.map((b) => b.slot)).size, 8);
  assert.ok(bets.every((b) => b.side === "win" || b.side === "lose"));
  const em = /(^|[\s,.!?])[Ee]m([\s,.!?]|$)/;
  for (const language of ["vi", "en"]) {
    for (const goi of ["anh", "chị", "bạn"]) {
      for (const kind of ["win", "lose", "right", "wrong"]) {
        for (let slot = 0; slot < 30; slot++) {
          const line = predictLine({ slot, kind, language, goi });
          assert.ok(line && !/\{|\}|undefined|@/.test(line), `${language} ${kind}: ${line}`);
          if (language === "vi" && MALE_SLOTS.has(slot)) assert.ok(!em.test(line), `a boy does not say em: ${line}`);
          if (language === "vi" && goi === "bạn") assert.ok(!em.test(line), `girls say tui to bạn: ${line}`);
        }
      }
    }
  }
  for (const bank of [PREDICT.vi.girl, PREDICT.vi.boy, PREDICT.en.girl]) for (const list of Object.values(bank)) for (const line of list) assert.ok(line.length <= 100 && !line.includes("—") && !line.includes("\n"), line);
  const counts = { win: 2, lose: 1, botWin: 3, botLose: 1 };
  assert.match(announceText({ language: "vi", ten: "Minh", minutes: 3, counts }), /Minh.*3 phút[\s\S]*✅ 5 · ❌ 2/);
  assert.match(announceText({ language: "en", ten: "", minutes: 1, counts }), /the player.*1 minute!/);
  assert.match(closedText({ language: "vi", ten: "Minh", counts }), /Hết giờ/);
  const text = resultText({ language: "vi", ten: "Minh", outcome: "win", right: ["An", "Bình"], wrong: ["Chi"] });
  assert.match(text, /Minh đã thắng/);
  assert.match(text, /Đoán đúng \(2\): An, Bình/);
  assert.match(resultText({ language: "en", ten: "Minh", outcome: "lose", right: [], wrong: ["A"] }), /Minh lost[\s\S]*Called it \(0\): -/);
});

test("notes by time of day: every part of the day has real notes, and about one note in three follows the clock", () => {
  assert.deepEqual([0, 4, 5, 10, 11, 13, 14, 17, 18, 21, 22, 23].map(periodOf), ["latenight", "latenight", "morning", "morning", "noon", "noon", "afternoon", "afternoon", "evening", "evening", "night", "night"]);
  for (const language of ["vi", "en"]) {
    const seen = new Set();
    for (const [period, list] of Object.entries(TIME_NOTES[language])) {
      assert.ok(list.length >= 12, `${language} ${period}`);
      for (const note of list) {
        assert.ok(note.length > 5 && note.length <= 80 && !note.includes("\n") && !note.includes("—") && !note.includes("@"), note);
        assert.ok(!seen.has(note.toLowerCase()), `repeated: ${note}`);
        seen.add(note.toLowerCase());
      }
    }
  }
  const saturdayNoon = Date.parse("2026-10-03T05:00:00Z"); // 12:00 in Ho Chi Minh City
  const mondayNoon = Date.parse("2026-10-05T05:00:00Z");
  assert.ok(timeNotesFor({ language: "vi", now: saturdayNoon, timeZone: "Asia/Ho_Chi_Minh" }).length > timeNotesFor({ language: "vi", now: mondayNoon, timeZone: "Asia/Ho_Chi_Minh" }).length, "the weekend adds notes");
  const late = timeNotesFor({ language: "en", now: Date.parse("2026-10-05T18:00:00Z"), timeZone: "Asia/Ho_Chi_Minh" }); // 01:00
  assert.deepEqual(late, TIME_NOTES.en.latenight);
  const lines = getTools("vi");
  const own = Array.from({ length: 25 }, (_, i) => `ghi chú riêng ${i}`);
  const timeNotes = timeNotesFor({ language: "vi", now: mondayNoon, timeZone: "Asia/Ho_Chi_Minh" });
  let fromClock = 0;
  const windows = 96; // a day of 15 minute windows
  for (let w = 0; w < windows; w++) {
    const text = presenceText(lines, { slot: 5, now: mondayNoon + w * 15 * 60_000, voice: { humans: 4 }, notes: own, offset: 7, timeNotes });
    if (timeNotes.includes(text)) fromClock++;
    else assert.ok(own.includes(text), `a bot shows its own note or a clock note, never a counter: ${text}`);
  }
  assert.ok(fromClock > windows / 5 && fromClock < windows / 2, `about a third follow the clock (${fromClock} of ${windows})`);
});

test("the group chat and prediction commands are valid, and the new server settings are off by default", () => {
  const tam = tamchuyenCommand.toJSON();
  assert.equal(tam.name, "tamchuyen");
  assert.deepEqual(tam.options.map((o) => o.name), ["chude", "language"]);
  assert.ok(tam.options[0].choices.length >= 10 && tam.options[0].choices.length <= 25);
  assert.ok(tam.options[0].choices.every((c) => GOSSIP_TAGS.includes(c.value)));
  const dd = dudoanCommand.toJSON();
  assert.deepEqual(dd.options.map((o) => o.name), ["start", "result"]);
  assert.deepEqual(dd.options[0].options.map((o) => o.name), ["minutes", "nguoi", "ten", "goi", "language"]);
  assert.deepEqual(dd.options[1].options.map((o) => [o.name, o.required]), [["outcome", true]]);
  assert.equal(DEFAULTS.gossip, false);
  assert.equal(DEFAULTS.autoHype, false);
  assert.deepEqual(DEFAULTS.gossipSeen, []);
  assert.equal(DEFAULTS.gossipToday, 0);
  assert.equal(DEFAULTS.lastGossipAt, 0);
});
