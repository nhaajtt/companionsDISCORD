// What the companions do around the voice room they sit in: greet people who join, count the minutes people spend there,
// and announce Pomodoro steps. It never talks to Discord; the things it needs come in through deps.
import { PomodoroSessions, fill, pickLine } from "./pomodoro.js";
import { isQuietHour, localParts } from "./settings.js";
import { isVoiceRoom } from "./voice.js";

const MIN = 60_000;
const GREET_COOLDOWN_MS = 30 * MIN; // greet the same person at most this often
const GREET_DAILY_CAP = 20;
const FAREWELL_MIN_STAY_MS = 20 * MIN; // say goodbye only to people who stayed at least this long
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

  constructor({ store, hours, tools, say, humansIn, speaker = null, lineFor = null, timezone = "UTC", rng = Math.random, now = Date.now }) {
    this.#deps = { store, hours, tools, say, humansIn, speaker, lineFor, timezone, rng, now };
    this.pomodoro = new PomodoroSessions({ now });
  }

  #lines(guildId) {
    return this.#deps.tools(this.#deps.store.get(guildId).language);
  }

  /** One line of a pool, in the voice of the bot that speaks it when a `lineFor` was given. */
  #line(guildId, slot, purpose, pool, userId, minutes = 0) {
    const { lineFor, rng, store } = this.#deps;
    return lineFor ? lineFor({ language: store.get(guildId).language, slot, purpose, pool, userId, minutes }) : pickLine(pool, rng);
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
    if (!this.#sessions.has(key)) this.#sessions.set(key, { guildId, userId, since: now(), joinedAt: existing ? null : now() });
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
    const slot = this.#deps.speaker?.(guildId);
    Promise.resolve(say({ guildId, slot, text: fill(this.#line(guildId, slot, "greet", this.#lines(guildId).greet, userId), { user: `<@${userId}>` }) })).catch(() => {});
  }

  /**
   * Someone left the room (or the server). Their time is counted. A person who stayed a while gets a goodbye in the chat
   * (when greetings are on), unless they only moved to another room the companions sit in.
   */
  userLeft({ guildId, userId, moved = false }) {
    const { store, now, rng, say, timezone } = this.#deps;
    const key = `${guildId}:${userId}`;
    const session = this.#sessions.get(key);
    if (!session) return;
    this.#flush(session);
    this.#sessions.delete(key);

    const settings = store.get(guildId);
    if (moved || !session.joinedAt || !settings.voiceGreet || !settings.enabled || !settings.channelId) return;
    const t = now();
    if (t - session.joinedAt < FAREWELL_MIN_STAY_MS) return;
    if (isQuietHour(localParts(t, timezone).hour, settings.quietStart, settings.quietEnd)) return;
    if (t - (this.#greeted.get(`bye:${key}`) ?? -Infinity) < GREET_COOLDOWN_MS) return;
    const day = this.#day();
    const previous = this.#greetDay.get(guildId);
    const counter = previous?.day === day ? previous : { day, count: 0 };
    if (counter.count >= GREET_DAILY_CAP) return;
    counter.count++;
    this.#greetDay.set(guildId, counter);
    this.#greeted.set(`bye:${key}`, t);
    const slot = this.#deps.speaker?.(guildId);
    Promise.resolve(say({ guildId, slot, text: fill(this.#line(guildId, slot, "bye", this.#lines(guildId).farewell, userId, Math.floor((t - session.joinedAt) / MIN)), { user: `<@${userId}>` }) })).catch(() => {});
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
      const pool = { empty: lines.pomodoroEmpty, done: lines.pomodoroDone, break: lines.pomodoroBreak, work: lines.pomodoroWork }[event];
      await Promise.resolve(this.#deps.say({ guildId, text: fill(pickLine(pool, this.#deps.rng), values) })).catch(() => {});
    }
  }

  /** The text announcing a freshly started session. */
  startText(guildId, session) {
    return fill(pickLine(this.#lines(guildId).pomodoroStart, this.#deps.rng), { work: session.work, brk: session.brk, round: 1, rounds: session.rounds });
  }
}

const NOTE_ROTATE_MS = 15 * MIN; // a bot changes its note about every 15 minutes

/**
 * The note (custom status) a companion shows under its name. A bot sitting in a voice room with the camera sign on shows that sign,
 * a running focus session shows the minutes left; otherwise it shows one of its own funny notes, written like a real person would, and moves
 * to the next one every 15 minutes. It never announces "sitting in voice with N": that read the same on every bot.
 * @param {object} lines  the `tools` bank of a language
 * @param {{slot: number, now: number, voice?: {humans: number}|null, focusMinutesLeft?: number|null, notes?: string[], offset?: number, camera?: boolean, timeNotes?: string[]|null, moodNotes?: string[]|null}} state
 *   `notes` are the persona's notes and `offset` is where in the list this bot started (random on each start)
 */
export function presenceText(lines, { slot, now, voice = null, focusMinutesLeft = null, notes = null, offset = 0, camera = false, timeNotes = null, moodNotes = null }) {
  if (camera && voice && lines.presenceCamera?.length) return lines.presenceCamera[(offset + slot + Math.floor(now / NOTE_ROTATE_MS)) % lines.presenceCamera.length];
  if (focusMinutesLeft !== null && focusMinutesLeft !== undefined) return fill(lines.presenceFocus, { min: focusMinutesLeft });
  const window = Math.floor(now / NOTE_ROTATE_MS);
  // about one note in three follows the time of day (hungry at noon, sleepy at night), the others are the bot's own
  if (timeNotes?.length && (window + slot + offset) % 3 === 0) return timeNotes[(window * 7 + slot * 3 + offset) % timeNotes.length];
  // one note in six shows the mood the bot is in today (grumpy, sleepy...)
  if (moodNotes?.length && (window + slot + offset) % 6 === 1) return moodNotes[(window * 5 + slot * 2 + offset) % moodNotes.length];
  const list = notes?.length ? notes : lines.presenceIdle;
  return list[(offset + slot + window) % list.length];
}
