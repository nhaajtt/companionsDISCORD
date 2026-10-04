# Changelog

## 4.15

- The bots are called by their Discord names, read live while the program runs (Developer Portal, application name), so renaming a bot needs no change in the code. The personalities keep their working names (Pip, Chamy...) only inside the files. A line that names a bot, whether the bot names itself ("Maple gives up") or another bot ("Chamy teased me"), shows the current Discord name; the gossip scenes, the mood board, the notes under the names and the Gemini answers do the same. Only the names that really appear inside lines are swapped, as whole words, so ordinary words like dog or cow are never touched.

## 4.14

- Every bot has a mood for the whole day (happy, grumpy, sleepy, excited, dreamy, lazy), worked out from the date and the bot's number, so it is the same all day and after a restart; Grumble leans grumpy, Pip and Rocket lean cheerful. One status note in six shows the mood (184 new notes), and `/tamtrang` shows everyone's mood.
- `/companions chaohoi enabled`: every day two or three bots say good morning (when the quiet hours end) and good night (the hour before they start) as a little chain of threaded replies, the first bot in its mood of the day. The moment is fixed per server and day, 312 new lines.
- `/companions reactions enabled`: now and then one bot leaves a warm reaction on a member's message in the chat channel (at most one in about eight messages, once every two minutes). It needs Add Reactions; an owner still gets the shy reactions.
- `/lamsong [emoji]`: a stadium wave of emoji across up to nine bots, with a chant from the one in the middle (and the player's name when given).
- `/sinhnhat set`, `remove` and `list` with `/companions sinhnhat enabled`: a member saves their own birthday (day and month, never a year); on the day six to eight bots sing in the chat channel, the first one pinging the person, from 9:00 and outside quiet hours. 29 February is celebrated on the 28th in a year without a 29th. The date is erased with `/sinhnhat remove` or with the rest of the server's data. `birthdays.json` is the fourth file that holds user ids, and the privacy page says so.

## 4.13

- More than a thousand new lines for `/khen`, `/hype` and the cheering on Go Live, funny and affectionate at once: skill hype, fake news bulletins and world records, tender and proud ones ("drink some water, we are proud of you"), absurd everyday comparisons, dramatic threats and bargaining, about a hundred sweet fangirl lines for the girls, lines with the player's name, lines in the voice of the two boys (Lai Bâng doting, Trường Giang the show host) and about 250 English lines. The bots now pick from about five hundred Vietnamese lines per girl instead of thirty-eight, so a long `/hype` session does not repeat itself for a very long time. Tests check that no line appears twice, not even in the `/che`, `/clutch` and `/fail` banks.

## 4.12

- `/tamchuyen [chude]` and `/companions tamchuyen enabled`: the companions chat among themselves like friends in a group chat. 56 scenes in both languages (generic topics for any girl bots, the relationship web of bots 22 to 27, the clash of the older personalities, and scenes about the owner). Each scene has 3 to 5 bots, 6 to 10 lines, real threaded replies, human pauses, and bots that name and tease each other. Boys only appear in scenes written for them. A server remembers the last 60 scenes it saw and does not repeat one until it has seen the rest. On their own, group chats start 1, 2 or 4 times a day (calm, normal, lively) between 10:00 and 22:00, outside quiet hours, at least 90 minutes apart and at a random moment.
- `/dudoan start` and `/dudoan result`: members bet with Thắng or Thua buttons on the player's next round, some companions bet out loud, the counts update live, and the result lists who was right (names only) while the bets get their reactions. Kept in memory only.
- `/companions autohype enabled`: when someone starts a Go Live stream in voice, the companions cheer in the chat channel by themselves until the stream ends (at most an hour, never in quiet hours).
- Shy reactions: when the bots have the Add Reactions permission (the invite links ask for it now), now and then one of them reacts to an owner's message in the chat channel and takes it back a few seconds later. Nothing happens without the permission.
- About one note in three under a bot's name now follows the time of day (morning, noon, afternoon, evening, night, late night and the weekend), and the notes of the first nine bots were rewritten to sound like a real person.
- The bots' time zone on the Raspberry Pi is now Vietnam time (`COMPANION_TIMEZONE=Asia/Ho_Chi_Minh`), so quiet hours, the evening scene and the Monday recap follow Vietnamese hours.

## 4.11

- The note under a bot's name no longer says "Sitting in voice with N people" (every bot showed the same line whenever someone was in the room). Bots now always show their own funny notes, one new one every 15 minutes; only a running focus session (or the camera sign) replaces them.

- `/clutch` (every companion goes wild for a clutch play) and `/fail` (comfort, with a little teasing, after a fail): the same options as `/khen`, with their own lines in both languages.
- `/hype start [minutes] [mood]` and `/hype stop`: the companions keep cheering on their own for 5 to 60 minutes (default 15), one bot every 20 to 45 seconds, with praise, teasing or a mix. One session per channel, at most 60 messages.
- `/tranhluan a b`: the companions split into two camps and argue playfully about a or b, then one gives a verdict.
- `/drama [couple]` and `/companions drama enabled`: short scenes between Lai Bâng and Six, Trường Giang and Nhã Phương, and furyZ and Chamy, on demand or once every evening (19:00 and later, outside quiet hours).
- `/khen-top`: the most cheered and most teased names of the week. Only names are kept (never IDs), only for the current week, in `praise.json`, and they are erased with the rest of the server's data.
- `OWNER_IDS` can carry a shyness level per owner (`id:1`, `id:2`, `id:3`). Level 2, the default, softens the goodbye after 45 minutes in the voice room; level 3 is soft from the start; level 1 never softens. The soft lines still half deny it.
- The new commands share the 20 second wait per channel with `/khen`.

## 4.10

- `/khen` and `/che` have a `nguoi` option to pick the player from the server: the bots say that member's name. Typing an @mention in `ten` also turns into the member's name; before, only the numeric ID was left.

- `/che`: the same options as `/khen`, but every companion teases the player a little instead (a friendly roast about the play, never about looks or anything personal). A channel can use `/khen` or `/che` once every 20 seconds.
- `OWNER_IDS` in `.env` (comma separated Discord user IDs): to an owner the companions act shy. They pretend not to care and secretly like them, in the welcome, voice greetings, goodbyes and reminders (about 85 percent of the time, so it never becomes a script) and, with Gemini on, in the answers. Everyone else gets the normal warm lines, and the Gemini answers are told to be delighted. Girls say em, the two boys say tui. Nothing changes while the list is empty.

## 4.9

- `/khen`: every companion cheers on the player in the channel where the command is typed, one different line each, a few seconds apart ("anh hay quá", "anh giỏi quá" and more). Options: `goi` (anh, chị or bạn), `ten` (a name to say) and `language` (Tiếng Việt by default, or English). The girls call themselves em and the two boys say tui; it works in any channel the bots can write in, wherever they sit in voice. Once every 20 seconds per channel.

## 4.8

- Four new personalities for bots 24 to 27, replacing Sizzle, Gizmo, Anchor and Jinx: Lai Bâng, Six, Trường Giang and Nhã Phương, each with its own lines and 25 notes in both languages. Lai Bâng and Six are a couple; Trường Giang adores Nhã Phương, who is comically annoyed by him.
- Genders settled: every bot is a girl except Lai Bâng and Trường Giang. furyZ and Chamy are no longer a couple but close best friends, and their notes were rewritten to match.
- Lines shared by all bots (welcomes, goodbyes, reminders, Pomodoro steps) no longer use gendered address such as sir, he or she, and say "you" or "everyone" instead of assuming who is listening.
- README, the cast table and the website list all 30 personalities.
- `/assemble` and `/random` are much faster with 30 bots: they start at once instead of waiting for the next 15 second round, and the bots connect six at a time instead of one after another (the first bot of a room still goes alone, so a join-to-create channel is learned first). A crowd now arrives in well under a minute, and voice rounds can no longer overlap.

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
