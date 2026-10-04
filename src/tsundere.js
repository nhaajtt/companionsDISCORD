// The owners of the bots (OWNER_IDS in .env) get a different welcome: the companions act like they do not care, and
// secretly like them. Everyone else gets the normal, warm lines. This only picks the line; the rest is in content/tsundere.js.
import LINES from "./content/tsundere.js";
import { MALE_SLOTS } from "./praise.js";

/** Reads a comma separated list of Discord user IDs; anything that is not an ID is ignored. */
export function parseOwnerIds(text) {
  return new Set(
    String(text ?? "")
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter((id) => /^\d{15,22}$/.test(id)),
  );
}

/** How often an owner gets the shy lines instead of the normal ones (the normal ones still appear now and then, so it is not a script). */
export const TSUNDERE_CHANCE = 0.85;

/** One shy line for a purpose ("welcome", "greet", "bye", "remind") in the voice of this bot, or null when there is none. */
export function tsundereLine({ language = "vi", slot, purpose, rng = Math.random }) {
  const bank = LINES[language] ?? LINES.vi;
  const kind = language === "vi" && MALE_SLOTS.has(slot) ? "boy" : "girl";
  const list = bank[kind]?.[purpose];
  return list?.length ? list[Math.floor(rng() * list.length)] : null;
}
