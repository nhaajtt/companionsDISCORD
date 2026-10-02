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

## Still open

- It has not run against a live Discord server yet. Timing and content will need tuning after a few days of watching.
- Only English and Vietnamese content exist.
- Replying with something that reacts to what a person actually wrote would need a language model behind it, with its cost and content safety questions. Not planned yet.
