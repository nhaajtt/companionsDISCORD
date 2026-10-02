// Entry point of the companion bots: `node src/index.js` (or `docker compose up -d`).
import "dotenv/config";
import path from "node:path";
import { startCompanions } from "./runtime.js";
import { createSettingsStore, validTimeZone } from "./settings.js";

const tokens = (process.env.COMPANION_TOKENS ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

if (tokens.length < 2) {
  console.error("Set COMPANION_TOKENS to at least two bot tokens separated by commas (up to 10). See .env.example.");
  process.exit(1);
}
if (tokens.length > 10) console.warn(`Only the first 10 of the ${tokens.length} tokens are used.`);

const timezone = process.env.COMPANION_TIMEZONE || process.env.TIMEZONE || "Asia/Ho_Chi_Minh";
if (!validTimeZone(timezone)) {
  console.error(`"${timezone}" is not a valid time zone name (for example Asia/Ho_Chi_Minh or Europe/London).`);
  process.exit(1);
}

const store = createSettingsStore(path.join(process.env.COMPANION_DATA_DIR || "data", "companions.json"));
let stop;
try {
  ({ stop } = await startCompanions({ tokens: tokens.slice(0, 10), store, timezone }));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    console.log(`Got ${signal}, shutting the companions down.`);
    await stop();
    process.exit(0);
  });
}
process.on("unhandledRejection", (error) => console.error("Unhandled rejection:", error));
