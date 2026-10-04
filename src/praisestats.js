// Who was cheered and who was teased the most this week, per server. It keeps only the names the members typed or picked
// (a display name, never an ID), only for the current week, and it is erased with the rest of the server's data.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { weekStart } from "./scores.js";

const KINDS = ["khen", "che"];
const keyOf = (name) => name.toLowerCase();

/** A store kept in `file` (or only in memory when no file is given). */
export function createPraiseStore(file = null) {
  let data = {};
  if (file) {
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with no cheer counts:`, error.message);
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
      console.error("Could not save the cheer counts:", error.message);
    }
  };
  // a new week starts from zero
  const current = (guildId, day) => {
    const week = weekStart(day);
    if (data[guildId]?.week !== week) data[guildId] = { week, khen: {}, che: {} };
    return data[guildId];
  };

  return {
    /** Counts one /khen or /che for this name (ignored when there is no name). */
    record(guildId, kind, name, day) {
      const clean = String(name ?? "").trim();
      if (!clean || !KINDS.includes(kind)) return;
      const entry = (current(guildId, day)[kind][keyOf(clean)] ??= { name: clean, count: 0 });
      entry.count++;
      save();
    },
    /** The most cheered ("khen") or teased ("che") names of this week: [{ name, count }], best first. */
    top(guildId, kind, day, limit = 5) {
      if (data[guildId]?.week !== weekStart(day)) return [];
      return Object.values(data[guildId][kind] ?? {})
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, limit);
    },
    forgetGuild(guildId) {
      const had = guildId in data;
      delete data[guildId];
      if (had) save();
      return had;
    },
  };
}
