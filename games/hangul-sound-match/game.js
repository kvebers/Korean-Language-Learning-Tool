// Sound Match: sound cards on one side, Hangul letters on the other; match them up.
(function () {
  const { hangul, speech, sfx, progress, ui } = KLT;
  const GAME = "hangul-sound-match";

  const els = {
    sounds: document.getElementById("sounds"),
    letters: document.getElementById("letters"),
    mistakes: document.getElementById("mistakes"),
    pairs: document.getElementById("pairs"),
    time: document.getElementById("time"),
    summary: document.getElementById("summary"),
  };

  let settings;
  let selected = null; // { side: "sound" | "letter", letter, el }
  let mistakes = 0;
  let matched = 0;
  let pairCount = 0;
  let missed = [];
  let startedAt = 0;
  let timer = null;

  settings = ui.settingsBar(
    document.getElementById("settings"),
    GAME,
    [
      { key: "pairs", label: "Pairs", value: "8", options: [["6", "6 pairs"], ["8", "8 pairs"], ["10", "10 pairs"], ["12", "12 pairs"]] },
      {
        key: "cards",
        label: "Sound cards",
        value: "roman",
        options: [
          ["roman", "Sound + pronunciation"],
          ["sound", "Sound only"],
        ],
      },
    ],
    (values) => {
      settings = values;
      newGame();
    }
  );
  ui.voiceNotice(document.getElementById("notice"));
  document.getElementById("restart").addEventListener("click", newGame);

  function newGame() {
    const pool = hangul.pool(settings);
    pairCount = Math.min(Number(settings.pairs), pool.length);
    const letters = hangul.sample(pool, pairCount);
    selected = null;
    mistakes = 0;
    matched = 0;
    missed = [];
    startedAt = 0;
    clearInterval(timer);
    els.summary.hidden = true;

    els.sounds.innerHTML = "";
    for (const letter of hangul.shuffle(letters)) {
      const label = settings.cards === "roman" ? `<span class="roman">${ui.esc(letter.roman)}</span>` : "";
      els.sounds.appendChild(card("sound", letter, `<span class="icon">🔊</span>${label}`, "Play sound"));
    }
    els.letters.innerHTML = "";
    for (const letter of hangul.shuffle(letters)) {
      els.letters.appendChild(card("letter", letter, ui.esc(letter.char), letter.char));
    }
    updateHud();
  }

  function card(side, letter, html, label) {
    const btn = document.createElement("button");
    btn.className = `card ${side}`;
    btn.innerHTML = html;
    btn.setAttribute("aria-label", label);
    btn.addEventListener("click", () => pick({ side, letter, el: btn }));
    return btn;
  }

  function updateHud() {
    els.mistakes.textContent = mistakes;
    els.pairs.textContent = `${matched} / ${pairCount}`;
    els.time.textContent = ui.formatTime(startedAt ? Date.now() - startedAt : 0);
  }

  function pick(choice) {
    if (choice.el.disabled) return;
    if (!startedAt) {
      startedAt = Date.now();
      timer = setInterval(updateHud, 1000);
    }
    if (choice.side === "sound") speech.say(choice.letter.say);

    // first pick, or switching to another card on the same side
    if (!selected || selected.side === choice.side) {
      if (selected) selected.el.classList.remove("selected");
      selected = choice;
      choice.el.classList.add("selected");
      if (choice.side === "letter") sfx.flip();
      return;
    }

    const sound = choice.side === "sound" ? choice : selected;
    const letter = choice.side === "letter" ? choice : selected;
    selected.el.classList.remove("selected");
    selected = null;

    if (sound.letter === letter.letter) {
      for (const c of [sound, letter]) {
        c.el.classList.add("done");
        c.el.disabled = true;
      }
      matched++;
      sfx.good();
      if (choice.side === "letter") speech.say(letter.letter.say);
      progress.record(GAME, sound.letter.char, true);
      updateHud();
      if (matched === pairCount) setTimeout(finish, 600);
      return;
    }

    mistakes++;
    missed.push(sound.letter);
    progress.record(GAME, sound.letter.char, false, { answer: letter.letter.char });
    sfx.bad();
    for (const c of [sound, letter]) c.el.classList.add("miss");
    setTimeout(() => {
      for (const c of [sound, letter]) c.el.classList.remove("miss");
    }, 700);
    updateHud();
  }

  function finish() {
    clearInterval(timer);
    const durationMs = Date.now() - startedAt;
    sfx.win();
    progress.session(GAME, {
      score: pairCount - new Set(missed).size,
      total: pairCount,
      mistakes,
      durationMs,
      missed: [...new Set(missed.map((l) => l.char))],
    });
    ui.summary(els.summary, {
      title: mistakes ? "All pairs matched! 다 맞췄어요!" : "Perfect, no mistakes! 완벽해요!",
      stats: [
        ["Pairs", pairCount],
        ["Mistakes", mistakes],
        ["Time", ui.formatTime(durationMs)],
      ],
      missed,
      onAgain: newGame,
    });
    els.summary.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  newGame();
})();
