// Prints (or opens) the invite link of every companion bot listed in .env, so adding them to a new server is quick.
//   npm run invites            print the links
//   npm run invites -- --open  also open each link in your browser, one after another
// Discord has no way to invite several bots at once, so this is the closest thing: one click per bot.
import "dotenv/config";
import { execFile } from "node:child_process";

const PERMISSIONS = 101376; // View Channel, Send Messages, Read Message History
const NAMES = ["Pip", "Grumble", "Nova", "Sage", "Bean", "Diva", "Dog", "Dog 2", "Cow"];

const tokens = (process.env.COMPANION_TOKENS ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

if (!tokens.length) {
  console.error("COMPANION_TOKENS is empty. Fill it in .env first.");
  process.exit(1);
}

/** A bot token starts with the bot's Application ID (base64) before the first dot. */
function applicationId(token) {
  try {
    const id = Buffer.from(token.split(".")[0], "base64").toString("utf8");
    return /^\d{15,22}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const link = (id) => `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot%20applications.commands&permissions=${PERMISSIONS}`;

const bots = tokens.map((token, i) => ({ slot: i + 1, name: NAMES[i % NAMES.length], id: applicationId(token) }));
const bad = bots.filter((b) => !b.id);
if (bad.length) console.error(`Could not read the Application ID of token number ${bad.map((b) => b.slot).join(", ")}; skipped.`);

const good = bots.filter((b) => b.id);
for (const b of good) console.log(`Bot ${b.slot} (personality: ${b.name})\n   ${link(b.id)}`);

// A bookmarkable link for the website's invite helper: it contains only the public Application IDs, never tokens
const site = `https://companionsdiscord.vercel.app/invite.html#ids=${good.map((b) => b.id).join(",")}`;
console.log(`\nBookmark this to find them all again (IDs only, no tokens):\n${site}`);

if (process.argv.includes("--open")) {
  const opener = process.platform === "win32" ? ["cmd", ["/c", "start", ""]] : process.platform === "darwin" ? ["open", []] : ["xdg-open", []];
  console.log("\nOpening each link; authorize them one by one...");
  for (const b of good) {
    execFile(opener[0], [...opener[1], link(b.id)], () => {});
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
