// New Words: introduce a few words, then quiz each one in several ways (recognise, hear,
// recall). Missed questions come back later in the same round. Review mode quizzes due words.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab, quiz } = KLT;
  const GAME = "word-learn";

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), intro: $("intro"), play: $("play"), summary: $("summary"),
    inum: $("inum"), introCard: $("intro-card"), left: $("left"), score: $("score"),
    qlabel: $("qlabel"), prompt: $("prompt"), options: $("options"), feedback: $("feedback"),
    reveal: $("reveal"), next: $("next"), typeForm: $("type-form"), typeInput: $("type-input"), dueNote: $("due-note"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      {
        key: "mode",
        label: "Mode",
        value: "new",
        options: [
          ["new", "Learn new words"],
          ["review", "Review due words"],
          ["practice", "Practise my words"],
        ],
      },
      { key: "batch", label: "Words", value: "5", options: [["3", "3 at a time"], ["5", "5 at a time"], ["8", "8 at a time"]] },
      {
        key: "typing",
        label: "Recall",
        value: "choice",
        options: [
          ["choice", "Pick the Korean word"],
          ["type", "Type it (Korean keyboard)"],
        ],
      },
      ui.LEVEL_FIELD,
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  ui.vocabStatus($("vocab-status"));

  let words = [];
  let pool = [];
  let queue = []; // questions still to answer
  let firstTry = new Map(); // word.id → all questions right at the first attempt
  let introIdx = 0;
  let current = null;
  let answered = false;
  let asked = 0;
  let score = 0;
  let missed = [];
  let startedAt = 0;

  $("start-btn").addEventListener("click", startRound);
  $("intro-next").addEventListener("click", nextIntro);
  $("intro-say").addEventListener("click", () => speech.say(words[introIdx].ko));
  $("replay").addEventListener("click", () => current && speech.say(current.word.ko));
  els.next.addEventListener("click", nextQuestion);
  els.typeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!answered) settle(quiz.typedMatches(current.word, els.typeInput.value), els.typeInput.value);
  });
  $("type-skip").addEventListener("click", () => !answered && settle(false, ""));
  quiz.bindKeys(els.options, () => !els.play.hidden && !answered);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName === "INPUT") return;
    if (!els.intro.hidden) nextIntro();
    else if (!els.play.hidden && answered) nextQuestion();
  });

  async function showStart() {
    els.start.hidden = false;
    els.intro.hidden = els.play.hidden = els.summary.hidden = true;
    const { unlocked, stats } = await vocab.state();
    const due = unlocked.filter((w) => progress.isDue(stats[w.id])).length;
    const fresh = unlocked.filter((w) => !stats[w.id]?.seen).length;
    els.dueNote.textContent = `${fresh} new word${fresh === 1 ? "" : "s"} waiting · ${due} due for review.`;
  }

  async function startRound() {
    const n = Number(settings.batch);
    const filter = { level: settings.level };
    const { unlocked, stats } = await vocab.state();
    const mine = unlocked.filter((w) => vocab.matches(w, filter));
    if (settings.mode === "new") {
      words = mine.filter((w) => !stats[w.id]?.seen).slice(0, n);
      if (!words.length) {
        els.dueNote.innerHTML = `You've met all your unlocked words. Practise them until they're learned
          (3 right in a row) and the next ${progress.VOCAB_STEP} unlock. Starting a practice round instead.`;
        words = (await vocab.pick({ n, filter, newLimit: 0, preview: false })).words;
      }
    } else if (settings.mode === "review") {
      words = hangul.shuffle(mine.filter((w) => progress.isDue(stats[w.id]))).slice(0, n * 2);
      if (!words.length) {
        els.dueNote.textContent = "Nothing is due right now. Starting a practice round instead.";
        words = (await vocab.pick({ n, filter, newLimit: 0, preview: false })).words;
      }
    } else {
      words = (await vocab.pick({ n, filter, newLimit: 0, preview: false })).words;
    }
    if (!words.length) return;
    pool = mine.length >= 8 ? mine : vocab.WORDS.slice(0, 60);

    // questions: new words get three kinds, reviews two
    const fresh = settings.mode === "new";
    const recall = settings.typing === "type" ? "type" : "recall";
    queue = [];
    for (const kind of fresh ? ["recognize", "listen", recall] : ["recognize", recall]) {
      queue.push(...hangul.shuffle(words).map((w) => ({ word: w, kind })));
    }
    firstTry = new Map(words.map((w) => [w.id, true]));
    asked = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;

    if (fresh && words.some((w) => !stats[w.id]?.seen)) {
      introIdx = 0;
      els.intro.hidden = false;
      showIntro();
    } else {
      els.play.hidden = false;
      nextQuestion();
    }
  }

  function showIntro() {
    const w = words[introIdx];
    els.inum.textContent = `${introIdx + 1} / ${words.length}`;
    els.introCard.innerHTML = quiz.card(w);
    speech.say(w.ko);
  }

  function nextIntro() {
    introIdx++;
    if (introIdx < words.length) return showIntro();
    els.intro.hidden = true;
    els.play.hidden = false;
    nextQuestion();
  }

  function nextQuestion() {
    if (!queue.length) return finish();
    const { word, kind } = queue.shift();
    current = quiz.question(word, kind, pool);
    answered = false;
    els.left.textContent = queue.length + 1;
    els.score.textContent = score;
    els.qlabel.textContent = current.label;
    els.prompt.innerHTML = current.prompt;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    els.reveal.hidden = true;
    els.next.hidden = true;
    const typing = kind === "type";
    els.typeForm.hidden = !typing;
    els.options.hidden = typing;
    if (typing) {
      els.typeInput.value = "";
      els.typeInput.focus();
    } else {
      quiz.renderOptions(els.options, current, (opt, correct) => settle(correct, opt.word.ko));
    }
    if (current.say) speech.say(current.say);
  }

  function settle(correct, answer) {
    answered = true;
    asked++;
    const w = current.word;
    if (correct) {
      score++;
      sfx.good();
      els.feedback.textContent = `${w.ko} = ${w.en}`;
      els.feedback.className = "g-feedback feedback-good";
    } else {
      sfx.bad();
      firstTry.set(w.id, false);
      missed.push(w);
      queue.splice(Math.min(queue.length, 3), 0, { word: w, kind: current.kind }); // try again soon
      els.feedback.textContent = "Not quite. Here's the word again:";
      els.feedback.className = "g-feedback feedback-bad";
      els.reveal.innerHTML = quiz.card(w);
      els.reveal.hidden = false;
    }
    speech.say(w.ko);
    progress.record(GAME, w.id, correct, { skill: current.skill, ...(correct ? {} : { answer }) });
    els.next.hidden = false;
    if (correct) setTimeout(() => answered && current.word === w && nextQuestion(), 1100);
  }

  function finish() {
    els.play.hidden = true;
    current = null;
    ui.endRound(els.summary, GAME, {
      score, total: asked, startedAt, missed,
      stats: [["Words", words.length], ["Perfect words", [...firstTry.values()].filter(Boolean).length]],
      onAgain: startRound,
    });
    ui.vocabStatus($("vocab-status"));
  }

  showStart();
})();
