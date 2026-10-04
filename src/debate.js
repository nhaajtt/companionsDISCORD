// /tranhluan: the companions split into two camps and argue playfully about "a or b", then one of them gives a verdict.
import DEBATE from "./content/debate.js";
import { MALE_SLOTS, cleanName } from "./praise.js";

const fillIn = (line, values) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), line);

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The whole argument as a script: [{ slot, text }] in the order it should be said (an opener, the two camps taking turns,
 * a verdict), plus who won. Returns null when a side has no name or fewer than two bots are available.
 */
export function buildDebate({ language = "vi", a, b, slots, rng = Math.random, maxBots = 10 }) {
  const bank = DEBATE[language] ?? DEBATE.vi;
  const sideA = cleanName(a);
  const sideB = cleanName(b);
  const crowd = shuffled(slots, rng).slice(0, maxBots);
  if (!sideA || !sideB || crowd.length < 2) return null;

  const used = new Set();
  const pick = (list) => {
    const fresh = list.filter((line) => !used.has(line));
    const source = fresh.length ? fresh : list;
    const line = source[Math.floor(rng() * source.length)];
    used.add(line);
    return line;
  };
  const poolFor = (slot, key) => (language === "vi" && MALE_SLOTS.has(slot) && bank.boy[key]?.length ? bank.boy[key] : bank.girl[key]);

  const script = [{ slot: crowd[0], text: fillIn(pick(bank.opener), { a: sideA, b: sideB }) }];
  crowd.forEach((slot, i) => {
    const mine = i % 2 === 0 ? sideA : sideB;
    const other = i % 2 === 0 ? sideB : sideA;
    script.push({ slot, text: fillIn(pick(poolFor(slot, "camp")), { mine, other }) });
  });
  const judge = shuffled(slots, rng)[0];
  const tie = rng() < 0.15;
  const winner = tie ? "tie" : rng() < 0.5 ? "a" : "b";
  const text = tie
    ? fillIn(pick(bank.tie), { a: sideA, b: sideB })
    : fillIn(pick(bank.verdict), { winner: winner === "a" ? sideA : sideB, loser: winner === "a" ? sideB : sideA });
  script.push({ slot: judge, text });
  return { script, winner };
}
