import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildBirthday, createBirthdayStore, daysUntil, validDate } from "../src/birthdays.js";
import BIRTHDAY from "../src/content/birthday.js";
import GREET from "../src/content/greetings.js";
import MOOD_NOTES from "../src/content/moodnotes.js";
import WAVE from "../src/content/wave.js";
import { getTools } from "../src/content/tools.js";
import { buildGreeting, greetingDue, greetingWindow, localMinuteOfDay } from "../src/greetings.js";
import { MOODS, moodBoard, moodNotesFor, moodOf } from "../src/mood.js";
import { MALE_SLOTS } from "../src/praise.js";
import { DEFAULTS } from "../src/settings.js";
import { WAVE_EMOJI, buildWave, waveSizes } from "../src/wave.js";
import { presenceText } from "../src/voicetools.js";
import { lamsongCommand, sinhnhatCommand, tamtrangCommand } from "../src/runtime.js";

const slots = (n = 30) => Array.from({ length: n }, (_, i) => i);
const em = /(^|[\s,.!?])[Ee]m([\s,.!?]|$)/;
const plain = (line, max) => line.length >= 4 && line.length <= max && !/\n|—|@/.test(line);

test("mood: the same all day and after a restart, different from day to day, and Grumble leans grumpy", () => {
  for (let slot = 0; slot < 30; slot++) {
    assert.ok(MOODS.includes(moodOf({ slot, day: "2026-10-05" })));
    assert.equal(moodOf({ slot, day: "2026-10-05" }), moodOf({ slot, day: "2026-10-05" }));
  }
  const days = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
  const grumbleGrumpy = days.filter((day) => moodOf({ slot: 1, day }) === "grumpy").length;
  const pipGrumpy = days.filter((day) => moodOf({ slot: 0, day }) === "grumpy").length;
  assert.ok(grumbleGrumpy / 365 > 0.35, `Grumble is grumpy ${grumbleGrumpy} days of 365`);
  assert.ok(pipGrumpy < grumbleGrumpy / 2, "Pip is rarely grumpy");
  assert.ok(new Set(days.map((day) => moodOf({ slot: 12, day }))).size >= 4, "a bot goes through several moods over the year");
  const board = moodBoard({ language: "en", day: "2026-10-05", slots: slots() });
  assert.equal(board.flatMap((g) => g.names).length, 30, "everyone is on the board once");
  assert.ok(board.every((g) => MOODS.includes(g.mood) && g.names.length));
});

test("mood notes: every mood has plenty of real, short, neutral notes in both languages", () => {
  const seen = new Set();
  for (const language of ["vi", "en"]) {
    assert.deepEqual(Object.keys(MOOD_NOTES[language]).sort(), [...MOODS].sort());
    for (const mood of MOODS) {
      const list = moodNotesFor(language, mood);
      assert.ok(list.length >= 14, `${language} ${mood}`);
      for (const note of list) {
        assert.ok(note.length > 5 && note.length <= 80 && !/\n|—|@|[{}]/.test(note), note);
        assert.ok(!seen.has(note.toLowerCase()), `repeated: ${note}`);
        seen.add(note.toLowerCase());
        if (language === "vi") assert.ok(!/(^|[^\p{L}])(anh|chị|em|ông|bà)([^\p{L}]|$)/iu.test(note), `gendered: ${note}`);
      }
    }
  }
});

test("status notes: a quarter of a day's notes show the mood, a third the clock, the rest the bot's own", () => {
  const lines = getTools("vi");
  const own = Array.from({ length: 25 }, (_, i) => `ghi chú riêng ${i}`);
  const timeNotes = Array.from({ length: 16 }, (_, i) => `giờ ${i}`);
  const moodNotes = Array.from({ length: 16 }, (_, i) => `tâm trạng ${i}`);
  const counts = { own: 0, time: 0, mood: 0 };
  const windows = 600;
  for (let w = 0; w < windows; w++) {
    const text = presenceText(lines, { slot: 3, now: Date.parse("2026-10-05T00:00:00Z") + w * 15 * 60_000, voice: { humans: 2 }, notes: own, offset: 11, timeNotes, moodNotes });
    if (timeNotes.includes(text)) counts.time++;
    else if (moodNotes.includes(text)) counts.mood++;
    else {
      assert.ok(own.includes(text), text);
      counts.own++;
    }
  }
  assert.ok(Math.abs(counts.time / windows - 1 / 3) < 0.04, `clock ${counts.time}`);
  assert.ok(Math.abs(counts.mood / windows - 1 / 6) < 0.04, `mood ${counts.mood}`);
  assert.ok(counts.own / windows > 0.45, `own ${counts.own}`);
});

test("good morning and good night: the window follows the quiet hours, the moment is fixed per day, and the chain reads right", () => {
  assert.deepEqual(greetingWindow("morning", { quietStart: 23, quietEnd: 8 }), { start: 480, end: 600 });
  assert.deepEqual(greetingWindow("night", { quietStart: 23, quietEnd: 8 }), { start: 22 * 60, end: 23 * 60 });
  assert.deepEqual(greetingWindow("morning", { quietStart: 1, quietEnd: 6 }), { start: 360, end: 480 });
  assert.deepEqual(greetingWindow("night", { quietStart: 2, quietEnd: 9 }), { start: 22 * 60, end: 23 * 60 }, "an odd quiet start falls back to the hour before 23:00");
  for (const kind of ["morning", "night"]) {
    const settings = { quietStart: 23, quietEnd: 8 };
    const { start, end } = greetingWindow(kind, settings);
    const due = Array.from({ length: 1440 }, (_, minute) => greetingDue({ kind, guildId: "g1", day: "2026-10-05", minuteOfDay: minute, settings }));
    const first = due.indexOf(true);
    assert.ok(first >= start && first < end - 4, `${kind}: starts inside the window (${first})`);
    assert.ok(due.slice(0, first).every((x) => !x), "not before");
    assert.ok(due.slice(first, end).every(Boolean), "from the moment on, until the window ends");
    assert.ok(due.slice(end).every((x) => !x), "never after the window");
    assert.equal(greetingDue({ kind, guildId: "g1", day: "2026-10-05", minuteOfDay: first, settings }), true, "the same every time it is asked");
  }
  const firsts = new Set(Array.from({ length: 40 }, (_, d) => {
    const day = `2026-11-${String(d + 1).padStart(2, "0")}`;
    return Array.from({ length: 1440 }, (_, m) => greetingDue({ kind: "morning", guildId: "g1", day, minuteOfDay: m, settings: {} })).indexOf(true);
  }));
  assert.ok(firsts.size > 10, "the moment changes from day to day");
  assert.equal(localMinuteOfDay(Date.parse("2026-10-05T05:30:00Z"), "Asia/Ho_Chi_Minh"), 12 * 60 + 30);

  for (const language of ["vi", "en"]) {
    for (const kind of ["morning", "night"]) {
      for (let i = 0; i < 80; i++) {
        const script = buildGreeting({ kind, language, slots: slots(), day: "2026-10-05" });
        assert.ok(script.length >= 2 && script.length <= 3);
        assert.equal(new Set(script.map((l) => l.slot)).size, script.length, "different bots");
        assert.equal(new Set(script.map((l) => l.text)).size, script.length);
        script.forEach((line, n) => {
          if (line.re !== undefined) assert.ok(line.re < n, "replies point back");
          assert.ok(!/[{}]/.test(line.text) && plain(line.text, 130), line.text);
        });
        assert.equal(script[0].re, undefined);
        assert.ok(script.slice(1).every((l) => l.re !== undefined), "the others answer");
        const mood = moodOf({ slot: script[0].slot, day: "2026-10-05" });
        assert.ok(GREET[language][kind][mood].includes(script[0].text), "the first greeting matches the bot's mood");
        assert.ok(script.slice(1).every((l) => GREET[language][`${kind}Reply`].includes(l.text)));
      }
    }
  }
  assert.equal(buildGreeting({ kind: "morning", language: "vi", slots: [4], day: "2026-10-05" }), null);
  for (const language of ["vi", "en"]) {
    for (const kind of ["morning", "night"]) for (const mood of MOODS) assert.ok(GREET[language][kind][mood].length >= 8, `${language} ${kind} ${mood}`);
    for (const key of ["morningReply", "nightReply"]) assert.ok(GREET[language][key].length >= 18);
    const all = [...Object.values(GREET[language].morning), ...Object.values(GREET[language].night), GREET[language].morningReply, GREET[language].nightReply].flat();
    assert.equal(new Set(all.map((l) => l.toLowerCase())).size, all.length, `${language}: no line twice`);
    for (const line of all) assert.ok(plain(line, 130) && !/[{}]/.test(line), line);
  }
});

test("wave: it grows to the middle and shrinks again, the chant is in the middle, and only the offered emoji are used", () => {
  assert.deepEqual(waveSizes(9), [1, 2, 3, 4, 5, 4, 3, 2, 1]);
  assert.deepEqual(waveSizes(4), [1, 2, 2, 1]);
  assert.deepEqual(waveSizes(3), [1, 2, 1]);
  const script = buildWave({ language: "vi", emoji: "🎉", ten: "Minh", slots: slots(), rng: () => 0.4 });
  assert.equal(script.length, 9);
  assert.equal(new Set(script.map((l) => l.slot)).size, 9);
  assert.ok(script[4].text.startsWith("🎉🎉🎉🎉🎉 ") && script[4].text.includes("Minh"), script[4].text);
  assert.equal(script[0].text, "🎉");
  assert.equal(script[8].text, "🎉");
  assert.ok(buildWave({ language: "en", emoji: "💩", slots: slots() })[0].text.startsWith(WAVE_EMOJI[0]), "an unknown emoji becomes the default");
  assert.equal(buildWave({ language: "vi", slots: [1, 2] }), null, "a wave needs a crowd");
  assert.equal(buildWave({ language: "vi", slots: [1, 2, 3] }).length, 3);
  assert.ok(!buildWave({ language: "vi", ten: "@everyone `x`", slots: slots() }).some((l) => l.text.includes("@") || l.text.includes("`")));
  for (const language of ["vi", "en"]) {
    assert.ok(WAVE[language].peak.length >= 14 && WAVE[language].named.length >= 10);
    for (const line of WAVE[language].peak) assert.ok(plain(line, 60) && !/[{}]/.test(line), line);
    for (const line of WAVE[language].named) assert.ok(plain(line, 70) && (line.match(/\{ten\}/g) ?? []).length === 1 && !/[{}]/.test(line.replace("{ten}", "")), line);
    const everyLine = [...WAVE[language].peak, ...WAVE[language].named];
    assert.equal(new Set(everyLine.map((l) => l.toLowerCase())).size, everyLine.length, "no chant twice");
  }
});

test("birthdays: dates are checked, 29 February is handled, only the day and month are kept, and the store is saved and erased", () => {
  assert.equal(validDate(31, 1), true);
  assert.equal(validDate(31, 4), false);
  assert.equal(validDate(29, 2), true);
  assert.equal(validDate(30, 2), false);
  assert.equal(validDate(1, 13), false);
  assert.equal(validDate(1.5, 2), false);
  assert.equal(daysUntil({ d: 5, m: 10 }, "2026-10-05"), 0);
  assert.equal(daysUntil({ d: 6, m: 10 }, "2026-10-05"), 1);
  assert.equal(daysUntil({ d: 4, m: 10 }, "2026-10-05"), 364);
  assert.equal(daysUntil({ d: 29, m: 2 }, "2027-02-27"), 1, "in a year without 29 February it moves to the 28th");
  assert.equal(daysUntil({ d: 29, m: 2 }, "2028-02-28"), 1, "in a leap year it stays on the 29th");

  const file = path.join(mkdtempSync(path.join(tmpdir(), "birthdays-")), "birthdays.json");
  const store = createBirthdayStore(file);
  assert.deepEqual(store.set("g", "u1", 5, 10, "Minh"), { ok: true });
  assert.deepEqual(store.set("g", "u2", 29, 2, "Lan"), { ok: true });
  store.set("g", "u3", 5, 11, "An");
  assert.deepEqual(store.set("g", "u4", 31, 4, "X"), { ok: false, reason: "date" });
  assert.deepEqual(store.due("g", "2026-10-05").map((p) => p.name), ["Minh"]);
  assert.deepEqual(store.due("g", "2027-02-28").map((p) => p.name), ["Lan"], "29 February is celebrated on the 28th");
  assert.deepEqual(store.due("g", "2028-02-29").map((p) => p.name), ["Lan"]);
  assert.deepEqual(store.due("g", "2026-10-06"), []);
  store.markDone("g", "u1", "2026-10-05");
  assert.deepEqual(store.due("g", "2026-10-05"), [], "not celebrated twice in a year");
  assert.deepEqual(store.due("g", "2027-10-05").map((p) => p.name), ["Minh"], "but again the next year");
  assert.deepEqual(store.upcoming("g", "2026-10-05").map((b) => [b.name, b.inDays]), [["Minh", 0], ["An", 31], ["Lan", 146]]);
  assert.deepEqual(store.upcoming("g", "2026-10-05", 1).length, 1);
  store.set("g", "u1", 5, 10, "Minh nè");
  assert.deepEqual(store.due("g", "2026-10-05"), [], "changing the name keeps the celebration done");
  store.set("g", "u1", 6, 10, "Minh");
  assert.deepEqual(store.due("g", "2026-10-06").map((p) => p.name), ["Minh"], "a new date is celebrated");
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify({ x: store.get("g", "u1") }))).includes("year"), false, "no year is stored");
  assert.deepEqual(createBirthdayStore(file).get("g", "u3"), { d: 5, m: 11, name: "An", last: 0 }, "it is saved");
  assert.equal(store.remove("g", "u3"), true);
  assert.equal(store.remove("g", "u3"), false);
  assert.equal(store.count("g"), 2);
  assert.equal(store.forgetGuild("g"), true);
  assert.equal(store.forgetGuild("g"), false);
  assert.deepEqual(store.due("g", "2026-10-06"), []);
  assert.equal(createBirthdayStore().set("g", "u", 1, 1, "x").ok, true, "works without a file");
});

test("birthday choir: six to eight bots, one wish each, only the first message pings, boys speak as boys", () => {
  for (const language of ["vi", "en"]) {
    for (let i = 0; i < 100; i++) {
      const script = buildBirthday({ language, userId: "123456789012345678", slots: slots() });
      assert.ok(script.length >= 6 && script.length <= 8, `${script.length} bots`);
      assert.equal(new Set(script.map((l) => l.slot)).size, script.length);
      assert.equal(new Set(script.map((l) => l.text)).size, script.length, "no wish twice");
      script.forEach((line, n) => {
        assert.ok(line.text.includes("<@123456789012345678>") && !/[{}]|undefined|@everyone/.test(line.text.replace("<@123456789012345678>", "")), line.text);
        assert.deepEqual(line.pingUsers, n === 0 ? ["123456789012345678"] : undefined);
        if (language === "vi" && MALE_SLOTS.has(line.slot)) assert.ok(!em.test(line.text), `a boy does not say em: ${line.text}`);
      });
    }
  }
  assert.equal(buildBirthday({ language: "vi", userId: "1", slots: [1, 2] }), null);
  const boys = buildBirthday({ language: "vi", userId: "1", slots: [23, 25, 1, 2, 3, 4, 5, 6] });
  assert.ok(boys.filter((l) => MALE_SLOTS.has(l.slot)).every((l) => BIRTHDAY.vi.boy.some((b) => b.replace("{user}", "<@1>") === l.text)));
  const seen = new Set();
  for (const language of ["vi", "en"]) {
    for (const line of [...BIRTHDAY[language].girl, ...BIRTHDAY[language].boy]) {
      assert.equal((line.match(/\{user\}/g) ?? []).length, 1, line);
      assert.ok(line.length >= 20 && line.length <= 150 && !/\n|—|@/.test(line) && !/[{}]/.test(line.replace("{user}", "")), line);
      assert.ok(!seen.has(line.toLowerCase()), `repeated: ${line}`);
      seen.add(line.toLowerCase());
    }
    if (language === "vi") for (const line of BIRTHDAY.vi.boy) assert.ok(!em.test(line.replace("{user}", "")), line);
  }
  assert.ok(BIRTHDAY.vi.girl.length >= 40 && BIRTHDAY.vi.boy.length >= 10 && BIRTHDAY.en.girl.length >= 35);
});

test("the new commands are valid and the new server settings are off by default", () => {
  const wave = lamsongCommand.toJSON();
  assert.equal(wave.name, "lamsong");
  assert.deepEqual(wave.options.map((o) => o.name), ["emoji", "nguoi", "ten", "language"]);
  assert.deepEqual(wave.options[0].choices.map((c) => c.value), WAVE_EMOJI);
  const birthday = sinhnhatCommand.toJSON();
  assert.deepEqual(birthday.options.map((o) => o.name), ["set", "remove", "list"]);
  assert.deepEqual(birthday.options[0].options.map((o) => [o.name, o.required]), [["ngay", true], ["thang", true]]);
  assert.equal(tamtrangCommand.toJSON().name, "tamtrang");
  for (const key of ["greetings", "reactions", "birthdays"]) assert.equal(DEFAULTS[key], false, key);
  assert.equal(DEFAULTS.greetMorningDay, "");
  assert.equal(DEFAULTS.greetNightDay, "");
});
