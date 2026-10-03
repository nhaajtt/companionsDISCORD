// Entry point of the companion bots: `node src/index.js` (or `docker compose up -d`).
import "dotenv/config";
import path from "node:path";
import { createAi } from "./ai.js";
import { createAlerter } from "./alerts.js";
import { backupData } from "./backup.js";
import { createCustomStore } from "./custom.js";
import { startCompanions } from "./runtime.js";
import { createReminderStore } from "./reminders.js";
import { createScoreStore } from "./scores.js";
import { createSettingsStore, localParts, validTimeZone } from "./settings.js";
import { createStatusServer } from "./status.js";
import { createUsageStore } from "./usage.js";

const MAX_BOTS = 30;
const tokens = (process.env.COMPANION_TOKENS ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

if (tokens.length < 2) {
  console.error("Set COMPANION_TOKENS to at least two bot tokens separated by commas (up to 30). See .env.example.");
  process.exit(1);
}
if (tokens.length > MAX_BOTS) console.warn(`Only the first ${MAX_BOTS} of the ${tokens.length} tokens are used.`);

const timezone = process.env.COMPANION_TIMEZONE || process.env.TIMEZONE || "Asia/Ho_Chi_Minh";
if (!validTimeZone(timezone)) {
  console.error(`"${timezone}" is not a valid time zone name (for example Asia/Ho_Chi_Minh or Europe/London).`);
  process.exit(1);
}

const dataDir = process.env.COMPANION_DATA_DIR || "data";
const store = createSettingsStore(path.join(dataDir, "companions.json"));
const usage = createUsageStore(path.join(dataDir, "usage.json"));
const scores = createScoreStore(path.join(dataDir, "scores.json"));
const custom = createCustomStore(path.join(dataDir, "custom.json"));
const hours = createScoreStore(path.join(dataDir, "voice.json"));
const reminders = createReminderStore(path.join(dataDir, "reminders.json"));
const alerter = createAlerter({ url: process.env.ALERT_WEBHOOK_URL });
if (alerter.enabled) console.log("Alerts are on: problems are sent to ALERT_WEBHOOK_URL.");

// Optional Gemini features (answers when mentioned, a daily riddle). Off unless a key is set.
const ai = createAi({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || undefined, dailyLimit: Number(process.env.AI_DAILY_LIMIT) || undefined, log: console.log });
if (ai) console.log(`AI features are available (model ${ai.model}); each server still has to turn them on.`);

// A daily copy of the data files (the newest 7 days are kept)
const backupNow = () => {
  try {
    const copied = backupData(dataDir, localParts(Date.now(), timezone).day);
    if (copied.length) console.log(`Backed up ${copied.length} data file${copied.length === 1 ? "" : "s"} to ${dataDir}/backups.`);
  } catch (error) {
    console.error("Could not back up the data files:", error.message);
  }
};
backupNow();
setInterval(backupNow, 3_600_000).unref();

let stop;
let snapshot;
try {
  ({ stop, snapshot } = await startCompanions({ tokens: tokens.slice(0, MAX_BOTS), store, usage, scores, custom, hours, reminders, timezone, alerter, ai }));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

alerter.notify("start", `Started with ${tokens.slice(0, MAX_BOTS).length} bot${tokens.length === 1 ? "" : "s"}.`);

const statusPort = Number(process.env.STATUS_PORT);
if (statusPort > 0) {
  createStatusServer({ snapshot, port: statusPort, host: process.env.STATUS_HOST || "127.0.0.1" });
  console.log(`Status endpoint on port ${statusPort}: /status.json`);
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    console.log(`Got ${signal}, shutting the companions down.`);
    await stop();
    process.exit(0);
  });
}
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  alerter.notify("unhandled", `Unhandled error: ${error?.message ?? error}`);
});
