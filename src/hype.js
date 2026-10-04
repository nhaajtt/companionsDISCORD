// /hype: for a while, the companions keep cheering on their own, one bot at a time, a little apart, until time is up or someone stops it.
// It only decides what to say and when; `send` does the talking. The timers and the random numbers are given in, so it can be tested.
import { buildPraise } from "./praise.js";

export const HYPE_LIMITS = { minMinutes: 5, maxMinutes: 60, defaultMinutes: 15 };
const GAP_MS = { min: 20_000, max: 45_000 }; // between two messages
const MAX_MESSAGES = 60; // a hard stop, whatever the clock says

export class HypeSessions {
  #deps;
  #sessions = new Map(); // key -> session

  constructor({ send, now = Date.now, rng = Math.random, setTimer = setTimeout, clearTimer = clearTimeout, log = () => {} }) {
    this.#deps = { send, now, rng, setTimer, clearTimer, log };
  }

  /** Starts cheering in a channel. Returns { ok: true, until, minutes } or { ok: false, reason: "running" }. */
  start({ key, minutes = HYPE_LIMITS.defaultMinutes, mood = "praise", language = "vi", goi = "anh", ten = "", slots }) {
    if (this.#sessions.has(key)) return { ok: false, reason: "running" };
    const { now } = this.#deps;
    const length = Math.min(HYPE_LIMITS.maxMinutes, Math.max(HYPE_LIMITS.minMinutes, Math.floor(minutes) || HYPE_LIMITS.defaultMinutes));
    const session = { key, until: now() + length * 60_000, mood, language, goi, ten, slots, queue: [], sent: 0, timer: null, stopped: false };
    this.#sessions.set(key, session);
    session.timer = this.#deps.setTimer(() => this.#tick(session), 0);
    session.timer?.unref?.();
    return { ok: true, until: session.until, minutes: length };
  }

  /** Stops one channel; true when something was running there. */
  stop(key) {
    const session = this.#sessions.get(key);
    if (!session) return false;
    this.#end(session);
    return true;
  }

  /** { minutesLeft, sent } of a running channel, or null. */
  status(key) {
    const session = this.#sessions.get(key);
    return session ? { minutesLeft: Math.max(0, Math.ceil((session.until - this.#deps.now()) / 60_000)), sent: session.sent } : null;
  }

  stopAll() {
    for (const session of [...this.#sessions.values()]) this.#end(session);
  }

  #end(session) {
    session.stopped = true;
    this.#deps.clearTimer(session.timer);
    this.#sessions.delete(session.key);
  }

  async #tick(session) {
    const { now, rng, send, log } = this.#deps;
    if (session.stopped) return;
    if (now() >= session.until || session.sent >= MAX_MESSAGES) return this.#end(session);
    if (!session.queue.length) {
      // a "mix" is mostly praise with some teasing; the lines of one round never repeat
      const mood = session.mood === "mix" ? (rng() < 0.7 ? "praise" : "tease") : session.mood;
      session.queue = buildPraise({ mood, language: session.language, goi: session.goi, ten: session.ten, slots: session.slots, rng });
    }
    const next = session.queue.shift();
    if (next) {
      session.sent++;
      try {
        await send({ key: session.key, slot: next.slot, text: next.text });
      } catch (error) {
        log(`A hype message could not be sent: ${error.message}`);
      }
    }
    if (session.stopped) return;
    const gap = GAP_MS.min + rng() * (GAP_MS.max - GAP_MS.min);
    session.timer = this.#deps.setTimer(() => this.#tick(session), gap);
    session.timer?.unref?.();
  }
}
