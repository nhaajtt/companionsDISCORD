// Usage counters: how many conversations the bots started, and how many of them got people talking.
// Only counts per day are stored (no messages, no user ids), so the privacy promise stays intact.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const KEEP_DAYS = 120;

const bump = (obj, key, by = 1) => {
  obj[key] = (obj[key] ?? 0) + by;
};

/** The `count` calendar days ending at `day` ("2026-10-02"), newest first. Pure date arithmetic, no time zone involved. */
export function dayRange(day, count) {
  const base = Date.parse(`${day}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(base - i * 86_400_000).toISOString().slice(0, 10));
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * How much more or less often each kind of conversation should be picked in a server, from what happened there.
 * A kind that gets people talking more than the server's average is picked up to twice as often, one that gets less
 * down to half as often. Kinds with fewer than 5 tries stay at 1, and nothing changes before 20 conversations.
 */
export function adaptiveWeights(summary, { minTotal = 20, minKind = 5 } = {}) {
  if (!summary || summary.total < minTotal) return null;
  const average = summary.totalJoined / summary.total;
  const out = {};
  for (const [kind, started] of Object.entries(summary.started)) {
    if (started < minKind || average === 0) {
      out[kind] = 1;
      continue;
    }
    const rate = ((summary.joined[kind] ?? 0) + average * 3) / (started + 3); // pulled toward the average while there is little data
    out[kind] = clamp(rate / average, 0.5, 2);
  }
  return out;
}

export function createUsageStore(file) {
  let data = {};
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with empty usage counters:`, error.message);
  }

  function save() {
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (error) {
      console.error("Could not save usage counters:", error.message);
    }
  }

  return {
    /**
     * Events: { type: "start", kind } | { type: "end", kind, joined } | { type: "reply", kind } | { type: "ack" }
     *       | { type: "trivia", answered, correct }
     */
    record(guildId, day, event) {
      const days = (data[guildId] ??= {});
      const d = (days[day] ??= { started: {}, joined: {}, replies: {}, acks: 0, triviaAnswers: 0, triviaCorrect: 0 });
      const hourly = (d.byHour ??= {});
      if (event.type === "start") {
        bump(d.started, event.kind);
        if (Number.isInteger(event.hour)) bump((hourly[event.hour] ??= { started: 0, joined: 0 }), "started");
      } else if (event.type === "end" && event.joined) {
        bump(d.joined, event.kind);
        if (Number.isInteger(event.hour)) bump((hourly[event.hour] ??= { started: 0, joined: 0 }), "joined");
      }
      else if (event.type === "reply") bump(d.replies, event.kind);
      else if (event.type === "ack") d.acks++;
      else if (event.type === "trivia") {
        d.triviaAnswers += event.answered ?? 0;
        d.triviaCorrect += event.correct ?? 0;
      }

      // Forget old days so the file stays tiny
      const keep = new Set(dayRange(day, KEEP_DAYS));
      for (const old of Object.keys(days)) if (!keep.has(old) && old < day) delete days[old];
      save();
    },

    /** Forgets a server's counters. */
    forgetGuild(guildId) {
      if (!(guildId in data)) return false;
      delete data[guildId];
      save();
      return true;
    },

    /** Totals over the last `days` days up to and including `today`. */
    summary(guildId, today, days = 7) {
      const wanted = dayRange(today, days);
      const out = { days, started: {}, joined: {}, replies: {}, total: 0, totalJoined: 0, totalReplies: 0, acks: 0, triviaAnswers: 0, triviaCorrect: 0, byHour: {} };
      for (const day of wanted) {
        const d = data[guildId]?.[day];
        if (!d) continue;
        for (const [k, n] of Object.entries(d.started)) bump(out.started, k, n);
        for (const [k, n] of Object.entries(d.joined)) bump(out.joined, k, n);
        for (const [k, n] of Object.entries(d.replies)) bump(out.replies, k, n);
        for (const [hour, h] of Object.entries(d.byHour ?? {})) {
          const total = (out.byHour[hour] ??= { started: 0, joined: 0 });
          total.started += h.started;
          total.joined += h.joined;
        }
        out.acks += d.acks;
        out.triviaAnswers += d.triviaAnswers;
        out.triviaCorrect += d.triviaCorrect;
      }
      out.total = Object.values(out.started).reduce((a, b) => a + b, 0);
      out.totalJoined = Object.values(out.joined).reduce((a, b) => a + b, 0);
      out.totalReplies = Object.values(out.replies).reduce((a, b) => a + b, 0);
      return out;
    },
  };
}
