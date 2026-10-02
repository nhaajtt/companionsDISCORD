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
export function formatStats(summary) {
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
