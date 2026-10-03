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

## Where it ended up

Version 4.3: 30 personalities, 84 tests, a bilingual site with a devlog page, running on a Raspberry Pi 5 next to the music bot. The project is finished; the source stays open for anyone who wants to run their own.

## Still open

- Most of the newer behaviour (notes under names, goodbyes, weekly recap, streaks, seasonal packs) was only exercised with fakes. A few days on a live server would tune the pacing and content.
- Only English and Vietnamese content exist.
- Replying with something that reacts to what a person actually wrote would need a language model behind it, with its cost and content safety questions. Not planned.
