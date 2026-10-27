// Registry of games shown on the home page. `make new-game NAME=...` appends here.
window.KLT = window.KLT || {};
KLT.GAMES = [
  {
    id: "hangul-sound-match",
    title: "Sound Match",
    ko: "짝 맞추기",
    desc: "Sounds on one side, letters on the other. Tap a sound to hear it and match it to its Hangul letter.",
    tier: "Tier 1 · Alphabet",
  },
  {
    id: "hangul-sound-quiz",
    title: "Sound Quiz",
    ko: "소리 퀴즈",
    desc: "Hear a letter's Korean name and pick the right character out of four.",
    tier: "Tier 1 · Alphabet",
  },
  {
    id: "hangul-draw",
    title: "Draw the Letter",
    ko: "글자 쓰기",
    desc: "Hear or read a sound, then draw the Hangul letter. Your drawing is checked automatically.",
    tier: "Tier 1 · Alphabet",
  },
  {
    id: "hangul-speak",
    title: "Say the Letter",
    ko: "말하기",
    desc: "See a letter and pronounce it. Speech recognition checks you, or compare with the native sound yourself.",
    tier: "Tier 1 · Alphabet",
  },
  // @new-game (keep this marker: new games are inserted above it)
];
