// Draw the Letter: hear or read a sound, draw the Hangul letter, get it checked.
(function () {
  const { hangul, speech, sfx, progress, ui, recognize } = KLT;
  const GAME = "hangul-draw";
  const PASS = 0.6; // minimum similarity to the target letter
  const MARGIN = 0.03; // how far behind the best-matching letter the target may be

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), qnum: $("qnum"), score: $("score"),
    promptText: $("prompt-text"), pad: $("pad"), answer: $("answer"),
    hint: $("hint"), check: $("check"), feedback: $("feedback"),
    after: $("after"), override: $("override"), summary: $("summary"),
  };
  const ctx = els.pad.getContext("2d");

  let settings;
  let pool = [];
  let queue = [];
  let idx = 0;
  let score = 0;
  let missed = [];
  let current = null;
  let strokes = [];
  let drawing = null;
  let hintShown = false;
  let result = null; // { pass, best } once checked
  let startedAt = 0;

  settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      {
        key: "prompt",
        label: "Prompt",
        value: "both",
        options: [
          ["both", "Hear + see pronunciation"],
          ["hear", "Hear only"],
          ["see", "See pronunciation only"],
        ],
      },
      { key: "length", label: "Round", value: "10", options: [["10", "10 letters"], ["20", "20 letters"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    }
  );
  ui.voiceNotice($("notice"));

  $("start-btn").addEventListener("click", startRound);
  $("replay").addEventListener("click", speak);
  $("undo").addEventListener("click", undo);
  $("clear").addEventListener("click", () => { if (!result) { strokes = []; redraw(); } });
  els.hint.addEventListener("click", () => { hintShown = !hintShown; els.hint.textContent = hintShown ? "Hide hint" : "Show hint"; redraw(); });
  els.check.addEventListener("click", check);
  els.override.addEventListener("click", () => settle(true));
  $("next").addEventListener("click", next);

  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (e.key === "Enter") {
      e.preventDefault();
      result ? next() : check();
    } else if (e.key === " ") {
      e.preventDefault();
      speak();
    } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }
  });

  // ---- drawing pad -------------------------------------------------------

  function point(e) {
    const r = els.pad.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  els.pad.addEventListener("pointerdown", (e) => {
    if (result) return;
    els.pad.setPointerCapture(e.pointerId);
    drawing = [point(e)];
    strokes.push(drawing);
    redraw();
  });
  els.pad.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) drawing.push(point(ev));
    redraw();
  });
  for (const type of ["pointerup", "pointercancel"]) els.pad.addEventListener(type, () => (drawing = null));

  function undo() {
    if (result) return;
    strokes.pop();
    redraw();
  }

  function resize() {
    const size = els.pad.clientWidth;
    if (!size) return;
    const dpr = window.devicePixelRatio || 1;
    els.pad.width = els.pad.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  window.addEventListener("resize", resize);

  function redraw() {
    const size = els.pad.clientWidth;
    const css = getComputedStyle(document.documentElement);
    ctx.clearRect(0, 0, size, size);

    // guide cross
    ctx.save();
    ctx.strokeStyle = css.getPropertyValue("--line");
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
    ctx.stroke();
    ctx.restore();

    if (hintShown && current) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = css.getPropertyValue("--ink");
      ctx.font = `500 ${size * 0.7}px ${css.getPropertyValue("--font-ko")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(current.char, size / 2, size / 2);
      ctx.restore();
    }

    ctx.strokeStyle = css.getPropertyValue("--ink");
    ctx.lineWidth = Math.max(6, size * 0.035);
    ctx.lineCap = ctx.lineJoin = "round";
    for (const stroke of strokes) {
      ctx.beginPath();
      stroke.forEach(([x, y], i) => (i ? ctx.lineTo(x * size, y * size) : ctx.moveTo(x * size, y * size)));
      if (stroke.length === 1) ctx.lineTo(stroke[0][0] * size + 0.5, stroke[0][1] * size);
      ctx.stroke();
    }
  }

  // ---- round flow --------------------------------------------------------

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
    resize();
    ask();
  }

  function ask() {
    current = queue[idx];
    strokes = [];
    result = null;
    hintShown = false;
    els.hint.textContent = "Show hint";
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.feedback.textContent = "";
    els.feedback.className = "feedback";
    els.pad.classList.remove("good", "bad");
    els.answer.hidden = true;
    els.after.hidden = true;
    els.check.disabled = false;

    els.promptText.innerHTML =
      settings.prompt === "hear"
        ? `<span class="muted">Listen and draw the letter</span>`
        : `<span class="roman">${ui.esc(current.roman)}</span>`;
    redraw();
    if (settings.prompt !== "see") speak();
  }

  function speak() {
    if (current) speech.say(current.say === current.name ? current.say : `${current.name}, ${current.say}`);
  }

  function check() {
    if (result) return;
    // syllables: compare with the ones that look alike rather than all 140
    const candidates = current.type === "syllable"
      ? [current, ...hangul.similar(current, pool, 11)]
      : pool.includes(current) ? pool : [...pool, current];
    const ranked = recognize.rank(strokes, candidates);
    if (!ranked) {
      els.feedback.textContent = strokes.length ? "Draw the letter a bit bigger." : "Draw the letter first.";
      els.feedback.className = "feedback muted";
      return;
    }
    const mine = ranked.find((r) => r.letter === current);
    const best = ranked[0];
    const pass = mine.score >= PASS && mine.score >= best.score - MARGIN;
    result = { best: best.letter };
    settle(pass);
  }

  // Shows the verdict; also used by the "count it" override after a miss.
  function settle(pass) {
    result.pass = pass;
    els.check.disabled = true;
    els.after.hidden = false;
    els.override.hidden = pass;
    els.pad.classList.toggle("good", pass);
    els.pad.classList.toggle("bad", !pass);
    els.answer.hidden = false;
    els.answer.innerHTML = `<div class="glyph">${ui.esc(current.char)}</div>
      <div class="meta">${ui.esc(current.name)} · ${ui.esc(current.roman)}</div>`;

    if (pass) {
      sfx.good();
      els.feedback.textContent = hintShown ? "Nice! (hint used, so it doesn't count toward score)" : "Correct! 맞아요!";
      els.feedback.className = "feedback feedback-good";
    } else {
      sfx.bad();
      const lookalike = result.best !== current ? ` It looks more like ${result.best.char}.` : "";
      els.feedback.textContent = `Not quite.${lookalike} Compare with the letter on the right.`;
      els.feedback.className = "feedback feedback-bad";
    }
    speech.say(current.say);
  }

  function next() {
    if (!result) return;
    const counted = result.pass && !hintShown;
    if (counted) score++;
    if (!result.pass) missed.push(current);
    progress.record(GAME, current.char, result.pass, {
      skill: "write",
      assisted: hintShown,
      ...(result.pass ? {} : { answer: result.best.char }),
    });

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
