// Pomodoro focus sessions for the voice room. It never talks to Discord: tick() returns the lines to say.
const MIN = 60_000;
const EMPTY_STOP_MS = 5 * MIN; // a session ends when nobody has been in the room this long

export const POMODORO_LIMITS = { work: [5, 90, 25], brk: [1, 30, 5], rounds: [1, 8, 4] };

export const fill = (template, values) => String(template ?? "").replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");

const pick = (value, [min, max, fallback]) => Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : fallback));

export class PomodoroSessions {
  #sessions = new Map(); // guildId -> session
  #now;

  constructor({ now = Date.now } = {}) {
    this.#now = now;
  }

  /** Starts a session in a server: { ok, session } or { ok: false } when one is already running. */
  start(guildId, { work, brk, rounds } = {}) {
    if (this.#sessions.has(guildId)) return { ok: false };
    const session = {
      work: pick(work, POMODORO_LIMITS.work),
      brk: pick(brk, POMODORO_LIMITS.brk),
      rounds: pick(rounds, POMODORO_LIMITS.rounds),
      phase: "work",
      round: 1,
      emptySince: null,
    };
    session.endsAt = this.#now() + session.work * MIN;
    this.#sessions.set(guildId, session);
    return { ok: true, session: { ...session } };
  }

  stop(guildId) {
    return this.#sessions.delete(guildId);
  }

  status(guildId) {
    const s = this.#sessions.get(guildId);
    if (!s) return null;
    return { phase: s.phase, round: s.round, rounds: s.rounds, minutesLeft: Math.max(0, Math.ceil((s.endsAt - this.#now()) / MIN)) };
  }

  /** Moves every session along. `humansIn(guildId)` says how many people are in the room. Returns [{ guildId, event, ...values }]. */
  tick(humansIn) {
    const t = this.#now();
    const events = [];
    for (const [guildId, s] of [...this.#sessions]) {
      if (humansIn(guildId) === 0) {
        s.emptySince ??= t;
        if (t - s.emptySince >= EMPTY_STOP_MS) {
          this.#sessions.delete(guildId);
          events.push({ guildId, event: "empty" });
          continue;
        }
      } else s.emptySince = null;

      if (t < s.endsAt) continue;
      if (s.phase === "work") {
        if (s.round >= s.rounds) {
          this.#sessions.delete(guildId);
          events.push({ guildId, event: "done", rounds: s.rounds, minutes: s.rounds * s.work });
          continue;
        }
        s.phase = "break";
        s.endsAt = t + s.brk * MIN;
        events.push({ guildId, event: "break", brk: s.brk, round: s.round, rounds: s.rounds });
      } else {
        s.phase = "work";
        s.round++;
        s.endsAt = t + s.work * MIN;
        events.push({ guildId, event: "work", work: s.work, round: s.round, rounds: s.rounds });
      }
    }
    return events;
  }
}
