import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createCustomStore } from "../src/custom.js";
import { CompanionEngine } from "../src/engine.js";
import { createReminderStore } from "../src/reminders.js";
import { createScoreStore } from "../src/scores.js";
import { createSettingsStore } from "../src/settings.js";
import { createUsageStore } from "../src/usage.js";
import { getContent } from "../src/content/index.js";

const tmp = () => mkdtempSync(path.join(tmpdir(), "scale-"));

test("300 servers for 8 simulated hours: every server stays within its daily cap and the tick stays cheap", async () => {
  const GUILDS = 300;
  const store = createSettingsStore(path.join(tmp(), "s.json"));
  const settings = new Map();
  for (let i = 0; i < GUILDS; i++) {
    settings.set(`g${i}`, { enabled: true, channelId: `c${i}`, language: i % 2 ? "vi" : "en", preset: "lively", quietStart: 23, quietEnd: 8, trivia: true, polls: true, qotdHour: null });
  }
  const fake = { get: (id) => settings.get(id), all: () => [...settings] };
  void store;

  let time = Date.parse("2026-10-02T08:00:00Z");
  const sentBy = new Map();
  const bots = {
    available: () => [{ slot: 0 }, { slot: 1 }, { slot: 2 }],
    send: async ({ guildId }) => {
      sentBy.set(guildId, (sentBy.get(guildId) ?? 0) + 1);
      return `m${sentBy.size}-${time}`;
    },
    edit: async () => {},
  };
  const usageDir = tmp();
  const engine = new CompanionEngine({
    store: fake,
    content: (language) => getContent(language),
    bots,
    timezone: "UTC",
    now: () => time,
    usage: createUsageStore(path.join(usageDir, "u.json")),
    scores: createScoreStore(path.join(usageDir, "sc.json")),
  });

  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  let slowest = 0;
  for (let step = 0; step < 8 * 60 * 4; step++) {
    time += 15_000;
    const t0 = performance.now();
    await engine.tick();
    slowest = Math.max(slowest, performance.now() - t0);
  }
  const elapsed = performance.now() - started;
  const heapGrowthMb = (process.memoryUsage().heapUsed - heapBefore) / 1_048_576;

  assert.ok(sentBy.size > GUILDS * 0.9, `most servers got a conversation (${sentBy.size})`);
  for (const [guildId, count] of sentBy) {
    // each conversation is a few messages; the daily cap counts conversations, so allow its generous multiple
    assert.ok(count <= 14 * 8, `${guildId} stayed within a sane number of messages (${count})`);
  }
  assert.ok(slowest < 250, `one tick over ${GUILDS} servers took ${slowest.toFixed(1)} ms`);
  assert.ok(heapGrowthMb < 150, `memory grew by ${heapGrowthMb.toFixed(0)} MB`);
  console.log(`# ${GUILDS} servers, 8 simulated hours: ${(elapsed / 1000).toFixed(1)} s in total, slowest tick ${slowest.toFixed(1)} ms, heap +${heapGrowthMb.toFixed(0)} MB`);
});

test("forgetting a server erases it from every store and leaves the others alone", () => {
  const dir = tmp();
  const settings = createSettingsStore(path.join(dir, "s.json"));
  const usage = createUsageStore(path.join(dir, "u.json"));
  const scores = createScoreStore(path.join(dir, "sc.json"));
  const custom = createCustomStore(path.join(dir, "c.json"));
  const reminders = createReminderStore(path.join(dir, "r.json"));
  for (const g of ["a", "b"]) {
    settings.update(g, { enabled: true, channelId: "c" });
    usage.record(g, "2026-10-02", { type: "start", kind: "question" });
    scores.add(g, "u", "2026-10-02", 2);
    custom.add(g, "fact", { text: "A fact that is long enough" });
    reminders.add({ kind: "event", guildId: g, channelId: "c", userId: "m", inMs: 3_600_000, text: "Party", now: 0 });
  }
  assert.equal(settings.remove("a"), true);
  assert.equal(usage.forgetGuild("a"), true);
  assert.equal(scores.forgetGuild("a"), true);
  assert.equal(custom.forgetGuild("a"), true);
  assert.equal(reminders.forgetGuild("a"), 1);

  assert.equal(settings.saved("a"), null);
  assert.equal(usage.summary("a", "2026-10-02", 7).total, 0);
  assert.deepEqual(scores.top("a"), []);
  assert.equal(custom.count("a"), 0);
  assert.equal(reminders.list("a", "m", "event").length, 0);

  assert.equal(settings.saved("b").channelId, "c");
  assert.equal(usage.summary("b", "2026-10-02", 7).total, 1);
  assert.equal(scores.top("b")[0].points, 2);
  assert.equal(custom.count("b"), 1);
  assert.equal(reminders.list("b", "m", "event").length, 1);
  assert.equal(settings.remove("never-seen"), false);

  assert.deepEqual(Object.keys(custom.exportGuild("b")).length > 0, true, "the export has what the server added");
  assert.deepEqual(custom.exportGuild("a"), {});
});
