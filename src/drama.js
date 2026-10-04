// Small scenes between two companions that fit together (a couple, or best friends), said one line at a time in the chat channel.
import DRAMA from "./content/drama.js";

/** Who is who, as 0-based bot slots: bots 22 to 27. */
export const WHO_SLOT = { fury: 21, chamy: 22, laibang: 23, six: 24, giang: 25, phuong: 26 };
export const COUPLES = ["lai-six", "giang-phuong", "fury-chamy"];

/**
 * One scene as [{ slot, text }], or null when no scene fits the bots that can write in the channel.
 * `couple` limits it to one pair; `available` is a Set of the slots that can speak.
 */
export function pickScene({ language = "vi", couple = null, available, rng = Math.random }) {
  const fits = DRAMA.scenes.filter((scene) => {
    if (couple && scene.couple !== couple) return false;
    return (scene[language] ?? scene.vi).every(({ who }) => available.has(WHO_SLOT[who]));
  });
  if (!fits.length) return null;
  const scene = fits[Math.floor(rng() * fits.length)];
  return (scene[language] ?? scene.vi).map(({ who, text }) => ({ slot: WHO_SLOT[who], text }));
}
