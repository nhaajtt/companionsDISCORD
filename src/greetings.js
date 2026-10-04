// Good morning and good night: every day two or three bots greet the chat channel as a little chain, the first one in the mood it has that day.
// It picks the moment (a different, fixed minute for every server and day, inside a window that respects the quiet hours) and builds the script.
import GREET from "./content/greetings.js";
import { moodOf } from "./mood.js";

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/**
 * The hours when a greeting may come, from the server's quiet hours: the good morning starts when the quiet hours end and lasts two
 * hours, the good night is the hour before they start. Returns { start, end } in minutes since midnight.
 */
export function greetingWindow(kind, { quietStart = 23, quietEnd = 8 } = {}) {
  if (kind === "morning") {
    const start = quietEnd >= 5 && quietEnd <= 11 ? quietEnd : 8;
    return { start: start * 60, end: (start + 2) * 60 };
  }
  const end = quietStart >= 20 && quietStart <= 23 ? quietStart : 23;
  return { start: (end - 1) * 60, end: end * 60 };
}

/** Is it time for this server's greeting? The minute inside the window is fixed per server, kind and day, so a restart does not move it. */
export function greetingDue({ kind, guildId, day, minuteOfDay, settings }) {
  const { start, end } = greetingWindow(kind, settings);
  const target = start + (hash(`${guildId}|${day}|${kind}`) % (end - start - 5));
  return minuteOfDay >= target && minuteOfDay < end;
}

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The little chain as a script: [{ slot, text, re }]. The first bot greets in its mood of the day; the others answer (a threaded reply to
 * the greeting, or to the bot before). Two or three bots; null when fewer than two can write.
 */
export function buildGreeting({ kind = "morning", language = "vi", slots, day, rng = Math.random }) {
  if (slots.length < 2) return null;
  const bank = GREET[language] ?? GREET.vi;
  const crowd = shuffled(slots, rng).slice(0, rng() < 0.5 ? 2 : 3);
  const first = bank[kind][moodOf({ slot: crowd[0], day })];
  const replies = shuffled(bank[`${kind}Reply`], rng);
  return [
    { slot: crowd[0], text: first[Math.floor(rng() * first.length)] },
    ...crowd.slice(1).map((slot, i) => ({ slot, text: replies[i], re: i === 0 || rng() < 0.5 ? 0 : i })),
  ];
}

/** The minute of the day (0 to 1439) in a time zone. */
export function localMinuteOfDay(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now).map((p) => [p.type, p.value]));
  return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
}
