// The owners of the bots (OWNER_IDS in .env) get a different welcome: the companions act like they do not care, and
// secretly like them. Everyone else gets the normal, warm lines. This only picks the line; the rest is in content/tsundere.js.
import LINES from "./content/tsundere.js";
import { MALE_SLOTS } from "./praise.js";

/** How shy the bots stay with an owner: 1 never softens, 2 (the default) softens after a long stay, 3 is already soft. */
export const DEFAULT_LEVEL = 2;
/** A person who stayed this long in the voice room gets the softer goodbye (at level 2). */
export const SOFT_AFTER_MINUTES = 45;

/**
 * Reads a comma separated list of Discord user IDs, each with an optional level ("659253931788206089" or "659253931788206089:3"):
 * a Map of id to level. Anything that is not an ID is ignored.
 */
export function parseOwnerIds(text) {
  const owners = new Map();
  for (const part of String(text ?? "").split(/[,\s]+/)) {
    const [id, level] = part.trim().split(":");
    if (!/^\d{15,22}$/.test(id ?? "")) continue;
    const n = Number(level);
    owners.set(id, [1, 2, 3].includes(n) ? n : DEFAULT_LEVEL);
  }
  return owners;
}

/** "cold" (pretends not to care) or "soft" (the shyness slips) for this owner, purpose and time spent in the room. */
export function tsundereStage({ level = DEFAULT_LEVEL, purpose, minutes = 0 }) {
  if (level >= 3) return "soft";
  if (level <= 1) return "cold";
  return purpose === "bye" && minutes >= SOFT_AFTER_MINUTES ? "soft" : "cold";
}

/** How often an owner gets the shy lines instead of the normal ones (the normal ones still appear now and then, so it is not a script). */
export const TSUNDERE_CHANCE = 0.85;

/** One shy line for a purpose ("welcome", "greet", "bye", "remind") in the voice of this bot, or null when there is none. */
export function tsundereLine({ language = "vi", slot, purpose, stage = "cold", rng = Math.random }) {
  const bank = LINES[language] ?? LINES.vi;
  const kind = language === "vi" && MALE_SLOTS.has(slot) ? "boy" : "girl";
  const pick = (source) => source?.[kind]?.[purpose];
  const list = (stage === "soft" && pick(bank.soft)?.length ? pick(bank.soft) : pick(bank)) ?? [];
  return list.length ? list[Math.floor(rng() * list.length)] : null;
}
