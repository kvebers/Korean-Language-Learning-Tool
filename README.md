# Korean Learning Tool 한국어

Small browser games for learning Korean. Each game lives in its own folder under `games/`.
Plain HTML/JS with no build step and no dependencies.

There are two versions:

| Version | How | What you get |
| --- | --- | --- |
| **Local** | `make serve` | All games **plus progress tracking**: letters learned, mistakes, rounds played, saved to `data/progress.json`. Games show your weak letters more often. |
| **GitHub Pages** | GitHub Actions on push to `main` | Games only, no tracking. |

## Tier 1: the Hangul alphabet

The 14 basic consonants and 10 basic vowels. (Tier 2, double consonants and compound vowels, can be picked in each game's settings.)

| Game | Folder | |
| --- | --- | --- |
| Sound Match 짝 맞추기 | `games/hangul-sound-match` | Sound cards (🔊 + English pronunciation, or sound only) on one side, Hangul letters on the other, all face up. Match them. |
| Sound Quiz 소리 퀴즈 | `games/hangul-sound-quiz` | Hear a letter's Korean name (기역, 니은…), pick the right character out of 4. |
| Draw the Letter 글자 쓰기 | `games/hangul-draw` | Hear or read a sound, draw the letter. The drawing is checked automatically. |
| Say the Letter 말하기 | `games/hangul-speak` | See a letter, pronounce it. Checked with speech recognition, or self-check by comparing with the native sound. |

**Sound** uses the browser's built-in Korean text-to-speech. Chrome and Edge include Korean voices. On Windows
you can also add one under *Settings → Time & language → Speech → Add voices → Korean*.
**Speech recognition** (Say the Letter) works in Chrome and Edge, needs an internet connection and asks for microphone access.
Other browsers fall back to self-check mode.

## Commands

Requires Python 3 (`make check` also needs Node).

```
make serve            Local version with progress tracking (http://localhost:8000)
make serve PORT=8010  ...on another port
make build            Build the games-only static site into dist/
make preview          Build and serve dist/ exactly like GitHub Pages
make check            Validate letter data and that every game is registered
make new-game NAME=x  Create games/x from the template and register it
make reset-progress   Delete local progress
make clean            Remove dist/
```

## Layout

```
index.html            Home page (game list + alphabet chart)
progress/             Progress dashboard (local version only)
games/<game>/         One folder per game: index.html, game.js, style.css
games/_template/      Starting point for `make new-game`
shared/
  hangul.js           Letter data (char, romanization, Korean name, spoken syllable, tier)
  sound.js            Korean text-to-speech + feedback tones
  progress.js         Progress API client (no-op in the static build)
  ui.js               Settings bar, round summary, voice notice
  games.js            Game registry shown on the home page
  config.js           { mode: "static" }; the local server serves { mode: "local" } instead
server/server.py      Local server (standard library only): static files + /api/progress, /api/event, /api/session
scripts/              build.py, new_game.py, check.mjs
.github/workflows/    pages.yml: check, build, deploy to GitHub Pages
```

## Adding a game

1. `make new-game NAME=my-game`
2. Edit the title/description added to `shared/games.js`
3. Build the game in `games/my-game/game.js` using the shared helpers:
   `KLT.hangul`, `KLT.speech.say()`, `KLT.sfx`, `KLT.progress.record(game, char, correct, { answer })`, `KLT.ui.summary()`

## GitHub Pages setup (once)

In the repository on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that, every push to `main` deploys the games.
