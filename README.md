# companionsDISCORD

[![CI](https://github.com/nhaajtt/companionsDISCORD/actions/workflows/ci.yml/badge.svg)](https://github.com/nhaajtt/companionsDISCORD/actions/workflows/ci.yml)

Two to thirty small Discord bots that keep a channel lively. Every so often one of them asks a question, tells a joke or a riddle, shares a fun fact or starts a short chat with another bot. If nobody answers after a few minutes, another bot jumps in. If a person joins the conversation, the bots step back, and they thank anyone who replies to them.

Website: https://companionsdiscord.vercel.app (English and Vietnamese). Made by [nhaajt](https://github.com/nhaajtt). It is a sibling of [musiDISCORD](https://github.com/nhaajtt/musiDISCORD), the self-hosted music bot, and the two can run side by side on the same Raspberry Pi.

**Status: finished (version 4.7).** The story of how it was built, including what went wrong, is in the [devlog](https://companionsdiscord.vercel.app/en/devlog.html) and in [docs/devlog.md](docs/devlog.md).

- **They are open about being bots.** They keep Discord's BOT tag, have 30 distinct personalities and never pretend to be human. They run on normal bot tokens, never a user account.
- **No outside services by default.** English and Vietnamese banks of questions, jokes and riddles, fun facts (about 1,250 in each language, the same ones translated) and bot-to-bot banter are written into the repo. Nothing is sent anywhere, and content is not repeated until the others have been used. The one optional exception is the Gemini mode below.
- **Good manners built in:** one channel you choose, quiet hours (default 23:00 to 08:00 in your time zone), a daily limit, nothing while people are chatting, typing indicators, no pings, and a ten minute cooldown between thank-yous.
- **They do not read message content (unless you switch on the optional AI replies).** They only use the non-privileged `Guilds`, `GuildMessages` and `GuildVoiceStates` intents to notice that someone wrote, replied, or moved in a voice room.
- **They can play, not just talk.** A question of the day at a fixed hour, polls, and trivia rounds with answer buttons and a weekly leaderboard.
- **You can see whether it works.** `/companions stats` shows how many conversations got people talking, and which kinds work best.
- **Your own content.** Managers can add questions, jokes, facts and polls with a command, no redeploy needed.
- **They sit in a voice room 24/7.** One or more companions join a voice channel, stay when everyone leaves and rejoin by themselves if they are dropped or the program restarts. They never speak, play or listen: they are just there, so the room looks lived in.
- **Useful around the room:** a greeting when someone joins the voice room, Pomodoro focus sessions announced in chat, and a voice-time leaderboard.
- **They look alive.** Each companion shows a funny note under its name from the moment it starts (25 per personality in each language, a new one every 15 minutes, starting at a random one), or "Sitting in voice with 3" and "Focus session: 12 min left" when that is happening.
- **Seasons.** Halloween, Christmas, New Year, Tet and Valentine packs of questions, jokes, facts and polls are mixed in on the right days, in both languages.
- **They learn what works.** Adaptive tuning favours the kinds of conversation that get your members talking, and `/companions stats` shows the best hour.
- **A weekly recap, trivia streaks and voice regular titles** give a reason to come back.
- **Safe to leave alone.** Optional webhook alerts, a daily backup of the data files, no overlapping work when many servers are busy, a test with 300 servers, and data export and delete per server.
- **About 1,250 trivia questions per language**, by topic (geography, animals, space, history, science, food, sports, mythology, Vietnam and more), each with four answer buttons. About 960 of them were checked by a second reader and anything doubtful was dropped.
- **Every personality speaks in its own voice** when it welcomes someone, greets or says goodbye in the voice room, and delivers a reminder: the bot that speaks is one of those sitting in the room.
- **Never the same line twice in a row.** About 1,000 different lines per language for each of: welcoming a new member, greeting someone in the voice room, saying goodbye to them, delivering a reminder, and 500 each for the four steps of a focus session (start, break, back to work, done). Written to sound like the community, not translated.
- **Welcome and reminders.** A funny welcome with an icebreaker for new members, `/remind` for personal reminders and `/event` countdowns.

## The cast

| Bot | Personality |
| --- | --- |
| Pip | Cheerful hype bot. Everything is the best thing ever |
| Grumble | Sarcastic grump who secretly cares |
| Nova | Space and trivia nerd |
| Sage | Deadpan philosopher |
| Bean | Chaotic gremlin with spicy takes |
| Diva | Sassy cat who is above all of this, and secretly loves the attention |
| Dog | Loyal, excitable goofball who is thrilled about everything |
| Dog 2 | Easily distracted, snack-obsessed sidekick who means well |
| Cow | Calm pasture philosopher who answers slowly, with a pun |
| Rex | Movie-trailer voice |
| Maple | Cozy adviser |
| Rocket | Countdown optimist |
| Zip | Always in a hurry |
| Clue | Noir detective |
| Mochi | Gentle encourager |
| Waffle | Dumb puns |
| Tofu | Deadpan and very literal |
| Ziggy | Hype DJ |
| Echo | Repeats the last words |
| Misty | Vague prophecies |
| Byte | Glitchy robot |
| furyZ | Valorant gamer, and Chamy's close best friend |
| Chamy | furyZ's close best friend, the two are inseparable |
| Lai Bâng | One of the two male bots, Six's partner |
| Six | Lai Bâng's partner |
| Trường Giang | The other male bot, who adores Nhã Phương |
| Nhã Phương | Comically annoyed by Trường Giang |
| Quill | Pompous professor |
| Blip | Anxious worrier |
| Sparky | Power puns |

Personality is picked by the order of the tokens: the first token is Pip, the second Grumble, and so on up to the ninth, Cow, then Rex (movie-trailer voice), Maple (cozy adviser), Rocket (countdown optimist), Zip (always in a hurry), Clue (noir detective), Mochi (gentle encourager), Waffle (dumb puns), Tofu (deadpan, very literal), Ziggy (hype DJ), Echo (repeats the last words), Misty (vague prophecies), Byte (glitchy robot), furyZ (Valorant gamer), Chamy (furyZ's close best friend), Lai Bâng (token 24), Six (25), Trường Giang (26), Nhã Phương (27), Quill (pompous professor), Blip (anxious worrier) and Sparky (power puns), 30 in all. With fewer bots the first ones are used; a 31st bot would share Pip's personality. Every personality has its own lines and 25 notes in both languages.

Every bot is a girl except Lai Bâng (24) and Trường Giang (26), who are boys. furyZ and Chamy are close best friends. Lai Bâng and Six are a couple, and Trường Giang adores Nhã Phương, who is comically annoyed by him. The lines that all bots share are written to work for any of them, so they never assume a gender.

## How a conversation goes

1. A bot starts: a question, a joke or riddle, a fun fact, or a line of banter.
2. A person may answer. If so, the bots stay out of the way (a joke's punchline is still delivered), and whoever replied to a bot gets a short thank-you after a natural pause.
3. If nobody answers for several minutes, another bot answers or shrugs, a third may react, and the teller of a joke gives the punchline.
4. Then it goes quiet for a good while (normally 1.5 to 4 hours).

Besides those, the bots sometimes post a **poll** (a Discord poll, with a reaction from another bot a few minutes later) or a **trivia round**: a multiple-choice question with four answer buttons (A to D). Every person's first press counts and is locked in privately. After 8 to 15 minutes another bot reveals the answer, lists who got it right (without pinging them), turns the buttons off and adds a point for each person who got it right. `/trivia top` shows the weekly or all-time board. Trivia questions are built from the fun-fact bank, so every answer is backed by a fact in the repo.

## Setup

1. Create 2 to 30 applications in the [Discord Developer Portal](https://discord.com/developers/applications), each with a Bot, and copy each token. No privileged intent is needed.
2. Invite every bot to your server with this link (replace `CLIENT_ID` with that bot's Application ID): `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=562949954538496` (View Channel, Send Messages, Read Message History, Send Polls, Connect).
3. Install, either with the one-command installer on a Raspberry Pi / Debian:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/nhaajtt/companionsDISCORD/main/scripts/install-pi.sh | sh
   ```
   (`sh scripts/install-pi.sh --dry-run` previews it; add `--timer` for daily auto-updates), or by hand:
   ```bash
   git clone https://github.com/nhaajtt/companionsDISCORD.git && cd companionsDISCORD
   cp .env.example .env        # put the tokens, comma-separated, in COMPANION_TOKENS
   docker compose up -d --build
   ```
   Without Docker (Node.js 20 or newer): `npm install && npm start`.
4. In Discord, run `/companions setup channel:#general language:English`. The first bot hosts the command, and you need the Manage Server permission.

   **Adding the bots to another server later:** Discord cannot invite several bots at once, so `npm run invites` prints every invite link from your `.env` (add `-- --open` to open them in your browser one after another) plus a bookmark link for the [invite helper page](https://companionsdiscord.vercel.app/invite.html), which keeps the Application IDs (public, never tokens) in your browser and opens all the links in one click each.

| Command | What it does |
| --- | --- |
| `/companions setup channel [language]` | Choose the channel and language (English or Vietnamese), and turn them on |
| `/companions on \| off` | Turn them on or off |
| `/companions frequency level` | Calm (up to 4 a day), Normal (8) or Lively (14) |
| `/companions quiet from until` | Hours they stay silent |
| `/companions now [kind]` | Start a conversation right away, to test it (optionally a question, riddle, fact, banter, poll or trivia) |
| `/companions status` | Current settings and when the next chat is due |
| `/companions stats [days]` | How many conversations were started, how many got people talking or playing, per kind (default last 7 days) |
| `/companions qotd [hour]` | Post a question of the day every day at that hour (0-23), even during quiet hours; leave the hour empty to turn it off |
| `/companions toggle what enabled` | Turn trivia rounds or polls on or off |
| `/companions voice join channel [bots]` | Add a voice room, or change how many companions sit in a room you already added. A companion keeps its room: a new or bigger room only uses free companions (lowest numbers first) and never takes one from another room |
| `/companions voice leave [channel]` | Remove one room (its companions become free, the other rooms keep theirs) or, with no channel, every room |
| `/companions ai replies enabled` | Optional, needs `GEMINI_API_KEY`. A companion answers, in its own personality, when someone mentions it or replies to it in the companions channel. That one message is sent to Google's Gemini; limits: one answer per member every 20 seconds, 60 a day per server |
| `/companions ai daily enabled` | Optional, needs `GEMINI_API_KEY`. Once a day after 17:00 (outside quiet hours) a companion posts a riddle (answer hidden), a question or a would-you-rather written by Gemini. Sends no member data |
| `/companions ai status` | Which AI features are on and how many answers were used today |
| `/assemble [bots]` | Call the companions to the voice channel you are in (all of them, or `bots` of them); the other voice rooms are emptied and the bots stay there. Needs the Move Members permission by default, once a minute per server |
| `/random [bots]` | Send the companions to random voice channels they can connect to (all of them, or `bots` of them); they stay there until the next `/random`, `/assemble` or `/companions voice join` |
| `/companions voice camera enabled` | Show a "camera on" sign under the name of the companions sitting in a voice room, and have one announce it in the chat. A sign only: bots cannot send real video |
| `/companions voice status \| greet enabled` | See which bot sits in which room, or turn the greetings on or off (a hello when someone joins the room, a goodbye when someone who stayed 20 minutes or more leaves) |
| `/companions welcome enabled` | Greet new members with an icebreaker (needs the server's join messages) |
| `/companions recap enabled` | Every Monday morning (10:00 and later, the bots' time zone) post a short recap of the week before: conversations, trivia champion, most time in voice |
| `/companions titles enabled` | Announce a "voice regular" once when someone spends 5 hours in the voice room in a week (no roles are changed) |
| `/companions toggle adaptive` | Adaptive tuning on or off: kinds of conversation that get people talking in your server are picked more often (up to 2x), the others less (down to half). Needs 20 conversations of history |
| `/companions data export` | Get your server's settings and the content you added as a file |
| `/companions data delete confirm:true` | Erase everything stored about your server. This also happens by itself a day after every companion left the server |
| `/companions content add-question \| add-joke \| add-fact \| add-poll` | Add your own entries for this server (up to 100 of each kind; pings are stripped) |
| `/companions content list kind`, `/companions content remove kind number` | See and remove what you added |

Everyone (not only managers) can use:

| Command | What it does |
| --- | --- |
| `/trivia top [period]` | The trivia leaderboard, this week (default) or all time |
| `/trivia streak` | How many days in a row you have answered a trivia question right (3, 7, 14, 30... days are cheered in the reveal) |
| `/trivia forget` | Erase your own trivia scores from every server |
| `/pomodoro start [work] [break] [rounds]` | A focus session while you sit in the companions' voice room; `stop` and `status` too |
| `/voice top [period]`, `/voice forget` | Who spends the most time in the voice room, and erase your own voice time |
| `/remind add in text` | A companion reminds you in this channel (`in` is like `10m`, `2h`, `1d12h`); `list` and `cancel` too, up to 20 waiting |
| `/event add in name` (managers) | An event countdown announced a day before, an hour before and when it starts; `list` and `cancel` too |

## How it is built

The behaviour lives in plain modules that never touch Discord (injected ports, fake clock in tests); one file adapts them to Discord. See [docs/architecture.md](docs/architecture.md) for the diagram and the design decisions.

## Run the prebuilt image

Tagged releases publish a multi-architecture image (amd64 and arm64, so it runs on a Raspberry Pi 5) to GitHub Container Registry. Put your `.env` in a folder and run:

```bash
docker run -d --name companionsdiscord --restart unless-stopped   --env-file .env -e COMPANION_DATA_DIR=/app/data -v "$PWD/data:/app/data"   ghcr.io/nhaajtt/companionsdiscord:latest
```

## Settings (`.env`)

| Variable | Meaning |
| --- | --- |
| `COMPANION_TOKENS` | 2 to 30 bot tokens, comma-separated (required) |
| `COMPANION_TIMEZONE` | Time zone for quiet hours and the daily limit (default `Asia/Ho_Chi_Minh`) |
| `COMPANION_DATA_DIR` | Where the data files are stored (default `data`; the compose file sets it) |
| `ALERT_WEBHOOK_URL` | Optional Discord webhook. The bots post a short message there when one is offline or a voice bot cannot rejoin for more than 10 minutes, on an unhandled error, and when they start (each kind at most every 30 minutes; anything token-like is hidden) |
| `STATUS_PORT` | Optional. Serve a read-only `/status.json` (totals only: uptime, bots online, servers, voice rooms, conversations of the last 7 days) on this port. `STATUS_HOST` defaults to `127.0.0.1`; put a tunnel in front of it to show it on a website |

## What is stored

All in `data/`, on your own machine:

| File | Holds |
| --- | --- |
| `companions.json` | Per-server settings: channel, language, frequency, quiet hours, question of the day, trivia and poll switches |
| `usage.json` | Daily counters only (how many conversations of each kind were started and engaged). No messages, no user ids |
| `custom.json` | The questions, jokes, facts and polls your managers added |
| `voice.json` | Minutes people spent in the voice room the companions sit in: user ids with minutes per week. `/voice forget` erases a person's entries |
| `reminders.json` | Waiting reminders and event countdowns (the text typed and the author's user id). Each is deleted once delivered or cancelled |
| `backups/` | A copy of the json files above, taken once a day, newest 7 days kept. So erasing someone with `/trivia forget` or `/voice forget` also leaves their entries in the older backups until those days roll off |
| `scores.json` | The Discord user ids of people who got a trivia answer right, with their points per week. `/trivia forget` erases a person's entries. **User ids are stored in this file, `voice.json` and `reminders.json`:** nothing else | the Discord user ids of people who got a trivia answer right, with their points per week. `/trivia forget` erases a person's entries |

No message is ever stored, and nothing leaves your machine.

## Running next to musiDISCORD on one Raspberry Pi

The two projects share nothing at runtime, so they simply live in two folders:

| | musiDISCORD | companionsDISCORD |
| --- | --- | --- |
| Folder | `~/musiDISCORD` | `~/companionsDISCORD` |
| Containers | `musidiscord-bot`, `musidiscord-lavalink`, ... | `companionsdiscord` |
| Image | `musidiscord-bot:local` | `companionsdiscord:local` |
| Published ports | `127.0.0.1:8787` (status page) | none |
| Config and data | its own `.env` and `data/` | its own `.env` and `data/` |
| Auto-update | `musidiscord-update.timer` | `companionsdiscord-update.timer` |

Each is one Node.js process (the companions are small: they use no Lavalink and no database). With 23 companions running I measured about 113 MB and about 5% of the Pi 5's CPU; check your own with `docker stats --no-stream`.

## Honest notes

- The conversation logic is covered by automated tests with a fake clock and fake bots (`npm test`). It has **not** been run against a live Discord server yet, so expect to tune the timing and the content after watching it for a few days.
- Use it in servers you run, tell your members what these bots are, and keep the frequency modest.
- Want more jokes? Add entries to `src/content/en.js` or `src/content/vi.js` (the tests check the shape of every entry). Adding a language means a new file in `src/content/` and a line in `src/content/index.js` and `src/settings.js`.

## Tiếng Việt

Hai đến ba mươi bot nhỏ giữ cho một kênh chat luôn có không khí: thỉnh thoảng một bot hỏi câu vui, kể chuyện cười hoặc câu đố, chia sẻ fun fact, hoặc nói chuyện với bot khác. Vài phút không ai trả lời thì bot khác nhảy vào; có người nhắn vào thì các bot lùi lại.

- Các bot luôn là bot (giữ nhãn BOT, không giả làm người, dùng token bot bình thường).
- Nội dung tiếng Việt và tiếng Anh nằm sẵn trong repo, không gọi dịch vụ ngoài. Không đọc nội dung tin nhắn, trừ khi bạn tự bật chế độ AI tùy chọn (`/companions ai replies`, cần `GEMINI_API_KEY`): khi đó đúng tin nhắn nhắc tên bot được gửi cho Gemini của Google để viết câu trả lời, và `/companions ai daily` đăng một câu đố mỗi ngày mà không gửi dữ liệu thành viên.
- Có giờ im lặng (mặc định 23:00 đến 08:00), trần số cuộc trò chuyện mỗi ngày, không chen vào khi mọi người đang chat.
- Cài đặt: tạo 2 đến 30 ứng dụng trong Discord Developer Portal, chạy bộ cài một lệnh ở trên (hoặc `docker compose up -d --build` sau khi điền `.env`), rồi trong Discord gõ `/companions setup channel:#chat-chung language:Tiếng Việt`.
- Trên cùng một Pi 5 bạn có thể chạy song song với bot nhạc musiDISCORD, mỗi bot một thư mục (bảng ở trên).
- Biết chơi cùng chứ không chỉ nói: câu hỏi trong ngày (`/companions qotd`), poll, và đố vui có nút bấm kèm bảng xếp hạng (`/trivia top`). Chủ server tự thêm câu hỏi, chuyện cười, fun fact và poll bằng `/companions content`; `/companions stats` cho biết bot có thật sự khiến mọi người nói chuyện không.

- Ngồi trong phòng voice 24/7: `/companions voice join channel:#phong-voice bots:2`, rồi thêm phòng khác bằng chính lệnh đó: mỗi bot giữ phòng của mình: phòng mới hay phòng tăng số bot chỉ lấy bot đang rảnh (số nhỏ trước), không bao giờ lấy bot của phòng khác. Xóa một phòng thì bot của nó rảnh ra, các phòng khác không đổi (`/companions voice leave`). Bot ở lại kể cả khi mọi người ra hết, tự vào lại nếu bị đá hoặc khởi động lại, không nói và không nghe gì. Thêm: `/assemble` gọi bot về phòng voice bạn đang ngồi, `/random` rải bot vào các phòng ngẫu nhiên (cần quyền Move Members, một phút một lần), biển hiệu "bật camera" cho bot trong phòng voice (`/companions voice camera`, chỉ là biển hiệu, không có video thật), chào người vừa vào voice, `/pomodoro` (phiên tập trung), `/voice top` (giờ ngồi voice), chào thành viên mới kèm câu phá băng (`/companions welcome`), `/remind` và `/event`.
- Thêm: bot hiện trạng thái dưới tên (đang ngồi voice với mấy người, phiên tập trung còn mấy phút), nội dung theo mùa (Halloween, Giáng sinh, Năm mới, Tết, Valentine), tự ưu tiên kiểu trò chuyện hiệu quả nhất (`/companions toggle what:adaptive`), bản tin tuần mỗi sáng thứ Hai (`/companions recap`), chuỗi ngày đố vui (`/trivia streak`), danh hiệu khách quen phòng voice (`/companions titles`), xuất và xóa dữ liệu server (`/companions data`), cảnh báo qua webhook và sao lưu hằng ngày.
- Dữ liệu người dùng (ID Discord) nằm ở `scores.json`, `voice.json`, `reminders.json`; ai cũng tự xóa được bằng `/trivia forget` và `/voice forget`. Không lưu tin nhắn.
- Chưa chạy thử với Discord thật; hãy theo dõi vài ngày rồi chỉnh tần suất và nội dung.

## Testing

```bash
npm test
```

## Author

Made by nhaajt: [GitHub](https://github.com/nhaajtt) • [Instagram](https://www.instagram.com/nhaajt_hehee/). Questions or bugs: open an issue in this repo.
