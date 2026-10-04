import assert from "node:assert/strict";
import test from "node:test";
import { getContent } from "../src/content/index.js";
import { moodBoard } from "../src/mood.js";
import { displayName, localizeNames, setNameResolver } from "../src/names.js";
import { pickGossip } from "../src/gossip.js";

const names = getContent("en").personas.map((p) => p.name);
const slotOf = (name) => names.indexOf(name);
const live = (map) => setNameResolver((slot) => map[names[slot]] ?? null);
test.afterEach(() => setNameResolver(null));

test("names: a bot is called by its current Discord name, and by its working name until that is known", () => {
  assert.equal(displayName(0, "en"), "Pip");
  assert.equal(displayName(22, "vi"), "Chamy");
  live({ Pip: "Linh", Chamy: "Như" });
  assert.equal(displayName(0, "vi"), "Linh");
  assert.equal(displayName(22, "en"), "Như");
  assert.equal(displayName(1, "en"), "Grumble", "a bot that was not renamed keeps its name");
  setNameResolver(() => "   ");
  assert.equal(displayName(0, "en"), "Pip", "an empty name is ignored");
});

test("names: a line that names a bot shows the new name, whole words only, and nothing changes when nobody was renamed", () => {
  const line = "Chamy said furyZ should stop. Pip agreed, Six did not, and Mapleton stayed quiet. Nova?";
  assert.equal(localizeNames(line), line, "no rename, no change");
  live({ Pip: "Linh", Chamy: "Như", furyZ: "Phương", Nova: "Nhi", Maple: "Elephant" });
  assert.equal(localizeNames(line), "Như said Phương should stop. Linh agreed, Six did not, and Mapleton stayed quiet. Nhi?");
  assert.equal(localizeNames("Pippin, pip and PIP are not Pip"), "Pippin, pip and PIP are not Linh", "only the exact capitalised name as a whole word");
  assert.equal(localizeNames("Chamy, Chamy!"), "Như, Như!");
  assert.equal(localizeNames("Dog and Cow stay Dog and Cow"), "Dog and Cow stay Dog and Cow", "ordinary words are never touched");
  live({ Chamy: "Như" });
  assert.equal(localizeNames("Chamy"), "Như");
  live({ "Trường Giang": "Giang", "Nhã Phương": "Phương Nhã" });
  assert.equal(localizeNames("Nhã Phương cười, Trường Giang khóc"), "Phương Nhã cười, Giang khóc");
  assert.equal(localizeNames(undefined), "");
  assert.equal(localizeNames("$& and $1 stay"), "$& and $1 stay");
  live({ Pip: "$1&$&" });
  assert.equal(localizeNames("Pip"), "$1&$&", "a name with special characters is inserted as it is");
});

test("names: the gossip scenes and the mood board use the new names", () => {
  live({ furyZ: "Phương", Chamy: "Như", Pip: "Linh" });
  const all = new Set(Array.from({ length: 30 }, (_, i) => i));
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const picked = pickGossip({ language: "vi", available: all, ownerName: "Minh" });
    for (const line of picked.script) {
      const mentioned = localizeNames(line.text);
      assert.ok(!/(^|[^\p{L}])(Chamy|furyZ)([^\p{L}]|$)/u.test(mentioned), `an old name is left: ${mentioned}`);
      if (/Như|Phương|Linh/.test(mentioned)) seen.add(mentioned);
    }
  }
  assert.ok(seen.size > 0, "the new names appear in the scenes");
  const board = moodBoard({ language: "vi", day: "2026-10-05", slots: [slotOf("Pip"), slotOf("Chamy"), slotOf("Grumble")] });
  const shown = board.flatMap((g) => g.names).sort();
  assert.deepEqual(shown, ["Grumble", "Linh", "Như"].sort());
});

test("names: the names that appear inside lines are the ones the program swaps (so a renamed bot is not called by its old name)", () => {
  for (const name of ["Trường Giang", "Nhã Phương", "Lai Bâng", "furyZ", "Chamy", "Pip", "Six"]) assert.ok(names.includes(name), name);
  live(Object.fromEntries(names.map((n, i) => [n, `Bạn ${i}`])));
  for (const name of ["Chamy", "furyZ", "Lai Bâng", "Six", "Nhã Phương", "Trường Giang"]) {
    assert.equal(localizeNames(`${name} nè`), `${displayName(slotOf(name))} nè`, name);
  }
});
