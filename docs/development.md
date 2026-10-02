# Working on it from another machine

```bash
git clone https://github.com/nhaajtt/companionsDISCORD.git
cd companionsDISCORD
npm install
npm test            # 80 tests, no Discord needed
```

Nothing secret is in the repo. To actually run the bots you need your own `.env` (copy `.env.example`, then put the bot tokens in `COMPANION_TOKENS`, up to 30, comma-separated) and then `npm start`, or `docker compose up -d --build`. The `data/` folder (settings, scores, voice time, reminders, backups) is also not in the repo: it lives on the machine that runs the bots.

Where things are:

| Path | What |
| --- | --- |
| `src/runtime.js` | The only file that talks to Discord: clients, slash commands, voice connections, timers |
| `src/engine.js`, `src/script.js` | Conversations, trivia, question of the day (no Discord inside, tested with a fake clock) |
| `src/voice.js`, `src/voicetools.js`, `src/pomodoro.js` | Voice rooms that keep their bots, greetings, focus sessions, notes |
| `src/content/` | English and Vietnamese banks: questions, facts, trivia, 30 personalities, notes, seasonal packs |
| `web/` | The bilingual website (Vercel, static, deploys on push) |
| `test/` | `npm test`, Node's built-in runner |

Checks that run on every push (GitHub Actions): the tests, a syntax check, the slash command definitions (Discord rejects a description over 100 characters), and a Docker build. Run `npm test` and the command check from `.github/workflows/ci.yml` before pushing.

On the Raspberry Pi: `git pull`, then `docker compose up -d --build` in the project folder. `scripts/update.sh` does the same from a systemd timer.
