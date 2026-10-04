import assert from "node:assert/strict";
import test from "node:test";
import PRAISE, { TEASE } from "../src/content/praise.js";
import EXTRA from "../src/content/praise-more/index.js";
import { CLUTCH, FAIL } from "../src/content/events.js";
import { MALE_SLOTS, buildPraise } from "../src/praise.js";

const ALLOWED = new Set(["goi", "Goi", "goiLong", "em", "Em", "ten"]);
const WORDS = /(^|[^\p{L}])(anh|chị|em|bạn)([^\p{L}]|$)/iu;
const everyLine = (bank, language) => Object.entries(bank[language]).flatMap(([kind, groups]) => Object.entries(groups).flatMap(([key, lines]) => lines.map((line) => ({ kind, key, line }))));

test("praise: more than a thousand new lines were added, in the right groups", () => {
  const added = EXTRA.reduce((sum, batch) => sum + Object.values(batch).flatMap((kinds) => Object.values(kinds).flatMap((groups) => Object.values(groups).flat())).length, 0);
  assert.ok(added >= 1000, `${added} new lines`);
  const size = (language, kind, key) => PRAISE[language][kind][key].length;
  assert.ok(size("vi", "girl", "base") >= 500, "vi girl base");
  assert.ok(size("vi", "girl", "crush") >= 100, "vi girl crush");
  assert.ok(size("vi", "girl", "named") >= 50, "vi girl named");
  assert.ok(size("vi", "boy", "base") >= 120, "vi boy base");
  assert.ok(size("vi", "boy", "named") >= 20, "vi boy named");
  assert.ok(size("en", "girl", "base") >= 250, "en base");
  assert.ok(size("en", "girl", "named") >= 30, "en named");
});

test("praise: every line follows the rules (length, placeholders, who says what), in every group", () => {
  for (const language of ["vi", "en"]) {
    for (const { kind, key, line } of everyLine(PRAISE, language)) {
      const where = `${language} ${kind} ${key}: ${line}`;
      assert.ok(line.length >= 6 && line.length <= 110, `${where} (${line.length})`);
      assert.ok(!/\n|—|@/.test(line), where);
      const names = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      assert.ok(names.every((n) => ALLOWED.has(n)), `${where}: unknown placeholder`);
      assert.ok(!/[{}]/.test(line.replace(/\{\w+\}/g, "")), `${where}: stray brace`);
      assert.equal(names.includes("ten"), key === "named", `${where}: {ten} only in named lines, and in all of them`);
      if (language === "en") assert.ok(names.every((n) => n === "ten"), `${where}: English uses no address placeholder`);
      if (language === "vi") {
        assert.ok(!WORDS.test(line.replace(/\{\w+\}/g, " ").replace(/bạn bè/gi, "")), `${where}: a literal anh, chị, em or bạn`);
        if (kind === "boy") assert.ok(!names.includes("em") && !names.includes("Em"), `${where}: a boy does not say em`);
        if (key === "crush") assert.ok(!/đẹp trai|xinh/i.test(line), `${where}: guesses the gender`);
      }
    }
  }
  const memes = PRAISE.vi.girl.crush.filter((line) => /đẻ con/.test(line));
  assert.ok(memes.length >= 1 && memes.length <= 8, `the meme stays rare (${memes.length})`);
});

test("praise: no line is used twice, not even in the teasing, clutch and fail banks", () => {
  for (const language of ["vi", "en"]) {
    const seen = new Map();
    for (const [name, bank] of [["praise", PRAISE], ["tease", TEASE], ["clutch", CLUTCH], ["fail", FAIL]]) {
      for (const { kind, key, line } of everyLine(bank, language)) {
        const id = line.toLowerCase();
        assert.ok(!seen.has(id), `${language}: "${line}" is in ${seen.get(id)} and in ${name} ${kind} ${key}`);
        seen.set(id, `${name} ${kind} ${key}`);
      }
    }
  }
});

test("praise: rounds built from the big pools stay clean for every way of calling the player", () => {
  const slots = Array.from({ length: 30 }, (_, i) => i);
  const em = /(^|[\s,.!?])[Ee]m([\s,.!?]|$)/;
  const used = new Set();
  for (let n = 0; n < 150; n++) {
    for (const language of ["vi", "en"]) {
      for (const goi of ["anh", "chị", "bạn"]) {
        const ten = n % 2 ? "Minh" : "";
        const round = buildPraise({ mood: "praise", language, goi, ten, slots });
        assert.equal(round.length, 30);
        assert.equal(new Set(round.map((r) => r.text)).size, 30, "no line twice in a round");
        for (const { slot, text } of round) {
          assert.ok(!/[{}]|undefined|@/.test(text) && text.length < 200, text);
          if (language === "vi" && MALE_SLOTS.has(slot)) assert.ok(!em.test(text), `a boy does not say em: ${text}`);
          if (language === "vi" && goi === "bạn") assert.ok(!em.test(text) && !/đẻ con/.test(text), `bạn is never flirted with: ${text}`);
          if (!ten) assert.ok(!text.includes("Minh"));
          used.add(text);
        }
      }
    }
  }
  assert.ok(used.size > 1500, `the rounds really use the big pools (${used.size} different lines seen)`);
});
