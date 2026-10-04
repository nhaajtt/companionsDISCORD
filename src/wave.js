// /lamsong: a "stadium wave" of emoji across the bots. Each bot posts the emoji a few more times than the one before, up to the middle bot,
// who adds a chant, then it shrinks again: 1, 2, 3, 4, 5, 4, 3, 2, 1.
import WAVE from "./content/wave.js";
import { cleanName } from "./praise.js";

/** The emoji that can be chosen (anything else would let a member make the bots post whatever they want). */
export const WAVE_EMOJI = ["🔥", "❤️", "👏", "⭐", "🎉", "💪", "🚀", "🌊"];
export const WAVE_MAX_BOTS = 9;

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** How many times each bot posts the emoji for a wave of `n` bots: 1 up to the middle and back down. */
export function waveSizes(n) {
  return Array.from({ length: n }, (_, i) => 1 + Math.min(i, n - 1 - i));
}

/** The wave as a script [{ slot, text }]: null when fewer than three bots can write (a wave needs a crowd). */
export function buildWave({ language = "vi", emoji = "🔥", ten = "", slots, rng = Math.random }) {
  if (slots.length < 3) return null;
  const mark = WAVE_EMOJI.includes(emoji) ? emoji : WAVE_EMOJI[0];
  const crowd = shuffled(slots, rng).slice(0, WAVE_MAX_BOTS);
  const sizes = waveSizes(crowd.length);
  const bank = WAVE[language] ?? WAVE.vi;
  const name = cleanName(ten);
  const pool = name ? bank.named : bank.peak;
  const chant = pool[Math.floor(rng() * pool.length)].replaceAll("{ten}", name);
  const peak = Math.floor((crowd.length - 1) / 2);
  return crowd.map((slot, i) => ({ slot, text: i === peak ? `${mark.repeat(sizes[i])} ${chant}` : mark.repeat(sizes[i]) }));
}
