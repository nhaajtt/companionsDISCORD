// Trivia scores. This is the only place the program stores user ids: the people who pressed an answer button and got it right.
// Anyone can erase their own entries with /trivia forget.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The Monday of the week that contains `day` ("2026-10-02" -> "2026-09-28"). Weeks start on Monday. */
export function weekStart(day) {
  const t = Date.parse(`${day}T00:00:00Z`);
  const sinceMonday = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - sinceMonday * 86_400_000).toISOString().slice(0, 10);
}

export function createScoreStore(file) {
  let data = {};
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with no trivia scores:`, error.message);
  }

  function save() {
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (error) {
      console.error("Could not save trivia scores:", error.message);
    }
  }

  return {
    /** Adds points for a user in a server for the week that contains `day`. */
    add(guildId, userId, day, points = 1) {
      const user = ((data[guildId] ??= {})[userId] ??= { total: 0, weeks: {} });
      const week = weekStart(day);
      user.total += points;
      user.weeks[week] = (user.weeks[week] ?? 0) + points;
      // keep roughly the last year of weekly numbers
      const weeks = Object.keys(user.weeks).sort();
      while (weeks.length > 60) delete user.weeks[weeks.shift()];
      save();
    },

    /** Top players: this week's (pass `day`) or all time (omit it). */
    top(guildId, { day = null, limit = 10 } = {}) {
      const week = day ? weekStart(day) : null;
      return Object.entries(data[guildId] ?? {})
        .map(([userId, u]) => ({ userId, points: week ? (u.weeks[week] ?? 0) : u.total }))
        .filter((r) => r.points > 0)
        .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId))
        .slice(0, limit);
    },

    /** Removes a user's scores from every server. Returns how many servers had an entry. */
    forget(userId) {
      let count = 0;
      for (const users of Object.values(data)) {
        if (users[userId]) {
          delete users[userId];
          count++;
        }
      }
      if (count) save();
      return count;
    },
  };
}
