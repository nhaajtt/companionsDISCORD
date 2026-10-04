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
  camera: false, // the companions in a voice room show a "camera on" sign (a note under their name, no real video)
  aiReplies: false, // a companion answers (with Gemini) when someone mentions it or replies to it in the companions channel
  aiDaily: false, // once a day a companion posts a riddle, a question or a would-you-rather written by Gemini
  lastAiDay: "", // the day of the last AI post
  titles: false, // announce a "voice regular" when someone spends 5 hours in the voice room in a week
  recap: false, // post a short recap of the week every Monday morning
  lastRecap: "", // the Monday of the last recap that was posted
  drama: false, // once a day (evening) two companions that fit together act out a short scene in the chat channel
  lastDramaDay: "", // the day of the last scene
  gossip: false, // now and then a few companions chat among themselves in the chat channel (a group chat between friends)
  gossipSeen: [], // the ids of the gossip scenes seen lately, so they do not repeat
  gossipDay: "", // the day of the last gossip, and how many there were that day
  gossipToday: 0,
  lastGossipAt: 0, // when the last gossip started (ms), to keep a gap between two
  autoHype: false, // the companions cheer by themselves when someone starts a Go Live stream in voice
  greetings: false, // two or three companions say good morning and good night in the chat channel, once a day each
  greetMorningDay: "", // the day of the last good morning and of the last good night
  greetNightDay: "",
  reactions: false, // now and then a companion leaves a warm reaction on a member's message in the chat channel (needs Add Reactions)
  birthdays: false, // sing for the members who saved their birthday with /sinhnhat
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
    /** The settings that were saved for a server (nothing for one that never configured anything). */
    saved: (guildId) => (data[guildId] ? { ...data[guildId] } : null),
    /** Forgets a server's settings. */
    remove(guildId) {
      if (!(guildId in data)) return false;
      delete data[guildId];
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data, null, 2));
      renameSync(tmp, file);
      return true;
    },
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
