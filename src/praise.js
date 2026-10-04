// /khen and /che: every companion cheers on (or teases) the person who is playing, in the channel where the command was used.
// Girls and boys talk differently in Vietnamese, so each bot gets a line from its own pool, and no line is used twice in a round.
import PRAISE, { TEASE } from "./content/praise.js";

/** The two boys of the cast (bots 24 and 26, as 0-based slots); every other bot is a girl. */
export const MALE_SLOTS = new Set([23, 25]);

export const FORMS = {
  anh: { goi: "anh", long: "anhhh" },
  chị: { goi: "chị", long: "chịii" },
  bạn: { goi: "bạn", long: "bạnnn" },
};

/** A name typed by a member, made safe to put in a message: no mentions, markdown or line breaks, and not too long. */
export function cleanName(text) {
  return String(text ?? "")
    .replace(/[@`*_~|<>\\\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

const capital = (word) => word.charAt(0).toUpperCase() + word.slice(1);

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Fills in {goi} {Goi} {goiLong} {em} {Em} {ten} of one line. "em" is how a girl calls herself when she is not talking to "bạn". */
export function render(line, { goi = "anh", ten = "", language = "vi" }) {
  const form = FORMS[goi] ?? FORMS.anh;
  const em = language === "vi" && goi === "bạn" ? "tui" : "em";
  return line
    .replaceAll("{goiLong}", form.long)
    .replaceAll("{Goi}", capital(form.goi))
    .replaceAll("{goi}", form.goi)
    .replaceAll("{Em}", capital(em))
    .replaceAll("{em}", em)
    .replaceAll("{ten}", ten);
}

/**
 * One round of praise: [{ slot, text }] in the order the bots should speak, one different line per bot.
 * @param {{ mood?: "praise"|"tease", language?: "vi"|"en", goi?: "anh"|"chị"|"bạn", ten?: string, slots: number[], rng?: () => number }} options
 */
export function buildPraise({ mood = "praise", language = "vi", goi = "anh", ten = "", slots, rng = Math.random }) {
  const banks = mood === "tease" ? TEASE : PRAISE;
  const bank = banks[language] ?? banks.vi;
  const name = cleanName(ten);
  // Lines that call the person "anh" or "chị" and flirt are only for a girl talking to "anh" or "chị", never to "bạn"
  const pool = (kind) => {
    const group = bank[kind];
    // when a name was given its lines come first, so the name is really said; the bots themselves speak in a random order
    return [...shuffled(name ? group.named : [], rng), ...shuffled([...group.base, ...(goi === "bạn" ? [] : group.crush ?? [])], rng)];
  };
  const queues = { girl: pool("girl"), boy: pool("boy") };
  const used = new Set();
  const take = (kind) => {
    const queue = queues[kind];
    // never repeat a line in the same round; if a pool ever ran dry, borrow from the other one
    for (const source of [queue, queues[kind === "girl" ? "boy" : "girl"]]) {
      const at = source.findIndex((line) => !used.has(line));
      if (at >= 0) {
        const [line] = source.splice(at, 1);
        used.add(line);
        return line;
      }
    }
    return queue[0] ?? "";
  };
  return shuffled(slots, rng).map((slot) => ({ slot, text: render(take(MALE_SLOTS.has(slot) && language === "vi" ? "boy" : "girl"), { goi, ten: name, language }) }));
}
