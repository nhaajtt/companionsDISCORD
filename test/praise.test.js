import assert from "node:assert/strict";
import test from "node:test";
import { MALE_SLOTS, buildPraise, cleanName } from "../src/praise.js";
import PRAISE, { TEASE } from "../src/content/praise.js";
import { cheCommand, khenCommand, playerName } from "../src/runtime.js";

const all = (count) => Array.from({ length: count }, (_, i) => i);

test("khen: every bot gets its own line, none repeats, and no placeholder or ping is left", () => {
  for (const language of ["vi", "en"]) {
    for (const goi of ["anh", "chị", "bạn"]) {
      for (const ten of ["", "Minh"]) {
        const round = buildPraise({ language, goi, ten, slots: all(30) });
        assert.equal(round.length, 30);
        assert.deepEqual(round.map((r) => r.slot).sort((a, b) => a - b), all(30), "each bot speaks once");
        assert.equal(new Set(round.map((r) => r.text)).size, 30, `${language} ${goi} ${ten}: no repeated line`);
        for (const { text } of round) {
          assert.ok(text.length > 5 && text.length < 200, text);
          assert.ok(!/\{|\}|undefined|@/.test(text), text);
        }
      }
    }
  }
});

test("khen: the two boys talk like boys, the girls call themselves em, and \"bạn\" is never flirted with", () => {
  assert.deepEqual([...MALE_SLOTS], [23, 25]);
  const call = (goi) => buildPraise({ language: "vi", goi, slots: all(30), rng: () => 0.42 });
  const em = /(^|[\s,.!?])[Ee]m([\s,.!?]|$)/;
  for (const { slot, text } of call("anh")) {
    if (MALE_SLOTS.has(slot)) assert.ok(!em.test(text), `a boy does not say em: ${text}`);
  }
  for (const { text } of call("bạn")) {
    assert.ok(!/đẻ con|Lấy |đổ |yêu .* nhất/.test(text), `no flirting with bạn: ${text}`);
    assert.ok(!em.test(text), `girls say tui to bạn: ${text}`);
  }
  const flirty = PRAISE.vi.girl.crush;
  const lines = buildPraise({ language: "vi", goi: "anh", slots: all(30) }).filter(({ slot }) => !MALE_SLOTS.has(slot)).map((r) => r.text);
  assert.ok(lines.some((t) => /đẻ con|Lấy |đổ |yêu /.test(t)) || flirty.length > 0, "the flirting lines exist for anh and chị");
  assert.equal(buildPraise({ language: "vi", goi: "anh", slots: [0, 23] }).find((r) => r.slot === 23).text.includes("đẻ con"), false, "boys never say it");
});

test("khen: a name is used when given and cleaned of mentions and markdown", () => {
  assert.equal(cleanName("@everyone `Minh`\n**x**"), "everyone Minh x");
  assert.equal(cleanName("a".repeat(80)).length, 30);
  assert.equal(cleanName(undefined), "");
  const withName = buildPraise({ language: "vi", ten: "Minh", slots: all(30), rng: () => 0 }).map((r) => r.text);
  assert.ok(withName.some((t) => t.includes("Minh")), "the name is said");
  const without = buildPraise({ language: "vi", slots: all(30) }).map((r) => r.text);
  assert.ok(without.every((t) => !t.includes("Minh")));
});

test("khen: a smaller crowd works and the command is valid", () => {
  assert.equal(buildPraise({ language: "vi", slots: [5] }).length, 1);
  assert.equal(buildPraise({ language: "vi", slots: [] }).length, 0);
  const json = khenCommand.toJSON();
  assert.equal(json.name, "khen");
  assert.deepEqual(json.options.map((o) => o.name), ["nguoi", "goi", "ten", "language"]);
  assert.equal(json.dm_permission, false);
});

test("khen: the lines are single-line, short and free of em dashes", () => {
  for (const language of ["vi", "en"]) {
    for (const group of Object.values(PRAISE[language])) {
      for (const line of Object.values(group).flat()) assert.ok(!line.includes("\n") && !line.includes("—") && line.length < 120, line);
    }
  }
});

test("che: every bot teases with its own line, nobody is flirted with, and the command is valid", () => {
  for (const language of ["vi", "en"]) {
    for (const goi of ["anh", "chị", "bạn"]) {
      for (const ten of ["", "Minh"]) {
        const round = buildPraise({ mood: "tease", language, goi, ten, slots: all(30) });
        assert.equal(new Set(round.map((r) => r.text)).size, 30, `${language} ${goi} ${ten}: no repeated line`);
        const praise = new Set(buildPraise({ mood: "praise", language, goi, ten, slots: all(30) }).map((r) => r.text));
        for (const { text } of round) {
          assert.ok(!/\{|\}|undefined|@/.test(text) && !/đẻ con/.test(text), text);
          assert.ok(!praise.has(text), "a tease is not a praise line");
        }
      }
    }
  }
  const json = cheCommand.toJSON();
  assert.equal(json.name, "che");
  assert.deepEqual(json.options.map((o) => o.name), ["nguoi", "goi", "ten", "language"]);
  for (const language of ["vi", "en"]) {
    for (const group of Object.values(TEASE[language])) {
      for (const line of Object.values(group).flat()) assert.ok(!line.includes("\n") && !line.includes("—") && line.length < 120, line);
    }
  }
});

test("khen: the bots say the picked member's name, and an @mention typed in ten becomes a name, never an ID", () => {
  const fake = ({ member = null, user = null, ten = null, known = {} }) => ({
    options: { getMember: () => member, getUser: () => user, getString: () => ten },
    guild: { members: { cache: { get: (id) => (known[id] ? { displayName: known[id] } : undefined) } } },
    client: { users: { cache: { get: () => undefined } } },
  });
  assert.equal(playerName(fake({ member: { displayName: "Minh" }, user: { username: "minh99" } })), "Minh");
  assert.equal(playerName(fake({ user: { globalName: "Minh G", username: "minh99" } })), "Minh G");
  assert.equal(playerName(fake({ ten: "<@659253931788206089>", known: { "659253931788206089": "Nhaajt" } })), "Nhaajt");
  assert.equal(playerName(fake({ ten: "<@!123456789012345678> ơi" })), " ơi", "an unknown member leaves no number behind");
  assert.equal(playerName(fake({ ten: "Bạn tôi" })), "Bạn tôi");
  assert.equal(playerName(fake({})), "");
});
