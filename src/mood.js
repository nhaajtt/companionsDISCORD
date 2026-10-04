// Every bot has a mood for the whole day (happy, grumpy, sleepy, excited, dreamy, lazy). It is worked out from the date and the bot's number,
// so it is the same all day and across restarts, and a few personalities lean one way (Grumble wakes up grumpy more often than not).
// The mood shows in the notes under the bot's name and in the tone of its good morning and good night.
import MOOD_NOTES from "./content/moodnotes.js";
import { getContent } from "./content/index.js";

export const MOODS = ["happy", "grumpy", "sleepy", "excited", "dreamy", "lazy"];
export const MOOD_EMOJI = { happy: "😊", grumpy: "😤", sleepy: "😴", excited: "🤩", dreamy: "☁️", lazy: "🛋️" };
export const MOOD_NAME = {
  vi: { happy: "vui vẻ", grumpy: "cáu", sleepy: "buồn ngủ", excited: "hào hứng", dreamy: "mơ màng", lazy: "lười" },
  en: { happy: "happy", grumpy: "grumpy", sleepy: "sleepy", excited: "excited", dreamy: "dreamy", lazy: "lazy" },
};

/** Moods a personality leans toward (the list is where the draw happens: more of one mood means more days like that). */
const LEANING = {
  Grumble: ["grumpy", "grumpy", "grumpy", "sleepy", "lazy", "happy"],
  Pip: ["happy", "happy", "excited", "excited", "dreamy", "lazy"],
  Rocket: ["excited", "excited", "excited", "happy", "dreamy", "lazy"],
  Maple: ["happy", "sleepy", "dreamy", "dreamy", "lazy", "happy"],
  Misty: ["dreamy", "dreamy", "dreamy", "sleepy", "happy", "lazy"],
  Waffle: ["lazy", "lazy", "happy", "sleepy", "excited", "dreamy"],
  Zip: ["excited", "excited", "happy", "happy", "grumpy", "lazy"],
};

const NAMES = getContent("en").personas.map((p) => p.name);

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** The mood of a bot (its 0-based slot) on a day ("2026-10-05"). */
export function moodOf({ slot, day }) {
  const options = LEANING[NAMES[slot]] ?? MOODS;
  return options[hash(`${day}|${slot}`) % options.length];
}

/** The notes that go with a mood, in a language. */
export function moodNotesFor(language, mood) {
  return (MOOD_NOTES[language] ?? MOOD_NOTES.vi)[mood] ?? [];
}

/** Everyone's mood today, grouped: [{ mood, names }] in the order of MOODS, without empty groups. */
export function moodBoard({ language = "vi", day, slots }) {
  return MOODS.map((mood) => ({
    mood,
    names: slots.filter((slot) => moodOf({ slot, day }) === mood).map((slot) => getContent(language).personas[slot]?.name ?? NAMES[slot]),
  })).filter((group) => group.names.length);
}
