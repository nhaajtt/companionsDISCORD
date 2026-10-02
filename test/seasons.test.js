import assert from "node:assert/strict";
import test from "node:test";
import en from "../src/content/en.js";
import { PACKS, activeSeasons, withSeasons } from "../src/content/seasons.js";
import vi from "../src/content/vi.js";

test("seasons switch on and off on the right days", () => {
  assert.deepEqual(activeSeasons("2026-10-02"), []);
  assert.deepEqual(activeSeasons("2026-10-24"), ["halloween"]);
  assert.deepEqual(activeSeasons("2026-10-31"), ["halloween"]);
  assert.deepEqual(activeSeasons("2026-11-02"), []);
  assert.deepEqual(activeSeasons("2026-12-24"), ["christmas"]);
  assert.deepEqual(activeSeasons("2026-12-31"), ["newyear"]);
  assert.deepEqual(activeSeasons("2027-01-01"), ["newyear"]);
  assert.deepEqual(activeSeasons("2027-02-12"), ["valentine"]);
});

test("Tet is a week before to three days after the Lunar New Year", () => {
  assert.deepEqual(activeSeasons("2027-01-30"), ["tet"]); // 7 days before 6 Feb
  assert.deepEqual(activeSeasons("2027-01-29"), []);
  assert.deepEqual(activeSeasons("2027-02-06"), ["tet"]);
  assert.deepEqual(activeSeasons("2027-02-09"), ["tet"]);
  assert.deepEqual(activeSeasons("2027-02-10"), ["valentine"], "Tet is over, Valentine's week has started");
  assert.deepEqual(activeSeasons("2028-01-26"), ["tet"]);
});

test("every pack has the same number of entries in both languages, with unique ids and the right shape", () => {
  const ids = new Set();
  for (const [name, pack] of Object.entries(PACKS)) {
    for (const key of ["questions", "riddles", "facts", "polls"]) {
      assert.equal(pack.en[key].length, pack.vi[key].length, `${name}.${key}`);
      assert.ok(pack.en[key].length > 0, `${name}.${key} is empty`);
      for (const lang of ["en", "vi"]) {
        for (const entry of pack[lang][key]) {
          if (lang === "en") assert.ok(!ids.has(entry.id), `duplicate id ${entry.id}`);
          ids.add(entry.id);
          if (key === "questions") assert.ok(entry.text.endsWith("?") && entry.answers.length > 0, entry.id);
          if (key === "riddles") assert.ok(entry.setup && entry.punchline, entry.id);
          if (key === "facts") assert.ok(entry.text.startsWith("Fun fact:"), entry.id);
          if (key === "polls") assert.ok(entry.options.length >= 2 && entry.options.length <= 4, entry.id);
        }
      }
    }
  }
});

test("the packs of the day are mixed into the bank, and nothing changes outside a season", () => {
  assert.equal(withSeasons(en, "en", "2026-10-02"), en);
  const halloween = withSeasons(en, "en", "2026-10-28");
  assert.equal(halloween.questions.length, en.questions.length + PACKS.halloween.en.questions.length);
  assert.ok(halloween.facts.some((f) => f.id === "s-hw-f1"));
  const vietnamese = withSeasons(vi, "vi", "2026-10-28");
  assert.ok(vietnamese.riddles.some((r) => r.id === "s-hw-r1"));
  assert.equal(halloween.trivia, en.trivia, "the other parts of the bank are untouched");
});
