// Notes under a bot's name that follow the time of day, so the bots look like they live through the day (morning coffee, tired at night...).
// A bot mixes them in with its own notes (see presenceText); this file only decides which list fits the moment.
import TIME_NOTES from "./content/timenotes.js";

/** The part of the day for a local hour (0 to 23). */
export function periodOf(hour) {
  if (hour >= 5 && hour <= 10) return "morning";
  if (hour >= 11 && hour <= 13) return "noon";
  if (hour >= 14 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 21) return "evening";
  if (hour >= 22) return "night";
  return "latenight"; // 0 to 4
}

/** The notes that fit now: the part of the day, plus the weekend ones on Saturday and Sunday during the day. */
export function timeNotesFor({ language = "vi", now = Date.now(), timeZone = "UTC" }) {
  const bank = TIME_NOTES[language] ?? TIME_NOTES.vi;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour) % 24;
  const weekend = (parts.weekday === "Sat" || parts.weekday === "Sun") && hour >= 8 && hour <= 21;
  return [...bank[periodOf(hour)], ...(weekend ? bank.weekend : [])];
}
