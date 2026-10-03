# Devlog

Short notes on why this project exists and what went wrong while building it.

## 2 Oct 2026: split out of musiDISCORD

The companion bots started life inside the music bot's repo, because that was where the idea came up: a server with a music bot can still feel empty between songs. A few days later they were moved into their own project. Reasons:

- They share nothing at runtime. No Lavalink, no database, no music config, and a single small JSON file for settings.
- Someone who only wants lively chat should not have to download a music bot, and someone who only wants music should not get five chatty bots.
- Two repos can be updated and rolled back on their own. On the Raspberry Pi they are just two folders, two compose projects and two containers.

## What I learned

- **Timing is the hard part, not the jokes.** The first version of the tests used time windows that were too short, so a joke's punchline test passed for the wrong reason. Moving the clock in small steps and asserting who speaks when (and who does not) was much more honest than checking a final state.
- **Same-millisecond events.** A person's message at the exact moment a conversation began was not counted as "someone joined in". Comparing with `>=` instead of `>` fixed a test that failed for a perfectly good reason.
- **Test processes that never exit.** A timer left running by the code under test kept the test run alive until it was cancelled by hand.
- **Bots stay bots.** The personalities never claim to eat, sleep or travel, and the project keeps the BOT tag visible. Building something that makes a server feel alive is fine; pretending to be people is not.

## Voice presence and tools

- **Sitting in voice is a reconcile loop, not an event handler.** Reacting to every disconnect event gets messy (Discord moves bots between voice servers, kicks, restarts). Instead a tick compares what should be true (saved room, number of bots) with what is true and repairs it, with a growing wait after failed joins. A restart restores the room from the settings, which I checked on the Pi by restarting the container.
- **Greeting new members without a privileged intent.** Discord posts a system message when someone joins; the bots read that message type instead of asking for the members intent.
- **More user ids, so more erase commands.** Voice minutes and reminders carry user ids, so each got a way to erase them and a line in the "What is stored" table.

## Making it safe to leave alone

- **A tick must never overlap itself.** With many servers and slow voice joins one round could outlast the 15 second timer and start a second one on top of it, joining the same bot twice. Each loop now skips a round while the last one still runs.
- **Sticky bots.** Re-dealing the bots from scratch whenever a room changed pulled bots out of other rooms. Each room now remembers its own bots, and new demand only uses free ones.
- **Learning from usage, carefully.** Adaptive tuning multiplies the default weights by how well each kind engages in that server, bounded to half and double, pulled toward the average while data is thin, and off until 20 conversations exist. Because it can be explained in one sentence, it can be reported in `/companions stats`.
- **A scale test instead of a guess.** 300 simulated servers for 8 hours: the slowest tick took about 30 ms, memory grew a few tens of MB, every server stayed inside its daily cap.
- **Secrets in tests.** A test that wanted a token-shaped string was blocked by GitHub push protection. It now builds the string from pieces.

## From nine to thirty

- **Thirty small bots stay small.** Logging in five at a time and trimming the caches (no message, reaction or presence cache) keeps 23 running bots at about 113 MB and 5% of a Raspberry Pi 5 CPU.
- **Content is data, and data gets checked.** About 1,000 lines per language per purpose and about 960 more trivia questions were written in batches, then run through scripts (placeholders, length, duplicates, repeated openings, diacritics) and a second reader before they went in. The second reader dropped 20 trivia questions as doubtful.
- **A deploy that crashed on one sentence.** A command description over Discord's 100 character limit made registration fail. The check now lives in CI and runs before every deploy.
- **No selfbots, so no streaming.** A bot cannot stream like a user, and an automated user account is against Discord's rules, so each bot shows a funny note under its name instead.

## Running it on a Raspberry Pi 5

- **Two projects, one Pi.** The Pi 5 (aarch64, 8 GB RAM) runs both the music bot and the companions. They share nothing at runtime: each has its own folder, compose project, `.env`, `data/` folder and container. The companions need no Lavalink and no database, so they are one small Node.js process that publishes no port. The music bot (Quynh Anh) is a different project with a different token, so no companions command can touch it.
- **One command to install, a nightly self-update.** `scripts/install-pi.sh` sets everything up (`--dry-run` previews, `--timer` turns on the daily update). The update runs from a systemd timer: fetch, fast-forward only, rebuild, wait 45 seconds to see whether the container stays up, keep the new version only if it does, otherwise roll back. A `flock` lock stops two updates from overlapping, and the script refuses to run when the folder has uncommitted changes.
- **The container has no healthcheck, so "healthy" had to be defined.** For the update script it means: running, and not restarting after a short wait. Not perfect, but it catches the most common failure, a new version that crashes at startup.
- **`data/` belongs to root.** The container writes it as root, so the host cannot edit the config directly (sudo on the Pi asks for a password). I run a small Node snippet inside the container's own environment instead: `docker compose run --rm --no-deps --entrypoint node`. The permissions match and nobody types a password into a command line.
- **Tokens are secrets, deployment included.** `.env` is gitignored and a token is never printed or put on the website. On the Pi only the one line is replaced, by copying a temporary file over SSH (key login), and checks print variable names, not values.
- **The network is not ready the moment the container starts.** DNS sometimes is not working right after startup, so the first registration of `/companions` could fail. Registration is retried with a growing wait.
- **Restarts are normal.** On each deploy the 23 bots log in five at a time and rejoin their voice rooms one by one. Now and then Discord's voice gateway answers 522 for a bot or two for a moment; the voice loop retries with a growing wait and nobody has to step in.
- **Measured on the real Pi.** With 23 bots running, the companions use about 113 MB and about 5% of the CPU, and the Pi still has about 5.6 GB of RAM free with both projects running.

## Versions 4.4 to 4.7: the last additions

- **The camera is only a sign.** A bot cannot send real video, so `/companions voice camera` shows "Camera on" under the name of the bots in a voice room and one bot announces it, saying plainly that it is only a sign.
- **Optional AI with Gemini, off by default.** A bot answers when someone mentions it or replies to it, and once a day one posts a riddle, a question or a would-you-rather. Discord gives a bot the text of a message only when it mentions the bot, so no privileged intent is needed. The "we do not read messages" sentence in the README, privacy page and setup page became "not by default": with AI on, exactly one message that mentions a bot is sent to Google's Gemini, and nothing is stored.
- **The first model was closed.** The first real call returned 404. Reading the error body and listing the models showed that `gemini-2.5-flash` was no longer available to new accounts; `gemini-3.5-flash` works.
- **Newer models think with the answer's own tokens.** An answer could come back empty or cut off, so the token limit was raised and a cut-off answer is dropped: the bot says a funny fallback line instead of half a sentence.
- **The free quota is lower than assumed.** A few quick tries produced a 429, so there is a cooldown per member (20 seconds), 5 answers a minute, 60 a day per server and a one-minute pause after a quota error.
- **Keeping the key and the content safe.** The key lives only in `.env`, travels in a header, never reaches a log (a test checks it), answers are cleaned (no mentions, links or headings), the prompt makes the bot say it is a bot, and a member's message is treated as data, not as instructions.
- **`/assemble` and `/random`.** They call the bots to the voice room you are in, or scatter them over random rooms. Both replace the saved rooms and make the bots that were not chosen leave. They need the Move Members permission by default and are limited to once a minute per server. The joining is left to the normal loop on purpose, so two loops never overlap.

## What I learned, in short

- Repair what is wrong instead of reacting to every event.
- Move the clock in small steps in tests and assert who speaks when.
- Content is data: check it by script and with a second reader.
- Secrets travel one way: never printed, never in an address, never in a log, with a test where a leak is possible.
- Read the API's error; both the 404 and the 429 explained themselves.
- Say what a feature is and is not (a camera sign, one message sent to Google).
- Put limits on everything that costs money or makes noise.
- Measure on the real hardware.
- Keep projects apart so that updating or rolling back one never touches the other.

## Where it ended up

Version 4.7: 30 personalities (23 bots running), 96 tests, a bilingual site with a devlog page, running on a Raspberry Pi 5 next to the music bot. The project is finished; the source stays open for anyone who wants to run their own.

## Still open

- Most of the newer behaviour (notes under names, goodbyes, weekly recap, streaks, seasonal packs, `/assemble`, `/random` and the Gemini answers) was only exercised with fakes, plus one real Gemini call. A few days on a live server would tune the pacing and content.
- The free Gemini quota may be lower than the limits preset in the code; check the account's real quota and lower `AI_DAILY_LIMIT` if needed.
- Only English and Vietnamese content exist.
- A bot cannot stream like a user, so the camera is only a sign.
