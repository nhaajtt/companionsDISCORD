// Reminders and event countdowns. Each entry lives only until it has been delivered (or cancelled).
// This file holds the text people typed and their user id, so it is documented in the README "What is stored" table.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cleanText } from "./custom.js";

const MIN = 60_000;
export const MAX_PER_USER = 20;
export const MAX_AHEAD_MS = 365 * 24 * 60 * MIN;
export const MIN_AHEAD_MS = MIN;

const UNITS = { w: 7 * 24 * 60 * MIN, d: 24 * 60 * MIN, h: 60 * MIN, m: MIN };

/** "90m", "2h", "1d12h", "1w" -> milliseconds, or null when it is not a duration. */
export function parseDuration(text) {
  const match = /^\s*((?:\d+\s*[wdhm]\s*)+)$/i.exec(String(text ?? ""));
  if (!match) return null;
  let total = 0;
  for (const [, n, unit] of match[1].matchAll(/(\d+)\s*([wdhm])/gi)) total += Number(n) * UNITS[unit.toLowerCase()];
  return total > 0 ? total : null;
}

export class ReminderError extends Error {}

/** `file` holds { nextId, items: [{ id, kind, guildId, channelId, userId, at, text, notified }] }. */
export function createReminderStore(file) {
  let data = { nextId: 1, items: [] };
  try {
    data = { ...data, ...JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with no reminders:`, error.message);
  }

  function save() {
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (error) {
      console.error("Could not save reminders:", error.message);
    }
  }

  return {
    /** kind is "remind" (pings its author) or "event" (a countdown for everyone). */
    add({ kind, guildId, channelId, userId, inMs, text, now }) {
      if (!(inMs >= MIN_AHEAD_MS)) throw new ReminderError("That is too soon. The shortest is 1 minute (for example 10m, 2h or 1d).");
      if (inMs > MAX_AHEAD_MS) throw new ReminderError("That is too far away. The longest is a year.");
      const clean = cleanText(text, 200);
      if (!clean) throw new ReminderError("Write something to be reminded about.");
      if (data.items.filter((i) => i.userId === userId && i.guildId === guildId).length >= MAX_PER_USER) {
        throw new ReminderError(`You already have ${MAX_PER_USER} waiting. Cancel one first.`);
      }
      const item = { id: data.nextId++, kind, guildId, channelId, userId, at: now + inMs, text: clean, notified: kind === "event" ? [...(inMs <= 24 * 60 * MIN ? ["day"] : []), ...(inMs <= 60 * MIN ? ["hour"] : [])] : [] };
      data.items.push(item);
      save();
      return item;
    },

    list: (guildId, userId, kind) => data.items.filter((i) => i.guildId === guildId && i.kind === kind && (kind === "event" || i.userId === userId)).sort((a, b) => a.at - b.at),

    /** Cancels by id. A reminder only by its author; an event by its author (managers use the same rule here). */
    cancel(guildId, userId, id) {
      const index = data.items.findIndex((i) => i.id === id && i.guildId === guildId && i.userId === userId);
      if (index < 0) return false;
      data.items.splice(index, 1);
      save();
      return true;
    },

    /** Everything that should be said now: reminders that are due, and event heads-ups (1 day, 1 hour, now). Updates the state. */
    due(now) {
      const out = [];
      for (const item of [...data.items]) {
        if (item.kind === "remind") {
          if (now >= item.at) out.push({ item, stage: "due" });
          continue;
        }
        // the closest heads-up that applies now; any longer one is marked as handled so it is not sent late
        for (const [stage, before, longer] of [["hour", 60 * MIN, ["day"]], ["day", 24 * 60 * MIN, []]]) {
          if (now >= item.at - before && now < item.at && !item.notified.includes(stage)) {
            item.notified.push(stage, ...longer);
            out.push({ item, stage });
            break;
          }
        }
        if (now >= item.at) out.push({ item, stage: "due" });
      }
      return out;
    },

    /** Removes an item once its final message was handled. */
    done(id) {
      const index = data.items.findIndex((i) => i.id === id);
      if (index >= 0) data.items.splice(index, 1);
      save();
    },

    /** Persist the notified flags after due(). */
    flush: save,

    /** Forgets every reminder and event of a server. */
    forgetGuild(guildId) {
      const before = data.items.length;
      data.items = data.items.filter((i) => i.guildId !== guildId);
      if (data.items.length !== before) save();
      return before - data.items.length;
    },

    /** Removes everything a user has, in every server. Returns how many entries were removed. */
    forget(userId) {
      const before = data.items.length;
      data.items = data.items.filter((i) => i.userId !== userId);
      if (data.items.length !== before) save();
      return before - data.items.length;
    },
  };
}
