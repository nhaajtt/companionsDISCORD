import { dayRange } from "./usage.js";
// Text for the admin commands, kept free of Discord objects so it can be tested.

const KIND_NAMES = {
  question: "questions",
  qotd: "question of the day",
  riddle: "jokes and riddles",
  fact: "fun facts",
  banter: "bot-to-bot chats",
  poll: "polls",
  trivia: "trivia rounds",
};
const ORDER = ["question", "qotd", "riddle", "fact", "banter", "poll", "trivia"];

const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");

/** The /companions stats message for a summary from the usage store. */
export function formatStats(summary, { weights = null, adaptive = true } = {}) {
  const { days, started, joined, replies, total, totalJoined, totalReplies, acks, triviaAnswers, triviaCorrect } = summary;
  if (!total) {
    return `📊 **Last ${days} days**\nNo conversations yet. Use \`/companions now\` to start one, or wait for the next one.`;
  }

  const lines = [
    `📊 **Last ${days} days**`,
    `**${total}** conversation${total === 1 ? "" : "s"} started, **${totalJoined}** (${pct(totalJoined, total)}) got people talking or playing.`,
    `People replied directly to a bot **${totalReplies}** time${totalReplies === 1 ? "" : "s"}; the bots thanked them **${acks}** time${acks === 1 ? "" : "s"}.`,
    "",
  ];
  for (const kind of ORDER) {
    const n = started[kind] ?? 0;
    if (!n) continue;
    const j = joined[kind] ?? 0;
    const r = replies[kind] ?? 0;
    lines.push(`• ${KIND_NAMES[kind]}: ${n} started, ${j} engaged (${pct(j, n)}), ${r} direct repl${r === 1 ? "y" : "ies"}`);
  }
  const hours = Object.entries(summary.byHour ?? {})
    .filter(([, h]) => h.started >= 5)
    .map(([hour, h]) => ({ hour: Number(hour), started: h.started, rate: h.joined / h.started }));
  if (hours.length >= 2) {
    const best = hours.reduce((a, b) => (b.rate > a.rate ? b : a));
    lines.push(`⏰ Best hour to start (the bots' time zone): **${String(best.hour).padStart(2, "0")}:00**, ${pct(Math.round(best.rate * best.started), best.started)} engaged over ${best.started} tries.`);
  }
  if (adaptive && weights) {
    const moved = Object.entries(weights)
      .filter(([, w]) => Math.abs(w - 1) >= 0.15)
      .sort((a, b) => b[1] - a[1])
      .map(([kind, w]) => `${KIND_NAMES[kind] ?? kind} ×${w.toFixed(1)}`);
    lines.push(moved.length ? `🎯 Adaptive tuning is on: picking ${moved.join(", ")} compared with the default mix.` : "🎯 Adaptive tuning is on: no kind stands out yet, so the default mix is used.");
  } else if (!adaptive) lines.push("🎯 Adaptive tuning is off.");
  if (triviaAnswers) lines.push("", `🧠 Trivia: ${triviaAnswers} answers, ${triviaCorrect} correct (${pct(triviaCorrect, triviaAnswers)}).`);
  lines.push(
    "",
    "*Engaged means someone wrote in the channel (or pressed an answer button) while the conversation was running. Votes in polls are not visible to the bots, so polls can look quieter than they are.*",
  );
  return lines.join("\n");
}

/** Leaderboard lines: "1. <@id>: 5 points". */
export function formatTop(entries, title, unit = ["point", "points"]) {
  const medal = (i) => ["🥇", "🥈", "🥉"][i] ?? `**${i + 1}.**`;
  return `**${title}**\n${entries.map((e, i) => `${medal(i)} <@${e.userId}>: ${e.points} ${unit[e.points === 1 ? 0 : 1]}`).join("\n")}`;
}

/** What happened in the week before the Monday `day`: gathers the numbers the recap needs. */
export function collectRecap({ usage, scores, hours, guildId, day }) {
  const sum = usage.summary(guildId, dayRange(day, 2)[1], 7); // the 7 days that end yesterday
  const lastWeek = dayRange(day, 8)[7]; // a day of the previous week, which is how the boards pick a week
  return {
    convos: sum.total,
    joined: sum.totalJoined,
    triviaAnswers: sum.triviaAnswers,
    triviaCorrect: sum.triviaCorrect,
    topPlayer: scores.top(guildId, { day: lastWeek, limit: 1 })[0] ?? null,
    topVoice: hours.top(guildId, { day: lastWeek, limit: 1 })[0] ?? null,
  };
}

const fillText = (template, values) => String(template ?? "").replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");

/**
 * The weekly recap post. `lines` is the `tools` bank of a language and `data` is
 * { convos, joined, triviaAnswers, triviaCorrect, topPlayer: {userId, points}|null, topVoice: {userId, points}|null }.
 */
export function formatRecap(lines, data) {
  const parts = [`**${lines.recapTitle}**`];
  if (!data.convos && !data.topPlayer && !data.topVoice) parts.push(lines.recapQuiet);
  else {
    if (data.convos) parts.push(fillText(lines.recapConvos, { n: data.convos, j: data.joined }));
    if (data.triviaAnswers) parts.push(fillText(lines.recapTrivia, { a: data.triviaAnswers, c: data.triviaCorrect }));
    if (data.topPlayer) parts.push(fillText(lines.recapTop, { user: `<@${data.topPlayer.userId}>`, points: data.topPlayer.points }));
    if (data.topVoice) parts.push(fillText(lines.recapVoice, { user: `<@${data.topVoice.userId}>`, minutes: data.topVoice.points }));
    parts.push(lines.recapOutro);
  }
  return parts.join("\n");
}

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** The list shown by /companions content list. */
export function formatContentList(kind, entries) {
  if (!entries.length) return `You have not added any ${kind}s yet. Use \`/companions content add-${kind}\`.`;
  const line = (e, i) => {
    const body = kind === "joke" ? `${e.setup} → ${e.punchline}` : kind === "poll" ? `${e.question} (${e.options.join(" / ")})` : e.text;
    return `**${i + 1}.** ${truncate(body, 110)}`;
  };
  const shown = entries.slice(0, 20).map(line);
  if (entries.length > 20) shown.push(`… and ${entries.length - 20} more`);
  return `**Your ${kind}s (${entries.length})**\n${shown.join("\n")}\nRemove one with \`/companions content remove kind:${kind} number:<n>\`.`;
}

export const hoursText = (ms) => (ms >= 3_600_000 ? `${(ms / 3_600_000).toFixed(1)} hours` : `${Math.max(1, Math.round(ms / 60_000))} minutes`);
