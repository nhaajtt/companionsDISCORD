# companionsDISCORD

[![CI](https://github.com/nhaajtt/companionsDISCORD/actions/workflows/ci.yml/badge.svg)](https://github.com/nhaajtt/companionsDISCORD/actions/workflows/ci.yml)

Two to ten small Discord bots that keep a channel lively. Every so often one of them asks a question, tells a joke or a riddle, shares a fun fact or starts a short chat with another bot. If nobody answers after a few minutes, another bot jumps in. If a person joins the conversation, the bots step back, and they thank anyone who replies to them.

Website: https://companionsdiscord.vercel.app (English and Vietnamese). Made by [nhaajt](https://github.com/nhaajtt). It is a sibling of [musiDISCORD](https://github.com/nhaajtt/musiDISCORD), the self-hosted music bot, and the two can run side by side on the same Raspberry Pi.

- **They are open about being bots.** They keep Discord's BOT tag, have nine distinct personalities and never pretend to be human. They run on normal bot tokens, never a user account.
- **No outside services.** English and Vietnamese banks of questions, jokes and riddles, fun facts (about 1,250 in each language, the same ones translated) and bot-to-bot banter are written into the repo. Nothing is sent anywhere, and content is not repeated until the others have been used.
- **Good manners built in:** one channel you choose, quiet hours (default 23:00 to 08:00 in your time zone), a daily limit, nothing while people are chatting, typing indicators, no pings, and a ten minute cooldown between thank-yous.
- **They do not read message content.** They only use the non-privileged `Guilds`, `GuildMessages` and `GuildVoiceStates` intents to notice that someone wrote, replied, or moved in a voice room.
- **They can play, not just talk.** A question of the day at a fixed hour, polls, and trivia rounds with answer buttons and a weekly leaderboard.
- **You can see whether it works.** `/companions stats` shows how many conversations got people talking, and which kinds work best.
- **Your own content.** Managers can add questions, jokes, facts and polls with a command, no redeploy needed.
- **They sit in a voice room 24/7.** One or more companions join a voice channel, stay when everyone leaves and rejoin by themselves if they are dropped or the program restarts. They never speak, play or listen: they are just there, so the room looks lived in.
- **Useful around the room:** a greeting when someone joins the voice room, Pomodoro focus sessions announced in chat, and a voice-time leaderboard.
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

Personality is picked by the order of the tokens: the first token is Pip, the second Grumble, and so on up to the ninth, Cow. With fewer than nine bots the first ones are used; a tenth bot would share Pip's personality.

## How a conversation goes

1. A bot starts: a question, a joke or riddle, a fun fact, or a line of banter.
2. A person may answer. If so, the bots stay out of the way (a joke's punchline is still delivered), and whoever replied to a bot gets a short thank-you after a natural pause.
3. If nobody answers for several minutes, another bot answers or shrugs, a third may react, and the teller of a joke gives the punchline.
4. Then it goes quiet for a good while (normally 1.5 to 4 hours).

Besides those, the bots sometimes post a **poll** (a Discord poll, with a reaction from another bot a few minutes later) or a **trivia round**: a multiple-choice question with four answer buttons (A to D). Every person's first press counts and is locked in privately. After 8 to 15 minutes another bot reveals the answer, lists who got it right (without pinging them), turns the buttons off and adds a point for each person who got it right. `/trivia top` shows the weekly or all-time board. Trivia questions are built from the fun-fact bank, so every answer is backed by a fact in the repo.

## Setup

1. Create 2 to 10 applications in the [Discord Developer Portal](https://discord.com/developers/applications), each with a Bot, and copy each token. No privileged intent is needed.
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
| `/companions voice status \| greet enabled` | See which bot sits in which room, or turn the join greeting on or off |
| `/companions welcome enabled` | Greet new members with an icebreaker (needs the server's join messages) |
| `/companions content add-question \| add-joke \| add-fact \| add-poll` | Add your own entries for this server (up to 100 of each kind; pings are stripped) |
| `/companions content list kind`, `/companions content remove kind number` | See and remove what you added |

Everyone (not only managers) can use:

| Command | What it does |
| --- | --- |
| `/trivia top [period]` | The trivia leaderboard, this week (default) or all time |
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
| `COMPANION_TOKENS` | 2 to 10 bot tokens, comma-separated (required) |
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

Each is one Node.js process (the companions are small: they use no Lavalink and no database). I have not measured memory or CPU for the pair, so check with `docker stats --no-stream`.

## Honest notes

- The conversation logic is covered by automated tests with a fake clock and fake bots (`npm test`). It has **not** been run against a live Discord server yet, so expect to tune the timing and the content after watching it for a few days.
- Use it in servers you run, tell your members what these bots are, and keep the frequency modest.
- Want more jokes? Add entries to `src/content/en.js` or `src/content/vi.js` (the tests check the shape of every entry). Adding a language means a new file in `src/content/` and a line in `src/content/index.js` and `src/settings.js`.

## Tiếng Việt

Hai đến mười bot nhỏ giữ cho một kênh chat luôn có không khí: thỉnh thoảng một bot hỏi câu vui, kể chuyện cười hoặc câu đố, chia sẻ fun fact, hoặc nói chuyện với bot khác. Vài phút không ai trả lời thì bot khác nhảy vào; có người nhắn vào thì các bot lùi lại.

- Các bot luôn là bot (giữ nhãn BOT, không giả làm người, dùng token bot bình thường).
- Nội dung tiếng Việt và tiếng Anh nằm sẵn trong repo, không gọi dịch vụ ngoài. Không đọc nội dung tin nhắn.
- Có giờ im lặng (mặc định 23:00 đến 08:00), trần số cuộc trò chuyện mỗi ngày, không chen vào khi mọi người đang chat.
- Cài đặt: tạo 2 đến 10 ứng dụng trong Discord Developer Portal, chạy bộ cài một lệnh ở trên (hoặc `docker compose up -d --build` sau khi điền `.env`), rồi trong Discord gõ `/companions setup channel:#chat-chung language:Tiếng Việt`.
- Trên cùng một Pi 5 bạn có thể chạy song song với bot nhạc musiDISCORD, mỗi bot một thư mục (bảng ở trên).
- Biết chơi cùng chứ không chỉ nói: câu hỏi trong ngày (`/companions qotd`), poll, và đố vui có nút bấm kèm bảng xếp hạng (`/trivia top`). Chủ server tự thêm câu hỏi, chuyện cười, fun fact và poll bằng `/companions content`; `/companions stats` cho biết bot có thật sự khiến mọi người nói chuyện không.

- Ngồi trong phòng voice 24/7: `/companions voice join channel:#phong-voice bots:2`, rồi thêm phòng khác bằng chính lệnh đó: mỗi bot giữ phòng của mình: phòng mới hay phòng tăng số bot chỉ lấy bot đang rảnh (số nhỏ trước), không bao giờ lấy bot của phòng khác. Xóa một phòng thì bot của nó rảnh ra, các phòng khác không đổi (`/companions voice leave`). Bot ở lại kể cả khi mọi người ra hết, tự vào lại nếu bị đá hoặc khởi động lại, không nói và không nghe gì. Thêm: chào người vừa vào voice, `/pomodoro` (phiên tập trung), `/voice top` (giờ ngồi voice), chào thành viên mới kèm câu phá băng (`/companions welcome`), `/remind` và `/event`.
- Dữ liệu người dùng (ID Discord) nằm ở `scores.json`, `voice.json`, `reminders.json`; ai cũng tự xóa được bằng `/trivia forget` và `/voice forget`. Không lưu tin nhắn.
- Chưa chạy thử với Discord thật; hãy theo dõi vài ngày rồi chỉnh tần suất và nội dung.

## Testing

```bash
npm test
```

## Author

Made by nhaajt: [GitHub](https://github.com/nhaajtt) • [Instagram](https://www.instagram.com/nhaajt_hehee/). Questions or bugs: open an issue in this repo.
