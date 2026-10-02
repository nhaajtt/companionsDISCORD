// Per-server settings of the companion bots, plus the small time helpers they need.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/** How often the bots start a conversation, and how many per day at most. */
export const PRESETS = {
  calm: { label: "Calm", minGapMin: 180, maxGapMin: 360, dailyCap: 4 },
  normal: { label: "Normal", minGapMin: 90, maxGapMin: 240, dailyCap: 8 },
  lively: { label: "Lively", minGapMin: 30, maxGapMin: 90, dailyCap: 14 },
};

export const DEFAULTS = {
  enabled: false,
  channelId: null,
  language: "en",
  preset: "normal",
  quietStart: 23, // the bots stay silent from this hour...
  quietEnd: 8, // ...until this hour, in the server's time zone
  trivia: true, // multiple-choice trivia with answer buttons
  polls: true, // "this or that" polls
  qotdHour: null, // post a question of the day at this hour (0-23), or null for never
  voiceRooms: [], // the voice rooms the companions sit in 24/7, in order: [{ channelId, bots }]; bots are handed out room by room
  voiceChannelId: null, // older single-room setting, still understood
  voiceBots: 1,
  voiceGreet: false, // say hi in the chat channel when someone joins that room
  adaptive: true, // pick the kinds of conversation that get people talking in this server a bit more often
  titles: false, // announce a "voice regular" when someone spends 5 hours in the voice room in a week
  recap: false, // post a short recap of the week every Monday morning
  lastRecap: "", // the Monday of the last recap that was posted
  welcome: false, // greet new members (needs the server's join messages) with an icebreaker
};

export const LANGUAGES = ["en", "vi"];

/** Is `hour` (0-23) inside the quiet window? The window may wrap around midnight (23 to 8). */
export function isQuietHour(hour, start, end) {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

const formatters = new Map();
function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }));
  }
  return formatters.get(timeZone);
}

/** Local hour (0-23) and calendar day ("2026-10-02") of a timestamp in a time zone. */
export function localParts(ms, timeZone) {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(ms).map((p) => [p.type, p.value]));
  return { hour: Number(parts.hour) % 24, day: `${parts.year}-${parts.month}-${parts.day}` };
}

export function validTimeZone(timeZone) {
  try {
    formatter(timeZone).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Settings kept in one small JSON file: { "<guildId>": { enabled, channelId, ... } }. */
export function createSettingsStore(file) {
  let data = {};
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with no companion settings:`, error.message);
  }

  return {
    get: (guildId) => ({ ...DEFAULTS, ...data[guildId] }),
    all: () => Object.keys(data).map((guildId) => [guildId, { ...DEFAULTS, ...data[guildId] }]),
    update(guildId, patch) {
      data[guildId] = { ...data[guildId], ...patch };
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data, null, 2));
      renameSync(tmp, file);
      return { ...DEFAULTS, ...data[guildId] };
    },
  };
}
