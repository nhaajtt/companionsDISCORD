// What a bot is called. The personalities have working names (Pip, Chamy...), but the bots are known by their Discord names, which the owner
// can change at any time (Developer Portal). The program reads each bot's current Discord name while it runs, so nothing has to be edited
// when a bot is renamed: the bots call each other by those names, and a line that names a bot ("Chamy teased me") shows the current name.
import { getContent } from "./content/index.js";

const PERSONA_NAMES = getContent("en").personas.map((p) => p.name);

/** The personality names that really appear inside the lines (a bot naming itself or another bot). Ordinary words like Dog or Cow never do. */
const NAMED_IN_LINES = ["Trường Giang", "Nhã Phương", "Lai Bâng", "furyZ", "Chamy", "Sparky", "Misty", "Rocket", "Maple", "Quill", "Blip", "Echo", "Nova", "Pip", "Six"];

let resolver = () => null;

/** Tells this file where to find the live Discord name of a bot (its 0-based slot): a function slot -> name or null. */
export function setNameResolver(fn) {
  resolver = typeof fn === "function" ? fn : () => null;
}

/** The name to show for a bot: its Discord name, or the personality's working name until it is known. */
export function displayName(slot, language = "en") {
  const live = String(resolver(slot) ?? "").trim();
  return live || getContent(language).personas[slot]?.name || PERSONA_NAMES[slot] || `Bot ${slot + 1}`;
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WHOLE = NAMED_IN_LINES.map((name) => ({ name, slot: PERSONA_NAMES.indexOf(name), pattern: new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, "gu") })).filter((entry) => entry.slot >= 0);

/** A line with the working names of the bots swapped for their current Discord names (only whole words; a name that did not change stays). */
export function localizeNames(text) {
  let out = String(text ?? "");
  for (const { name, slot, pattern } of WHOLE) {
    const now = displayName(slot);
    if (now !== name) out = out.replace(pattern, () => now);
  }
  return out;
}
