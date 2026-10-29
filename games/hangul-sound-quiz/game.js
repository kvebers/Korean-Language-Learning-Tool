// Sound Quiz: hear a letter (and see its English pronunciation), pick the right character out of four.
(function () {
  const { hangul, speech, sfx, progress, ui } = KLT;
  const GAME = "hangul-sound-quiz";

  const els = {
    start: document.getElementById("start"),
    play: document.getElementById("play"),
    qnum: document.getElementById("qnum"),
    score: document.getElementById("score"),
    promptText: document.getElementById("prompt-text"),
    options: document.getElementById("options"),
    feedback: document.getElementById("feedback"),
    summary: document.getElementById("summary"),
  };

  let settings;
  let pool = [];
  let queue = [];
  let idx = 0;
  let score = 0;
  let missed = [];
  let current = null;
  let answered = false;
  let startedAt = 0;

  settings = ui.settingsBar(
    document.getElementById("settings"),
    GAME,
    [
      {
        key: "prompt",
        label: "Prompt",
        value: "roman",
        options: [
          ["roman", "Sound + English pronunciation"],
          ["sound", "Sound only"],
        ],
      },
      { key: "length", label: "Round", value: "10", options: [["10", "10 questions"], ["20", "20 questions"], ["30", "30 questions"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    }
  );
  ui.voiceNotice(document.getElementById("notice"));

  document.getElementById("start-btn").addEventListener("click", startRound);
  document.getElementById("replay").addEventListener("click", speak);
  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (e.key === " ") {
      e.preventDefault();
      speak();
    } else if (/^[1-4]$/.test(e.key)) {
      els.options.children[Number(e.key) - 1]?.click();
    }
  });

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = true;
    els.summary.hidden = true;
  }

  async function startRound() {
    pool = hangul.pool(settings);
    const stats = await progress.stats();
    queue = hangul.weightedSample(pool, Number(settings.length), (l) => progress.weight(stats, l.char));
    idx = 0;
    score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = true;
    els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  // Three wrong answers of the same kind (consonant/vowel/syllable); for syllables,
  // ones that share the consonant or vowel.
  function distractors(letter) {
    let picks = hangul.similar(letter, pool, 3);
    if (picks.length < 3) {
      const extra = hangul.similar(letter, hangul.LETTERS, 6).filter((l) => !picks.includes(l));
      picks = picks.concat(extra.slice(0, 3 - picks.length));
    }
    return picks;
  }

  function ask() {
    current = queue[idx];
    answered = false;
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.feedback.textContent = "";
    els.feedback.className = "feedback";

    els.promptText.innerHTML =
      settings.prompt === "roman"
        ? `<span class="roman">${ui.esc(current.roman)}</span>`
        : `<span class="muted">Listen…</span>`;

    const options = hangul.shuffle([current, ...distractors(current)]);
    els.options.innerHTML = "";
    options.forEach((letter, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.innerHTML = `<span class="key">${i + 1}</span>${ui.esc(letter.char)}`;
      btn.addEventListener("click", () => answer(letter, btn));
      btn.letter = letter;
      els.options.appendChild(btn);
    });
    speak();
  }

  function speak() {
    if (current) speech.say(current.say);
  }

  function answer(letter, btn) {
    if (answered) return;
    answered = true;
    const correct = letter === current;
    for (const b of els.options.children) {
      b.disabled = true;
      if (b.letter === current) b.classList.add("right");
    }

    if (correct) {
      score++;
      sfx.good();
      els.feedback.textContent = `${current.char} · ${current.roman} · ${current.name}`;
      els.feedback.classList.add("feedback-good");
    } else {
      btn.classList.add("wrong");
      missed.push(current);
      sfx.bad();
      setTimeout(() => speech.say(current.say), 350);
      els.feedback.textContent = `That was ${letter.char} (${letter.roman}). The answer is ${current.char} · ${current.roman} · ${current.name}`;
      els.feedback.classList.add("feedback-bad");
    }
    els.score.textContent = score;
    progress.record(GAME, current.char, correct, { skill: "listen", ...(correct ? {} : { answer: letter.char }) });

    setTimeout(next, correct ? 900 : 2200);
  }

  function next() {
    idx++;
    if (idx < queue.length) return ask();

    const durationMs = Date.now() - startedAt;
    current = null;
    els.play.hidden = true;
    sfx.win();
    progress.session(GAME, {
      score,
      total: queue.length,
      durationMs,
      missed: [...new Set(missed.map((l) => l.char))],
    });
    ui.summary(els.summary, {
      title: score === queue.length ? "Perfect round! 완벽해요!" : "Round complete",
      stats: [
        ["Score", `${score} / ${queue.length}`],
        ["Accuracy", `${Math.round((score / queue.length) * 100)}%`],
        ["Time", ui.formatTime(durationMs)],
      ],
      missed,
      onAgain: startRound,
    });
  }
})();
