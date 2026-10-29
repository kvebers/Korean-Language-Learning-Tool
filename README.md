# Korean Learning Tool 한국어

Small browser games for learning Korean, from the Hangul alphabet to first conversations (CEFR A1–A2),
with a 2,000-word library up to B2 and spaced-repetition progress tracking.
Plain HTML/JS: no build step and no dependencies.

There are two versions. Both track progress:

| Version | How | Progress is saved |
| --- | --- | --- |
| **Local** | `make serve` | in `data/progress.json` on your computer |
| **GitHub Pages** | GitHub Actions on push to `main` | in your browser (localStorage). Export/import it on the progress page. |

## Games

| Tier | Games |
| --- | --- |
| **1 · Hangul alphabet** | Sound Match, Sound Quiz, Draw the Letter, Say the Letter |
| **2 · Double consonants, compound vowels & syllables** | The four letter games in "doubles" and syllable modes, Syllable Builder (build 가/한 from letter tiles, or spell your words), Korean Typing (두벌식 keyboard + dictation) |
| **3 · First words (A1–A2)** | New Words (learn + quiz), Word Match (relaxed or speed), Memory Vault (spaced-repetition tower defense), Fridge Raid, Word Web, Daily Routine |
| **4 · Grammar & numbers (A1–A2)** | Number Pop (native vs Sino-Korean), What Time Is It? (clocks, dates), Particle Pop (은/는 이/가 을/를 에 에서 도), Time Portal (past/present/future endings), Sentence Builder (word order, negation, questions, requests), Where Is It? (위/아래/앞/뒤/옆/안 + 있어요/없어요) |
| **5 · Speaking & conversation** | Tongue Twisters (speech recognition marks missed syllables), Character Talk (AI chat) |

Each game's settings bar picks what to practise. The home page links straight to modes with URL presets
(for example `games/hangul-sound-quiz/index.html?tier=2` for double consonants and compound vowels, `?tier=syl` for syllables).

### Vocabulary and progress

- `shared/words/a1.js … b2.js`: 2,001 words with meaning, part of speech, topic and (for concrete words) an emoji.
  The order in these files is the unlock order.
- You start with **20 words**. A word is *learned* after 3 correct answers in a row; when all but 20% of your
  unlocked words are learned, the **next 10 unlock**. Theme games (Fridge Raid, Word Web…) may preview a few
  upcoming words of their topic.
- Every letter, syllable, word and grammar point gets its own review schedule (10 min → 1 day → 3 → 7 → 16 → 35 → 90 days).
  Accuracy is tracked per item and per skill: recognition, recall, listening, speaking and writing.
- **Word library** (`library/`): every word with its status, accuracy and next review. **Progress** (`progress/`): skills,
  reviews due, activity, grammar points, mistakes, rounds, export/import.

The research behind this is summarised in [docs/LEARNING.md](docs/LEARNING.md).

### Character Talk (AI conversation)

Chat by text or voice with a character (a student in Seoul, a barista, a market vendor, a classmate) who replies in
simple Korean at your level, prefers words you know, corrects your messages and suggests replies.
**Help me say…** turns English into Korean with a word-by-word breakdown, and you can tap any Korean word to look it up.

It uses Google Gemini with **your own API key** (free at [Google AI Studio](https://aistudio.google.com/apikey)).
Enter it once under ⚙️ AI settings: it is stored only in your browser and sent only to Google.
The default model is `gemini-3.1-flash-lite` (free tier: about 500 requests a day); you can change it in the settings.

### Sound and microphone

**Sound** uses the browser's built-in Korean text-to-speech. Chrome and Edge include Korean voices. On Windows
you can also add one under *Settings → Time & language → Speech → Add voices → Korean*.
**Speech recognition** (Say the Letter, Tongue Twisters, Character Talk) works in Chrome and Edge, needs an internet
connection and asks for microphone access. Other browsers fall back to self-check or typing.

## Commands

Requires Python 3 (`make check` also needs Node).

```
make serve            Local version (http://localhost:8000), progress in data/progress.json
make serve PORT=8010  ...on another port
make build            Build the static site into dist/
make preview          Build and serve dist/ exactly like GitHub Pages
make check            Validate letters, words, grammar helpers, the game registry and every page's scripts
make new-game NAME=x  Create games/x from the template and register it
make reset-progress   Delete local progress
make clean            Remove dist/
```

## Layout

```
index.html            Home page (dashboard, games by tier, alphabet chart)
progress/             Progress dashboard
library/              Word library
games/<game>/         One folder per game: index.html, game.js, style.css
games/_template/      Starting point for `make new-game`
shared/
  hangul.js           Letters, syllable compose/decompose, romanization
  korean.js           Particles, conjugation (-아/어요, -았/었어요, -(으)ㄹ 거예요), native & Sino-Korean numbers
  words/*.js          Word library (A1, A2, B1, B2)
  vocab.js            Library parsing, unlocking, picking words for a round
  quiz.js             Word questions shared by the vocabulary games
  progress.js         Progress + spaced repetition (local server or localStorage)
  gemini.js           Gemini API client (Character Talk)
  sound.js            Korean text-to-speech + feedback tones
  ui.js               Settings bar, round summary, voice notice
  games.js            Game registry and tiers shown on the home page
  config.js           { mode: "static" }; the local server serves { mode: "local" } instead
server/server.py      Local server (standard library only): static files + GET/PUT /api/progress
scripts/              build.py, new_game.py, check.mjs
docs/LEARNING.md      The learning research the games are based on
.github/workflows/    pages.yml: check, build, deploy to GitHub Pages
```

## Adding a game

1. `make new-game NAME=my-game`
2. Edit the title/description/tier added to `shared/games.js`
3. Build the game in `games/my-game/game.js` using the shared helpers:
   `KLT.hangul`, `KLT.vocab.pick()`, `KLT.speech.say()`, `KLT.sfx`,
   `KLT.progress.record(game, itemId, correct, { skill, answer })`, `KLT.ui.endRound()`

## GitHub Pages setup (once)

The deploy fails with `Failed to create deployment (status: 404)` until Pages is switched on:
in the repository on GitHub go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that, every push to `main` deploys the games (pull requests only run the checks).
