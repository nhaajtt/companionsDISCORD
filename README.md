# companionsDISCORD

Two to ten small Discord bots that keep a channel lively. Every so often one of them asks a question, tells a joke or a riddle, shares a fun fact or starts a short chat with another bot. If nobody answers after a few minutes, another bot jumps in. If a person joins the conversation, the bots step back, and they thank anyone who replies to them.

Website: https://companionsdiscord.vercel.app (English and Vietnamese). Made by [nhaajt](https://github.com/nhaajtt). It is a sibling of [musiDISCORD](https://github.com/nhaajtt/musiDISCORD), the self-hosted music bot, and the two can run side by side on the same Raspberry Pi.

- **They are open about being bots.** They keep Discord's BOT tag, have five distinct personalities and never pretend to be human. They run on normal bot tokens, never a user account.
- **No outside services.** English and Vietnamese banks of questions, jokes and riddles, fun facts (about 25 in English and about 380 in Vietnamese) and bot-to-bot banter are written into the repo. Nothing is sent anywhere, and content is not repeated until the others have been used.
- **Good manners built in:** one channel you choose, quiet hours (default 23:00 to 08:00 in your time zone), a daily limit, nothing while people are chatting, typing indicators, no pings, and a ten minute cooldown between thank-yous.
- **They do not read message content.** They only use the non-privileged `Guilds` and `GuildMessages` intents to notice that someone wrote or replied.

## The cast

| Bot | Personality |
| --- | --- |
| Pip | Cheerful hype bot. Everything is the best thing ever |
| Grumble | Sarcastic grump who secretly cares |
| Nova | Space and trivia nerd |
| Sage | Deadpan philosopher |
| Bean | Chaotic gremlin with spicy takes |

Personality is picked by the order of the tokens: the first token is Pip, the second Grumble, and so on. With fewer than five bots the first ones are used; with more than five, the sixth bot shares Pip's personality, the seventh Grumble's, and so on.

## How a conversation goes

1. A bot starts: a question, a joke or riddle, a fun fact, or a line of banter.
2. A person may answer. If so, the bots stay out of the way (a joke's punchline is still delivered), and whoever replied to a bot gets a short thank-you after a natural pause.
3. If nobody answers for several minutes, another bot answers or shrugs, a third may react, and the teller of a joke gives the punchline.
4. Then it goes quiet for a good while (normally 1.5 to 4 hours).

## Setup

1. Create 2 to 10 applications in the [Discord Developer Portal](https://discord.com/developers/applications), each with a Bot, and copy each token. No privileged intent is needed.
2. Invite every bot to your server with this link (replace `CLIENT_ID` with that bot's Application ID): `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=101376` (View Channel, Send Messages, Read Message History).
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

| Command | What it does |
| --- | --- |
| `/companions setup channel [language]` | Choose the channel and language (English or Vietnamese), and turn them on |
| `/companions on \| off` | Turn them on or off |
| `/companions frequency level` | Calm (up to 4 a day), Normal (8) or Lively (14) |
| `/companions quiet from until` | Hours they stay silent |
| `/companions now` | Start a conversation right away, to test it |
| `/companions status` | Current settings and when the next chat is due |

## Settings (`.env`)

| Variable | Meaning |
| --- | --- |
| `COMPANION_TOKENS` | 2 to 10 bot tokens, comma-separated (required) |
| `COMPANION_TIMEZONE` | Time zone for quiet hours and the daily limit (default `Asia/Ho_Chi_Minh`) |
| `COMPANION_DATA_DIR` | Where `companions.json` is stored (default `data`; the compose file sets it) |

Per-server settings (channel, language, frequency, quiet hours) are stored in `data/companions.json`. That is all the program stores: no messages, no user data.

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
- Chưa chạy thử với Discord thật; hãy theo dõi vài ngày rồi chỉnh tần suất và nội dung.

## Testing

```bash
npm test
```

## Author

Made by nhaajt: [GitHub](https://github.com/nhaajtt) • [Instagram](https://www.instagram.com/nhaajt_hehee/). Questions or bugs: open an issue in this repo.
