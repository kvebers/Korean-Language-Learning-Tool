// Syllable Builder: hear a syllable, assemble it from consonant + vowel (+ 받침) tiles.
// "words" mode spells unlocked words syllable by syllable; the lab lets you build freely.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "syllable-build";
  const SLOTS = ["initial", "vowel", "final"];
  const BASIC_C = hangul.LETTERS.filter((l) => l.type === "consonant").map((l) => l.char);
  const VOWELS = hangul.LETTERS.filter((l) => l.type === "vowel").map((l) => l.char);
  const FINALS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "ㄲ", "ㅆ"];
  // flat vowels sit under the consonant, the rest to its right
  const FLAT = new Set(["ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"]);

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), qnum: $("qnum"), qlabel: $("qlabel"), score: $("score"),
    promptText: $("prompt-text"), wordProgress: $("word-progress"), glyph: $("glyph"), block: $("block"),
    feedback: $("feedback"), check: $("check"), next: $("next"), hint: $("hint"), labExit: $("lab-exit"),
    finalSlot: $("final-slot"), summary: $("summary"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      {
        key: "set",
        label: "Build",
        value: "syl",
        options: [
          ["syl", "Consonant + vowel (가)"],
          ["batchim", "With 받침 (한)"],
          ["words", "My words, syllable by syllable"],
        ],
      },
      {
        key: "prompt",
        label: "Prompt",
        value: "both",
        options: [
          ["both", "Hear + romanization"],
          ["hear", "Hear only"],
          ["see", "See the syllable (copy it)"],
        ],
      },
      { key: "length", label: "Round", value: "10", options: [["10", "10"], ["15", "15"], ["20", "20"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));

  // A task is one syllable to build; in words mode several tasks share a word.
  let tasks = [];
  let idx = 0;
  let score = 0;
  let missed = [];
  let built = { initial: "", vowel: "", final: "" };
  let task = null;
  let checked = false;
  let hinted = false;
  let tries = 0;
  let lab = false;
  let startedAt = 0;

  $("start-btn").addEventListener("click", startRound);
  $("lab-btn").addEventListener("click", startLab);
  $("replay").addEventListener("click", speak);
  els.check.addEventListener("click", check);
  els.next.addEventListener("click", next);
  els.hint.addEventListener("click", hint);
  els.labExit.addEventListener("click", showStart);
  document.querySelectorAll(".slot").forEach((s) => s.addEventListener("click", () => setPart(s.dataset.slot, "")));

  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (e.key === "Enter") {
      e.preventDefault();
      checked ? next() : check();
    } else if (e.key === " ") {
      e.preventDefault();
      speak();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const filled = SLOTS.filter((s) => built[s]);
      if (filled.length) setPart(filled[filled.length - 1], "");
    }
  });

  function showStart() {
    lab = false;
    els.start.hidden = false;
    els.play.hidden = true;
    els.summary.hidden = true;
  }

  async function startRound() {
    lab = false;
    const n = Number(settings.length);
    if (settings.set === "words") {
      // only words written fully in Hangul syllables
      const { words } = await vocab.pick({ n: Math.ceil(n / 2), filter: { pos: ["n", "v", "adj"], test: (w) => /^[가-힣]+$/.test(w.ko) } });
      tasks = words.flatMap((w) => [...w.ko].map((s, i) => ({ target: hangul.syllable(s), word: w, pos: i })));
    } else {
      const pool = hangul.pool({ tier: settings.set });
      const stats = await progress.stats();
      tasks = hangul.weightedSample(pool, n, (s) => progress.weight(stats, s.char)).map((target) => ({ target }));
    }
    idx = 0;
    score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = true;
    els.summary.hidden = true;
    els.play.hidden = false;
    els.labExit.hidden = true;
    els.hint.hidden = false;
    ask();
  }

  function startLab() {
    lab = true;
    task = null;
    els.start.hidden = true;
    els.summary.hidden = true;
    els.play.hidden = false;
    els.qlabel.hidden = true;
    els.score.parentElement.hidden = true;
    els.check.hidden = els.next.hidden = els.hint.hidden = true;
    els.labExit.hidden = false;
    els.finalSlot.hidden = false;
    els.promptText.innerHTML = `<span class="sub">Tap letters to build any syllable and hear it.</span>`;
    els.wordProgress.innerHTML = "";
    els.feedback.textContent = "";
    built = { initial: "ㅎ", vowel: "ㅏ", final: "ㄴ" };
    renderTiles(BASIC_C.concat(), VOWELS, FINALS);
    update();
  }

  function ask() {
    task = tasks[idx];
    built = { initial: "", vowel: "", final: "" };
    checked = false;
    hinted = false;
    tries = 0;
    els.qlabel.hidden = false;
    els.score.parentElement.hidden = false;
    els.qnum.textContent = `${idx + 1} / ${tasks.length}`;
    els.score.textContent = score;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    els.check.hidden = false;
    els.next.hidden = true;
    els.block.classList.remove("good", "bad");

    const p = task.target.parts;
    const needsFinal = settings.set !== "syl";
    els.finalSlot.hidden = !needsFinal;
    const t = task.target;
    els.promptText.innerHTML =
      settings.prompt === "see" ? `<div class="big">${ui.esc(t.char)}</div>`
      : settings.prompt === "both" ? `<div class="en">${ui.esc(t.roman)}</div>`
      : `<span class="sub">Listen and build the syllable</span>`;

    if (task.word) {
      els.wordProgress.innerHTML = `<span class="sub">${ui.esc(task.word.emoji)} ${ui.esc(task.word.en)}:</span> ` +
        [...task.word.ko].map((s, i) => `<span class="wp ${i < task.pos ? "done" : i === task.pos ? "now" : ""}">${i < task.pos ? ui.esc(s) : "□"}</span>`).join("");
    } else {
      els.wordProgress.innerHTML = "";
    }

    // the right letters plus look-alikes
    const pick = (all, right, n) => hangul.shuffle([...new Set([right, ...hangul.sample(all.filter((c) => c !== right), n)])].filter(Boolean));
    renderTiles(
      pick(BASIC_C, p.initial, 5),
      pick(VOWELS, p.vowel, 5),
      needsFinal ? pick(FINALS, p.final, 4) : []
    );
    update();
    if (settings.prompt !== "see") speak();
  }

  function renderTiles(initials, vowels, finals) {
    const row = (id, slot, chars, label) => {
      const el = $(id);
      el.innerHTML = chars.length ? `<span class="row-label">${label}</span>` : "";
      for (const c of chars) {
        const b = document.createElement("button");
        b.className = "jamo";
        b.textContent = c;
        b.addEventListener("click", () => setPart(slot, c));
        el.appendChild(b);
      }
      if (slot === "final" && chars.length) {
        const none = document.createElement("button");
        none.className = "jamo none";
        none.textContent = "none";
        none.addEventListener("click", () => setPart("final", ""));
        el.appendChild(none);
      }
    };
    row("row-initial", "initial", initials, "consonant");
    row("row-vowel", "vowel", vowels, "vowel");
    row("row-final", "final", finals, "받침");
  }

  function setPart(slot, c) {
    if (checked) return;
    built[slot] = c;
    if (c) sfx.flip();
    update();
    if (lab && built.initial && built.vowel) speech.say(current());
  }

  function current() {
    return built.initial && built.vowel ? hangul.compose(built.initial, built.vowel, built.final) : "";
  }

  function update() {
    for (const s of SLOTS) $(`s-${s}`).textContent = built[s] || "·";
    const syl = current();
    els.glyph.textContent = syl || [built.initial, built.vowel].filter(Boolean).join(" ") || "?";
    els.block.classList.toggle("flat", FLAT.has(built.vowel));
    els.block.classList.toggle("empty", !syl);
    document.querySelectorAll(".jamo").forEach((b) => {
      const slot = b.parentElement.id.replace("row-", "");
      b.classList.toggle("on", b.textContent === built[slot] || (b.classList.contains("none") && !built.final && slot === "final"));
    });
  }

  function speak() {
    if (task) speech.say(task.target.char);
  }

  function hint() {
    if (checked || !task) return;
    hinted = true;
    const p = task.target.parts;
    const wrong = SLOTS.find((s) => (built[s] || "") !== (p[s] || ""));
    if (wrong) setPart(wrong, p[wrong] || "");
    els.feedback.textContent = "Hint used: this one won't count toward your score.";
    els.feedback.className = "g-feedback muted";
  }

  function check() {
    if (checked || !task || lab) return;
    const syl = current();
    if (!syl) {
      els.feedback.textContent = "Pick a consonant and a vowel first.";
      els.feedback.className = "g-feedback muted";
      return;
    }
    tries++;
    const right = syl === task.target.char;
    if (!right && tries < 2) {
      sfx.bad();
      speech.say(syl);
      els.feedback.textContent = `That's ${syl} (${hangul.romanize(syl)}). Listen again and fix it.`;
      els.feedback.className = "g-feedback feedback-bad";
      setTimeout(speak, 900);
      return;
    }
    checked = true;
    const counted = right && !hinted && tries === 1;
    if (counted) score++;
    if (!right) missed.push(task.word || task.target);
    els.block.classList.add(right ? "good" : "bad");
    els.check.hidden = true;
    els.next.hidden = false;
    built = { ...task.target.parts };
    update();
    const t = task.target;
    els.feedback.textContent = right
      ? `${counted ? "Correct! 맞아요!" : "Got it."} ${t.char} = ${t.parts.initial} + ${t.parts.vowel}${t.parts.final ? ` + ${t.parts.final}` : ""}`
      : `It was ${t.char} = ${t.parts.initial} + ${t.parts.vowel}${t.parts.final ? ` + ${t.parts.final}` : ""}`;
    els.feedback.className = `g-feedback ${right ? "feedback-good" : "feedback-bad"}`;
    right ? sfx.good() : sfx.bad();
    speech.say(t.char);

    // syllables count as their own items; finishing a word counts for the word (spelling = recall)
    if (!task.word) {
      progress.record(GAME, t.char, right && tries === 1, { skill: "write", assisted: hinted, answer: right ? undefined : syl });
    } else {
      task.word.wordOk = (task.pos === 0 ? true : task.word.wordOk !== false) && right && tries === 1;
      if (task.pos === task.word.ko.length - 1) {
        progress.record(GAME, task.word.id, !!task.word.wordOk, { skill: "recall", assisted: hinted });
        setTimeout(() => speech.say(task.word.ko), 700);
      }
    }
  }

  function next() {
    if (!checked) return;
    idx++;
    if (idx < tasks.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, { score, total: tasks.length, startedAt, missed, onAgain: startRound });
  }
})();
