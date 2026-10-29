// Number Pop: pick the bubble with the right number system (native vs Sino-Korean) and form.
(function () {
  const { hangul, ko, speech, sfx, progress, ui } = KLT;
  const GAME = "number-pop";
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const month = (n) => (n === 6 ? "유월" : n === 10 ? "시월" : `${ko.sino(n)}월`);

  // Each context: which system, a range, how to say it, how to say it in English.
  const CONTEXTS = [
    { counter: "개", system: "native", emoji: "🍎", range: () => rand(1, 10), en: (n) => `${n} apple${n > 1 ? "s" : ""}`, pre: "사과" },
    { counter: "명", system: "native", emoji: "🧑", range: () => rand(1, 10), en: (n) => `${n} ${n > 1 ? "people" : "person"}`, pre: "사람" },
    { counter: "살", system: "native", emoji: "🎂", range: () => rand(5, 40), en: (n) => `${n} years old`, pre: "" },
    { counter: "시", system: "native", emoji: "🕐", range: () => rand(1, 12), en: (n) => `${n} o'clock`, pre: "" },
    { counter: "마리", system: "native", emoji: "🐶", range: () => rand(1, 10), en: (n) => `${n} dog${n > 1 ? "s" : ""}`, pre: "강아지" },
    { counter: "권", system: "native", emoji: "📕", range: () => rand(1, 10), en: (n) => `${n} book${n > 1 ? "s" : ""}`, pre: "책" },
    { counter: "잔", system: "native", emoji: "☕", range: () => rand(1, 5), en: (n) => `${n} cup${n > 1 ? "s" : ""} of coffee`, pre: "커피" },
    { counter: "원", system: "sino", emoji: "💴", range: () => rand(1, 50) * 500, en: (n) => `₩${n.toLocaleString("en")}`, pre: "" },
    { counter: "분", system: "sino", emoji: "⏱️", range: () => rand(1, 59), en: (n) => `${n} minute${n > 1 ? "s" : ""}`, pre: "" },
    { counter: "월", system: "sino", emoji: "📅", range: () => rand(1, 12), en: (n) => new Date(2000, n - 1).toLocaleString("en", { month: "long" }), pre: "", say: month },
    { counter: "일", system: "sino", emoji: "🗓️", range: () => rand(1, 31), en: (n) => `the ${n}${["th", "st", "nd", "rd"][n % 10 > 3 || [11, 12, 13].includes(n % 100) ? 0 : n % 10]} (date)`, pre: "" },
    { counter: "층", system: "sino", emoji: "🏢", range: () => rand(1, 20), en: (n) => `floor ${n}`, pre: "" },
  ];

  const $ = (id) => document.getElementById(id);
  const els = { start: $("start"), play: $("play"), summary: $("summary"), prompt: $("prompt"), sky: $("sky"), feedback: $("feedback"), qnum: $("qnum"), score: $("score"), replay: $("replay") };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "mode", label: "Mode", value: "read", options: [["read", "See English → pop the Korean"], ["listen", "Hear Korean → pop the number"]] },
      { key: "which", label: "Numbers", value: "mixed", options: [["mixed", "Both systems"], ["native", "Native only"], ["sino", "Sino-Korean only"]] },
      { key: "length", label: "Round", value: "12", options: [["8", "8"], ["12", "12"], ["20", "20"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);
  els.replay.addEventListener("click", () => q && speech.say(q.text));

  let queue = [];
  let q = null;
  let idx = 0;
  let score = 0;
  let missed = [];
  let wrongThis = false;
  let startedAt = 0;

  // Korean for n with a context: "사과 세 개", "오천 원", "유월"
  function say(ctx, n, system = ctx.system) {
    if (ctx.say && system === ctx.system) return ctx.say(n);
    if (system === "native" && n > 99) return null;
    const num = system === "native" ? ko.native(n, { counter: true }) : ko.sino(n);
    return `${ctx.pre ? ctx.pre + " " : ""}${num} ${ctx.counter}`;
  }

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
    els.sky.innerHTML = "";
  }

  async function startRound() {
    const ctxs = CONTEXTS.filter((c) => settings.which === "mixed" || c.system === settings.which);
    const stats = await progress.stats();
    queue = hangul.weightedSample(ctxs, Number(settings.length), (c) => progress.weight(stats, `num:${c.counter}`));
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function ask() {
    const ctx = queue[idx];
    const n = ctx.range();
    const text = say(ctx, n);
    wrongThis = false;
    q = { ctx, n, text };
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";

    // the right answer, the same number in the other system, and near misses
    const other = ctx.system === "native" ? "sino" : "native";
    const near = [n + 1, n - 1, n + (ctx.counter === "원" ? 500 : 2)].filter((x) => x > 0);
    let options;
    if (settings.mode === "read") {
      options = [text, say(ctx, n, other), ...near.map((x) => say(ctx, x))];
      // months: also offer the regular-looking wrong forms 육월 / 십월
      if (ctx.counter === "월" && (n === 6 || n === 10)) options[1] = `${ko.sino(n)}월`;
    } else {
      options = [ctx.en(n), ...near.map((x) => ctx.en(x))];
    }
    options = [...new Set(options.filter(Boolean))].slice(0, 5);
    const right = settings.mode === "read" ? text : ctx.en(n);

    els.replay.hidden = settings.mode !== "listen";
    els.prompt.innerHTML = settings.mode === "read"
      ? `<div class="emoji">${ctx.emoji}</div><div class="en">${ui.esc(ctx.en(n))}</div><div class="sub">Pop the right Korean</div>`
      : `<div class="emoji">${ctx.emoji}🔊</div><div class="sub">Listen and pop what you heard</div>`;
    if (settings.mode === "listen") speech.say(text);

    els.sky.innerHTML = "";
    const lanes = hangul.shuffle([...Array(options.length).keys()]);
    hangul.shuffle(options).forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = `bubble${settings.mode === "read" ? " ko" : ""}`;
      b.textContent = opt;
      b.style.left = `${4 + lanes[i] * (92 / options.length)}%`;
      b.style.animationDuration = `${7 + Math.random() * 3}s`;
      b.style.animationDelay = `${-Math.random() * 6}s`;
      b.addEventListener("click", () => pop(b, opt === right));
      els.sky.appendChild(b);
    });
  }

  function pop(b, right) {
    if (b.disabled) return;
    const { ctx, text } = q;
    if (right) {
      b.classList.add("popped");
      [...els.sky.children].forEach((x) => (x.disabled = true));
      if (!wrongThis) score++;
      sfx.good();
      speech.say(text);
      progress.record(GAME, `num:${ctx.counter}`, !wrongThis, { skill: settings.mode === "read" ? "recall" : "listen" });
      els.feedback.innerHTML = `${ui.esc(text)} ✓ <span class="muted">· ${ctx.system === "native" ? "native number" : "Sino-Korean number"} with ${ui.esc(ctx.counter)}</span>`;
      els.feedback.className = "g-feedback feedback-good";
      setTimeout(next, 1300);
    } else {
      b.disabled = true;
      b.classList.add("wrong");
      sfx.bad();
      if (!wrongThis) {
        wrongThis = true;
        missed.push({ char: ctx.counter, roman: ctx.system === "native" ? "native numbers" : "Sino-Korean numbers", say: text });
        progress.record(GAME, `num:${ctx.counter}`, false, { skill: settings.mode === "read" ? "recall" : "listen", answer: b.textContent });
      }
      els.feedback.textContent = ctx.system === "native"
        ? `Counting with ${ctx.counter} uses native numbers (하나 → 한, 둘 → 두, 셋 → 세, 넷 → 네, 스물 → 스무).`
        : `${ctx.counter} uses Sino-Korean numbers (일, 이, 삼…)${ctx.counter === "월" ? ". Watch out: June is 유월 and October is 시월" : ""}.`;
      els.feedback.className = "g-feedback feedback-bad";
    }
  }

  function next() {
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    els.sky.innerHTML = "";
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound });
  }
})();
