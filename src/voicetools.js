// What the companions do around the voice room they sit in: greet people who join, count the minutes people spend there,
// and announce Pomodoro steps. It never talks to Discord; the things it needs come in through deps.
import { PomodoroSessions, fill } from "./pomodoro.js";
import { isQuietHour, localParts } from "./settings.js";

const MIN = 60_000;
const GREET_COOLDOWN_MS = 30 * MIN; // greet the same person at most this often
const GREET_DAILY_CAP = 20;

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
    if (!settings.voiceChannelId || channelId !== settings.voiceChannelId) return;
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
    this.#deps.hours.add(session.guildId, session.userId, this.#day(), minutes);
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
