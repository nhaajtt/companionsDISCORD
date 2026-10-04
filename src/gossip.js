// Gossip ("tám chuyện"): the companions chat among themselves like friends in a group chat. A scene is a short script for 3 to 5 bots.
// This file casts a scene (who plays which role), fills in the names, and avoids repeating a scene a server has just seen.
// Playing it (typing, threaded replies, pauses) is done by the runtime.
import SCENES from "./content/gossip.js";
import { getContent } from "./content/index.js";
import { MALE_SLOTS, cleanName } from "./praise.js";

export const GOSSIP_TAGS = ["food", "game", "sleep", "love", "server", "weather", "rant", "owner", "money", "pets", "music", "study", "fashion", "tech", "fun", "work"];
/** How many scene ids a server remembers, so a scene does not come back before most of the others were seen. */
export const SEEN_LIMIT = 60;

const NAMES = getContent("en").personas.map((p) => p.name);
const SLOT_OF = new Map(NAMES.map((name, slot) => [name, slot]));

/** The display name of a bot in a language (the persona name). */
export const personaName = (language, slot) => getContent(language).personas[slot]?.name ?? NAMES[slot] ?? `Bot ${slot + 1}`;

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Who plays each role: a Map of role to bot slot, or null when the bots that can speak are not enough.
 * Roles named after a bot go to that bot; generic "girl" roles go to random girl bots that are not already cast.
 */
export function castScene(scene, { available, rng = Math.random }) {
  const cast = new Map();
  const used = new Set();
  for (const [role, who] of Object.entries(scene.cast)) {
    if (who === "girl") continue;
    const slot = SLOT_OF.get(who);
    if (slot === undefined || !available.has(slot) || used.has(slot)) return null;
    cast.set(role, slot);
    used.add(slot);
  }
  const girls = shuffled([...available].filter((slot) => !MALE_SLOTS.has(slot) && !used.has(slot)), rng);
  for (const [role, who] of Object.entries(scene.cast)) {
    if (who !== "girl") continue;
    if (!girls.length) return null;
    cast.set(role, girls.pop());
  }
  return cast;
}

/**
 * One scene ready to play: { id, tags, script: [{ slot, text, re }], reset } or null.
 * `re` is the index of the earlier line this one answers (a threaded reply). `seen` are the ids this server saw lately; when every
 * fitting scene was seen, one is picked anyway and `reset` is true so the caller can start the memory again.
 * `ownerName` (the owner of the bots, a person present in the server) unlocks the scenes about the owner; `tag` limits the topic.
 */
export function pickGossip({ language = "vi", available, seen = [], tag = null, ownerName = "", rng = Math.random, scenes = SCENES }) {
  const owner = cleanName(ownerName);
  const pool = scenes.filter((scene) => {
    const about = scene.tags.includes("owner");
    if (about && !owner) return false;
    if (tag === "owner") return about;
    return !tag || scene.tags.includes(tag);
  });
  const order = shuffled(pool, rng);
  const fresh = order.filter((scene) => !seen.includes(scene.id));
  for (const list of [fresh, order]) {
    for (const scene of list) {
      const cast = castScene(scene, { available, rng });
      if (!cast) continue;
      const lines = scene[language] ?? scene.vi;
      const script = lines.map((line) => ({
        slot: cast.get(line.r),
        re: line.re,
        text: line.text.replace(/\{(\w+)\}/g, (whole, role) => (role === "owner" ? owner : cast.has(role) ? personaName(language, cast.get(role)) : whole)),
      }));
      return { id: scene.id, tags: scene.tags, script, reset: list !== fresh };
    }
  }
  return null;
}

/** The new memory of seen scene ids after one was played. */
export function rememberScene(seen, id, reset = false) {
  const next = reset ? [] : seen.filter((x) => x !== id);
  next.push(id);
  return next.slice(-SEEN_LIMIT);
}
