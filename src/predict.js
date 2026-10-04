// /dudoan: before a round, members press a button to bet that the player will win or lose, and some companions bet too.
// When the result is known, the companions react. Everything lives in memory only (a restart forgets a prediction that is still open).
import PREDICT from "./content/predict.js";
import { MALE_SLOTS, cleanName, render } from "./praise.js";

export const PREDICT_LIMITS = { minMinutes: 1, maxMinutes: 10, defaultMinutes: 3 };
const DROP_AFTER_MS = 30 * 60_000; // a prediction nobody settles is forgotten after this
export const SIDES = ["win", "lose"];

export class Predictions {
  #deps;
  #byKey = new Map(); // "guild:channel" -> session
  #byToken = new Map(); // button token -> session

  constructor({ now = Date.now, rng = Math.random, setTimer = setTimeout, clearTimer = clearTimeout, onClose = () => {} } = {}) {
    this.#deps = { now, rng, setTimer, clearTimer, onClose };
  }

  /** Opens a prediction in a channel: { ok: true, session } or { ok: false, reason: "running" }. */
  start({ key, starterId, ten = "", goi = "anh", language = "vi", minutes = PREDICT_LIMITS.defaultMinutes, slots = [] }) {
    if (this.#byKey.has(key)) return { ok: false, reason: "running" };
    const { now, rng, setTimer } = this.#deps;
    const length = Math.min(PREDICT_LIMITS.maxMinutes, Math.max(PREDICT_LIMITS.minMinutes, Math.floor(minutes) || PREDICT_LIMITS.defaultMinutes));
    const session = {
      key,
      token: Math.floor(rng() * 36 ** 8).toString(36).padStart(8, "0"),
      starterId,
      ten: cleanName(ten),
      goi,
      language,
      minutes: length,
      closesAt: now() + length * 60_000,
      votes: new Map(), // userId -> { name, side }
      bets: [], // [{ slot, side }]
      closed: false,
      where: null, // { slot, guildId, channelId, messageId } of the message with the buttons
      timers: [],
      slots,
    };
    session.timers.push(setTimer(() => this.close(session.token), length * 60_000));
    session.timers.push(setTimer(() => this.#drop(session), DROP_AFTER_MS));
    for (const timer of session.timers) timer?.unref?.();
    this.#byKey.set(key, session);
    this.#byToken.set(session.token, session);
    return { ok: true, session };
  }

  get(token) {
    return this.#byToken.get(token) ?? null;
  }

  find(key) {
    return this.#byKey.get(key) ?? null;
  }

  /** A member's vote (a second press changes it): { ok: true, changed, counts } or { ok: false, reason }. */
  vote(token, userId, name, side) {
    const session = this.#byToken.get(token);
    if (!session) return { ok: false, reason: "unknown" };
    if (!SIDES.includes(side)) return { ok: false, reason: "side" };
    if (session.closed) return { ok: false, reason: "closed" };
    const before = session.votes.get(userId)?.side;
    session.votes.set(userId, { name: cleanName(name) || "?", side });
    return { ok: true, changed: before !== undefined && before !== side, counts: this.counts(token) };
  }

  /** Votes of the people, and the bets of the bots: { win, lose, botWin, botLose }. */
  counts(token) {
    const session = this.#byToken.get(token);
    if (!session) return { win: 0, lose: 0, botWin: 0, botLose: 0 };
    const people = [...session.votes.values()];
    return {
      win: people.filter((v) => v.side === "win").length,
      lose: people.filter((v) => v.side === "lose").length,
      botWin: session.bets.filter((b) => b.side === "win").length,
      botLose: session.bets.filter((b) => b.side === "lose").length,
    };
  }

  addBet(token, slot, side) {
    this.#byToken.get(token)?.bets.push({ slot, side });
  }

  /** Stops taking votes. Returns the session, or null when it is unknown or was already closed. */
  close(token) {
    const session = this.#byToken.get(token);
    if (!session || session.closed) return null;
    session.closed = true;
    this.#deps.onClose(session);
    return session;
  }

  /** The result is known: { session, right, wrong, botRight, botWrong } and the prediction is over. Null when none is open. */
  resolve(key, outcome) {
    const session = this.#byKey.get(key);
    if (!session || !SIDES.includes(outcome)) return null;
    this.close(session.token);
    const people = [...session.votes.values()];
    const result = {
      session,
      right: people.filter((v) => v.side === outcome).map((v) => v.name),
      wrong: people.filter((v) => v.side !== outcome).map((v) => v.name),
      botRight: session.bets.filter((b) => b.side === outcome).map((b) => b.slot),
      botWrong: session.bets.filter((b) => b.side !== outcome).map((b) => b.slot),
    };
    this.#drop(session);
    return result;
  }

  #drop(session) {
    for (const timer of session.timers) this.#deps.clearTimer(timer);
    this.#byKey.delete(session.key);
    this.#byToken.delete(session.token);
  }

  stopAll() {
    for (const session of [...this.#byKey.values()]) this.#drop(session);
  }
}

/** Which bots bet and on what side: up to `max` bots, about 6 in 10 bet on a win. */
export function planBets({ slots, rng = Math.random, max = 8 }) {
  const order = [...slots];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, max).map((slot) => ({ slot, side: rng() < 0.6 ? "win" : "lose" }));
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

/** What a bot says when it bets ("win" or "lose") or reacts to the result ("right" or "wrong"). */
export function predictLine({ slot, kind, language = "vi", goi = "anh", rng = Math.random }) {
  const bank = PREDICT[language] ?? PREDICT.vi;
  const group = language === "vi" && MALE_SLOTS.has(slot) && bank.boy[kind]?.length ? bank.boy : bank.girl;
  return render(pick(group[kind], rng), { goi, language });
}

const WHO = { vi: (ten, goi) => ten || goi, en: (ten) => ten || "the player" };

/** The message that carries the buttons. */
export function announceText({ language = "vi", ten, goi = "anh", minutes, counts }) {
  const who = WHO[language]?.(ten, goi) ?? WHO.vi(ten, goi);
  const tally = `✅ ${counts.win + counts.botWin} · ❌ ${counts.lose + counts.botLose}`;
  return language === "en"
    ? `🔮 Prediction: will ${who} win or lose this round? Press a button in the next ${minutes} minute${minutes === 1 ? "" : "s"}!\n${tally}`
    : `🔮 Dự đoán: ${who} sẽ thắng hay thua ván này? Bấm nút trong ${minutes} phút tới!\n${tally}`;
}

/** The same message after voting closed. */
export function closedText({ language = "vi", ten, goi = "anh", counts }) {
  const who = WHO[language]?.(ten, goi) ?? WHO.vi(ten, goi);
  const tally = `✅ ${counts.win + counts.botWin} · ❌ ${counts.lose + counts.botLose}`;
  return language === "en"
    ? `🔒 Voting is closed for ${who}'s round. ${tally}\nWaiting for the result: use \`/dudoan result\`.`
    : `🔒 Hết giờ dự đoán cho ván của ${who}. ${tally}\nChờ kết quả: dùng \`/dudoan result\`.`;
}

/** The announcement of the result: who was right (names only, no pings). */
export function resultText({ language = "vi", ten, goi = "anh", outcome, right, wrong }) {
  const who = WHO[language]?.(ten, goi) ?? WHO.vi(ten, goi);
  const names = (list) => (list.length ? list.slice(0, 15).join(", ") + (list.length > 15 ? ` +${list.length - 15}` : "") : "-");
  if (language === "en") {
    return `${outcome === "win" ? "🏆" : "💔"} Result: ${who} ${outcome === "win" ? "won" : "lost"}!\n✅ Called it (${right.length}): ${names(right)}\n❌ Missed (${wrong.length}): ${names(wrong)}`;
  }
  return `${outcome === "win" ? "🏆" : "💔"} Kết quả: ${who} ${outcome === "win" ? "đã thắng" : "đã thua"}!\n✅ Đoán đúng (${right.length}): ${names(right)}\n❌ Đoán sai (${wrong.length}): ${names(wrong)}`;
}
