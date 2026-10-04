# Changelog

## 4.8

- Four new personalities for bots 24 to 27, replacing Sizzle, Gizmo, Anchor and Jinx: Lai Bâng, Six, Trường Giang and Nhã Phương, each with its own lines and 25 notes in both languages. Lai Bâng and Six are a couple; Trường Giang adores Nhã Phương, who is comically annoyed by him.
- Genders settled: every bot is a girl except Lai Bâng and Trường Giang. furyZ and Chamy are no longer a couple but close best friends, and their notes were rewritten to match.
- Lines shared by all bots (welcomes, goodbyes, reminders, Pomodoro steps) no longer use gendered address such as sir, he or she, and say "you" or "everyone" instead of assuming who is listening.
- README, the cast table and the website list all 30 personalities.

## 4.7

- Devlog (website in both languages, and `docs/devlog.md`) rewritten with the Raspberry Pi 5 deployment, the difficulties and how they were solved, the later additions and a lessons section.
- `/assemble [bots]` calls the companions to the voice channel you are in, and `/random [bots]` sends them to random voice channels they can connect to. Both replace the saved voice rooms (the bots stay where they were sent), empty the old rooms, need the Move Members permission by default and are limited to once a minute per server. Tests for both.

## 4.6

- Optional Gemini features, off by default and only when `GEMINI_API_KEY` is set: `/companions ai replies` (a companion answers, in its own personality and still as a bot, when someone mentions it or replies to it in the companions channel) and `/companions ai daily` (a riddle with a hidden answer, a question or a would-you-rather written once a day). A cooldown per member, a daily cap and a per-minute cap keep it polite, the model output is cleaned (no mentions, no links), and nothing about the member is sent except the message text. README, docs, privacy page and website say plainly that this mode sends that one message to Google.

## 4.5

- `/companions voice camera enabled`: the companions sitting in a voice room show a "camera on" sign under their name and one of them announces it in the chat. It is only a sign, bots cannot send real video. English and Vietnamese lines, a test, and the website's voice section updated.

## 4.4

- A devlog page on the website in both languages, and a longer devlog in the docs.
- Wording and counts brought in line with 30 bots; project marked finished.

## 4.3

- Each personality speaks its own lines when it welcomes a new member, greets or says goodbye to someone in the voice room, and delivers a reminder: 20 lines per purpose per language for each of the 30 personalities. The bot that speaks is one of those sitting in the room.
- About 960 more trivia questions per language (geography, animals, nature, space, the body, science, history, inventions, computers and games, movies, music and art, food, sports, language, math, Vietnam, mythology, everyday facts), each checked by a second reader. Trivia now has about 1,250 questions per language.

## 4.2

- About 1,000 spoken lines per language for each purpose: welcome, voice greeting, voice goodbye (new: when someone who stayed 20 minutes or more leaves), reminders, and 500 each for the start, break, work and done steps of a focus session.
- furyZ (Valorant gamer) and Chamy (her close best friend) for bots 22 and 23, with matching notes about their friendship.

## 4.1

- Up to 30 bots instead of 10. 21 new personalities (Rex, Maple, Rocket, Zip, Clue, Mochi, Waffle, Tofu, Ziggy, Echo, Misty, Byte, furyZ, Chamy, Sizzle, Gizmo, Anchor, Jinx, Quill, Blip, Sparky), each with its own lines and 25 notes in both languages.
- Logging in a few bots at a time, and lighter caches per bot, so 30 bots stay small.
- Each companion has a funny note under its name from the moment it starts.

## 4.0

- Each companion shows a note under its name from the moment it starts: 25 funny notes per personality in both languages, rotating every 15 minutes; people in the voice room and focus sessions take over when they happen.
- Seasonal packs: Halloween, Christmas, New Year, Tet, Valentine, in English and Vietnamese.
- Weekly recap on Monday mornings, trivia streaks with milestone shout-outs, voice regular announcements.
- Adaptive tuning of the kinds of conversation per server, and the best hour in `/companions stats`.
- Optional webhook alerts and a daily backup of the data files.
- Per-server data export and delete, automatic clean-up a day after every companion left a server.
- Ticks never overlap; a test covers 300 servers.
- CI, a multi-architecture image on GitHub Container Registry, issue templates.

## 3.0

- Companions sit in voice rooms 24/7: several rooms, bots that keep their room, "join to create" channels, no mute icon.
- Pomodoro focus sessions, greetings in voice, voice time board.
- Welcome messages with an icebreaker, reminders and event countdowns.
- Optional status endpoint, architecture notes, cinematic bilingual website.

## 2.0

- Question of the day, polls, trivia with answer buttons and a weekly board.
- `/companions stats`, custom content, nine personalities, about 1,250 fun facts per language.

## 1.0

- Two to ten small bots that chat, joke and share facts, and step back when people talk.
