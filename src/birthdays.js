// Birthdays: a member sets their own day and month with /sinhnhat set (never a year), and on that day a few bots sing in the chat channel.
// This file keeps the dates (a Discord user ID, a display name, the day and the month) and builds the choir. A member can erase their date
// with /sinhnhat remove, and everything of a server is erased with the rest of its data.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import BIRTHDAY from "./content/birthday.js";
import { MALE_SLOTS, cleanName } from "./praise.js";

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // February counts 29 so that 29 February can be set
const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const parseDay = (day) => day.split("-").map(Number); // "2026-10-05" -> [2026, 10, 5]

export function validDate(d, m) {
  return Number.isInteger(d) && Number.isInteger(m) && m >= 1 && m <= 12 && d >= 1 && d <= DAYS_IN_MONTH[m - 1];
}

/** The day and month a birthday is celebrated in a year: 29 February moves to 28 February in a year that has no 29th. */
function celebratedOn(entry, year) {
  return entry.m === 2 && entry.d === 29 && !isLeap(year) ? { d: 28, m: 2 } : { d: entry.d, m: entry.m };
}

/** Days from `day` until the next celebration (0 when it is today). */
export function daysUntil(entry, day) {
  const [year, month, date] = parseDay(day);
  const today = Date.UTC(year, month - 1, date);
  for (const y of [year, year + 1]) {
    const { d, m } = celebratedOn(entry, y);
    const then = Date.UTC(y, m - 1, d);
    if (then >= today) return Math.round((then - today) / 86_400_000);
  }
  return 366;
}

/** A store kept in `file` (or only in memory when no file is given): { guildId: { userId: { d, m, name, last } } }. */
export function createBirthdayStore(file = null) {
  let data = {};
  if (file) {
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with no birthdays:`, error.message);
    }
  }
  const save = () => {
    if (!file) return;
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (error) {
      console.error("Could not save the birthdays:", error.message);
    }
  };

  return {
    /** Sets (or changes) a member's birthday: { ok: true } or { ok: false, reason: "date" }. */
    set(guildId, userId, d, m, name = "") {
      if (!validDate(d, m)) return { ok: false, reason: "date" };
      const previous = data[guildId]?.[userId];
      (data[guildId] ??= {})[userId] = { d, m, name: cleanName(name) || previous?.name || "?", last: previous && previous.d === d && previous.m === m ? previous.last : 0 };
      save();
      return { ok: true };
    },
    get: (guildId, userId) => data[guildId]?.[userId] ?? null,
    remove(guildId, userId) {
      if (!data[guildId]?.[userId]) return false;
      delete data[guildId][userId];
      save();
      return true;
    },
    /** Whose birthday it is on `day` and was not celebrated yet this year: [{ userId, name, d, m }]. */
    due(guildId, day) {
      const [year, month, date] = parseDay(day);
      return Object.entries(data[guildId] ?? {})
        .filter(([, entry]) => {
          const on = celebratedOn(entry, year);
          return on.d === date && on.m === month && entry.last !== year;
        })
        .map(([userId, entry]) => ({ userId, name: entry.name, d: entry.d, m: entry.m }));
    },
    markDone(guildId, userId, day) {
      const entry = data[guildId]?.[userId];
      if (!entry) return;
      entry.last = parseDay(day)[0];
      save();
    },
    /** The next birthdays from `day` on, nearest first: [{ name, d, m, inDays }]. Names only. */
    upcoming(guildId, day, limit = 8) {
      return Object.values(data[guildId] ?? {})
        .map((entry) => ({ name: entry.name, d: entry.d, m: entry.m, inDays: daysUntil(entry, day) }))
        .sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name))
        .slice(0, limit);
    },
    count: (guildId) => Object.keys(data[guildId] ?? {}).length,
    forgetGuild(guildId) {
      const had = guildId in data;
      delete data[guildId];
      if (had) save();
      return had;
    },
  };
}

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The birthday choir as a script: [{ slot, text, pingUsers? }]. Six to eight bots, one wish each, no wish twice; only the first message
 * pings the birthday person, the others show the mention without a notification. Null when fewer than three bots can write.
 */
export function buildBirthday({ language = "vi", userId, slots, rng = Math.random, max = 8 }) {
  if (slots.length < 3) return null;
  const bank = BIRTHDAY[language] ?? BIRTHDAY.vi;
  const girls = shuffled(bank.girl, rng);
  const boys = shuffled(bank.boy, rng);
  const crowd = shuffled(slots, rng).slice(0, Math.min(max, 6 + Math.floor(rng() * 3)));
  const mention = `<@${userId}>`;
  return crowd.map((slot, i) => {
    const pool = language === "vi" && MALE_SLOTS.has(slot) && boys.length ? boys : girls;
    const text = pool.shift().replaceAll("{user}", mention);
    return i === 0 ? { slot, text, pingUsers: [userId] } : { slot, text };
  });
}
