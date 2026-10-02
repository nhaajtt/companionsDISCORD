// Content added by a server's managers with /companions content ...: extra questions, jokes, facts and polls that are
// mixed into the built-in banks for that server only.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export const MAX_PER_KIND = 100;
export const MAX_TEXT = 300;
export const KINDS = ["question", "joke", "fact", "poll"];
const KEY = { question: "questions", joke: "jokes", fact: "facts", poll: "polls" };

/** Collapses whitespace and strips anything that could ping people. Returns "" when nothing usable is left. */
export function cleanText(text, max = MAX_TEXT) {
  return String(text ?? "")
    .replace(/@(everyone|here)/gi, "")
    .replace(/<[@#&!][^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export class CustomError extends Error {}

export function createCustomStore(file) {
  let data = {};
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`Could not read ${file}, starting with no custom content:`, error.message);
  }

  function save() {
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (error) {
      console.error("Could not save custom content:", error.message);
    }
  }

  const bucket = (guildId, kind) => {
    const guild = (data[guildId] ??= { next: 1 });
    return (guild[KEY[kind]] ??= []);
  };

  return {
    /** Forgets everything a server added. */
    forgetGuild(guildId) {
      if (!(guildId in data)) return false;
      delete data[guildId];
      save();
      return true;
    },

    /** What a server added, as plain data (for the export). */
    exportGuild: (guildId) => JSON.parse(JSON.stringify(data[guildId] ?? {})),

    list: (guildId, kind) => [...(data[guildId]?.[KEY[kind]] ?? [])],
    count: (guildId) => KINDS.reduce((sum, kind) => sum + (data[guildId]?.[KEY[kind]]?.length ?? 0), 0),

    /** Adds an entry. `fields` depend on the kind: question {text}, joke {setup, punchline}, fact {text}, poll {question, options[]}. */
    add(guildId, kind, fields) {
      if (!KINDS.includes(kind)) throw new CustomError("Unknown kind of content.");
      let entry;
      if (kind === "joke") {
        entry = { setup: cleanText(fields.setup), punchline: cleanText(fields.punchline) };
        if (entry.setup.length < 5 || entry.punchline.length < 2) throw new CustomError("A joke needs a setup (at least 5 characters) and a punchline.");
      } else if (kind === "poll") {
        const options = [...new Set((fields.options ?? []).map((o) => cleanText(o, 55)).filter(Boolean))];
        entry = { question: cleanText(fields.question, 300), options };
        if (entry.question.length < 5) throw new CustomError("A poll needs a question (at least 5 characters).");
        if (options.length < 2 || options.length > 4) throw new CustomError("A poll needs between 2 and 4 different options.");
      } else {
        entry = { text: cleanText(fields.text) };
        if (entry.text.length < 10) throw new CustomError("That is too short, write at least 10 characters.");
      }

      const list = bucket(guildId, kind);
      if (list.length >= MAX_PER_KIND) throw new CustomError(`You already have ${MAX_PER_KIND} of those. Remove some first.`);
      const guild = data[guildId];
      entry.id = `c${guild.next++}`;
      list.push(entry);
      save();
      return entry;
    },

    /** Removes the entry at `position` (1-based, as /companions content list shows it). Returns the removed entry or null. */
    remove(guildId, kind, position) {
      const list = bucket(guildId, kind);
      if (!Number.isInteger(position) || position < 1 || position > list.length) return null;
      const [removed] = list.splice(position - 1, 1);
      save();
      return removed;
    },

    /** The built-in bank for a language plus this server's own entries. */
    merge(bank, guildId) {
      const own = data[guildId];
      if (!own) return bank;
      return {
        ...bank,
        questions: [...bank.questions, ...(own.questions ?? []).map((q) => ({ id: q.id, text: q.text, answers: [] }))],
        riddles: [...bank.riddles, ...(own.jokes ?? []).map((j) => ({ id: j.id, setup: j.setup, punchline: j.punchline }))],
        facts: [...bank.facts, ...(own.facts ?? []).map((f) => ({ id: f.id, text: f.text }))],
        polls: [...(bank.polls ?? []), ...(own.polls ?? []).map((p) => ({ id: p.id, question: p.question, options: p.options }))],
      };
    },
  };
}
