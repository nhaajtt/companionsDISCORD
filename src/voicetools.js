// What the companions do around the voice room they sit in: greet people who join, count the minutes people spend there,
// and announce Pomodoro steps. It never talks to Discord; the things it needs come in through deps.
import { PomodoroSessions, fill } from "./pomodoro.js";
import { isQuietHour, localParts } from "./settings.js";
import { isVoiceRoom } from "./voice.js";

const MIN = 60_000;
const GREET_COOLDOWN_MS = 30 * MIN; // greet the same person at most this often
const GREET_DAILY_CAP = 20;
const REGULAR_MINUTES = 300; // 5 hours in the room in one week makes someone a "voice regular"

/**
 * @param {object} deps
 * @param {{get(guildId): object}} deps.store  settings (voiceChannelId, voiceGreet, enabled, channelId, language, quiet hours)
 * @param {{add(guildId, userId, day, points): void}} deps.hours  voice minutes (a score store)
 * @param {(language: string) => object} deps.tools  the spoken lines (the content `tools` bank)
 * @param {(message: {guildId: string, text: string}) => Promise|void} deps.say  post in the chat channel
 * @param {(guildId: string) => number} deps.humansIn  how many people are in the voice room right now
 */
export class VoiceTools {
  #deps;
  #sessions = new Map(); // "guild:user" -> { guildId, userId, since }
  #greeted = new Map(); // "guild:user" -> time of the last greeting
  #greetDay = new Map(); // guildId -> { day, count }
  pomodoro;

  constructor({ store, hours, tools, say, humansIn, timezone = "UTC", rng = Math.random, now = Date.now }) {
    this.#deps = { store, hours, tools, say, humansIn, timezone, rng, now };
    this.pomodoro = new PomodoroSessions({ now });
  }

  #lines(guildId) {
    return this.#deps.tools(this.#deps.store.get(guildId).language);
  }

  #day() {
    return localParts(this.#deps.now(), this.#deps.timezone).day;
  }

  /** Someone is in the companions' voice room: they just joined, or were already there when the program started. */
  userJoined({ guildId, userId, channelId, existing = false }) {
    const { store, now, rng, say, timezone } = this.#deps;
    const settings = store.get(guildId);
    if (!isVoiceRoom(settings, channelId)) return;
    const key = `${guildId}:${userId}`;
    if (!this.#sessions.has(key)) this.#sessions.set(key, { guildId, userId, since: now() });
    if (existing || !settings.voiceGreet || !settings.enabled || !settings.channelId) return;

    const t = now();
    if (isQuietHour(localParts(t, timezone).hour, settings.quietStart, settings.quietEnd)) return;
    if (t - (this.#greeted.get(key) ?? -Infinity) < GREET_COOLDOWN_MS) return;
    const day = this.#day();
    const previous = this.#greetDay.get(guildId);
    const counter = previous?.day === day ? previous : { day, count: 0 };
    if (counter.count >= GREET_DAILY_CAP) return;
    counter.count++;
    this.#greetDay.set(guildId, counter);
    this.#greeted.set(key, t);
    const lines = this.#lines(guildId).greet;
    Promise.resolve(say({ guildId, text: fill(lines[Math.floor(rng() * lines.length)], { user: `<@${userId}>` }) })).catch(() => {});
  }

  /** Someone left the room (or the server). Their time is counted. */
  userLeft({ guildId, userId }) {
    const key = `${guildId}:${userId}`;
    const session = this.#sessions.get(key);
    if (!session) return;
    this.#flush(session);
    this.#sessions.delete(key);
  }

  #flush(session) {
    const minutes = Math.floor((this.#deps.now() - session.since) / MIN);
    if (minutes < 1) return;
    session.since += minutes * MIN;
    const day = this.#day();
    this.#deps.hours.add(session.guildId, session.userId, day, minutes);

    // Crossing 5 hours in a week is announced once (when the setting is on)
    const total = this.#deps.hours.weekTotal?.(session.guildId, session.userId, day);
    if (this.#deps.store.get(session.guildId).titles && total >= REGULAR_MINUTES && total - minutes < REGULAR_MINUTES) {
      const text = fill(this.#lines(session.guildId).titleRegular, { user: `<@${session.userId}>`, hours: Math.floor(total / 60) });
      Promise.resolve(this.#deps.say({ guildId: session.guildId, text })).catch(() => {});
    }
  }

  /** Called every few seconds: banks whole minutes (a restart loses little) and announces Pomodoro steps. */
  async tick() {
    for (const session of this.#sessions.values()) this.#flush(session);
    for (const { guildId, event, ...values } of this.pomodoro.tick(this.#deps.humansIn)) {
      const lines = this.#lines(guildId);
      const text = { empty: lines.pomodoroEmpty, done: lines.pomodoroDone, break: lines.pomodoroBreak, work: lines.pomodoroWork }[event];
      await Promise.resolve(this.#deps.say({ guildId, text: fill(text, values) })).catch(() => {});
    }
  }

  /** The text announcing a freshly started session. */
  startText(guildId, session) {
    return fill(this.#lines(guildId).pomodoroStart, { work: session.work, brk: session.brk, round: 1, rounds: session.rounds });
  }
}

const IDLE_ROTATE_MS = 20 * MIN; // an idle bot changes its status line about every 20 minutes

/**
 * The short status text a companion shows in the member list ("Sitting in voice with 3", "Focus session: 12 min left").
 * @param {object} lines  the `tools` bank of a language
 * @param {{slot: number, now: number, voice?: {humans: number}|null, focusMinutesLeft?: number|null}} state
 */
export function presenceText(lines, { slot, now, voice = null, focusMinutesLeft = null }) {
  if (focusMinutesLeft !== null && focusMinutesLeft !== undefined) return fill(lines.presenceFocus, { min: focusMinutesLeft });
  if (voice) return voice.humans > 0 ? fill(lines.presenceVoice, { n: voice.humans }) : lines.presenceVoiceAlone;
  return lines.presenceIdle[(slot + Math.floor(now / IDLE_ROTATE_MS)) % lines.presenceIdle.length];
}
