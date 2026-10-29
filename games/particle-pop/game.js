// Particle Pop: a sentence with a gap; pop the particle that fits (role + batchim form).
(function () {
  const { hangul, ko, speech, sfx, progress, ui } = KLT;
  const GAME = "particle-pop";

  const ROLE = {
    topic: { label: "topic 은/는", why: "은/는 marks the topic: what you're talking about (introductions, “as for…”, contrast)." },
    subject: { label: "subject 이/가", why: "이/가 marks the subject: with 있다/없다, 아니다, how something is, or new information." },
    object: { label: "object 을/를", why: "을/를 marks the object: the thing the action is done to." },
    e: { label: "에", why: "에 means to / at: where you go, where something is, or a time." },
    eseo: { label: "에서", why: "에서 means at / in: the place where an action happens." },
    do: { label: "도", why: "도 means also / too, and replaces 은/는, 이/가 or 을/를." },
  };
  const BASIC = ["topic", "subject", "object"];

  const particleFor = (word, role) => (role === "e" ? "에" : role === "eseo" ? "에서" : role === "do" ? "도" : ko.particle(word, role));
  const roleOf = (p) => ({ 은: "topic", 는: "topic", 이: "subject", 가: "subject", 을: "object", 를: "object", 에: "e", 에서: "eseo", 도: "do" })[p];

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), sentence: $("sentence"), english: $("english"), sky: $("sky"),
    feedback: $("feedback"), next: $("next"), qnum: $("qnum"), score: $("score"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "set", label: "Particles", value: "basic", options: [["basic", "은/는 · 이/가 · 을/를"], ["all", "+ 에 · 에서 · 도"]] },
      { key: "english", label: "Translation", value: "on", options: [["on", "Show English"], ["off", "Hide it"]] },
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
  $("replay").addEventListener("click", () => cur && speech.say(full(cur)));
  els.next.addEventListener("click", next);
  document.addEventListener("keydown", (e) => e.key === "Enter" && done && !els.play.hidden && next());

  let queue = [];
  let cur = null;
  let idx = 0;
  let score = 0;
  let wrong = false;
  let done = false;
  let missed = [];
  let startedAt = 0;

  const full = (s) => `${s.before}${s.word}${particleFor(s.word, s.roles[0])} ${s.after}`;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
    els.sky.innerHTML = "";
  }

  async function startRound() {
    const all = KLT.PARTICLE_SENTENCES.map(([before, word, roles, after, en]) => ({ before, word, roles, after, en }))
      .filter((s) => settings.set === "all" || BASIC.includes(s.roles[0]));
    const stats = await progress.stats();
    queue = hangul.weightedSample(all, Math.min(Number(settings.length), all.length), (s) => progress.weight(stats, `g:${s.roles[0]}`));
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function ask() {
    cur = queue[idx];
    wrong = done = false;
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.sentence.innerHTML = `${ui.esc(cur.before)}<b>${ui.esc(cur.word)}</b><span class="gap" id="gap">?</span> ${ui.esc(cur.after)}`;
    els.english.textContent = settings.english === "on" ? cur.en : "";
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    els.next.hidden = true;

    const particles = settings.set === "all" ? ["은", "는", "이", "가", "을", "를", "에", "에서", "도"] : ["은", "는", "이", "가", "을", "를"];
    els.sky.innerHTML = "";
    hangul.shuffle(particles).forEach((p, i) => {
      const b = document.createElement("button");
      b.className = "bubble";
      b.textContent = p;
      b.style.left = `${2 + (i * 96) / particles.length}%`;
      b.style.animationDuration = `${6 + Math.random() * 3}s`;
      b.style.animationDelay = `${-Math.random() * 6}s`;
      b.addEventListener("click", () => pop(b, p));
      els.sky.appendChild(b);
    });
  }

  function pop(b, p) {
    if (done || b.disabled) return;
    const fits = cur.roles.some((r) => particleFor(cur.word, r) === p);
    if (fits) {
      done = true;
      if (!wrong) score++;
      else missed.push({ char: `${cur.word}${p}`, roman: ROLE[roleOf(p)].label, say: full(cur) });
      b.classList.add("popped");
      [...els.sky.children].forEach((x) => (x.disabled = true));
      $("gap").textContent = p;
      $("gap").classList.add("filled");
      sfx.good();
      speech.say(`${cur.before}${cur.word}${p} ${cur.after}`);
      progress.record(GAME, `g:${cur.roles[0]}`, !wrong, { skill: "recall" });
      const other = cur.roles.length > 1 ? ` (${particleFor(cur.word, cur.roles.find((r) => roleOf(p) !== r))} works here too.)` : "";
      els.feedback.textContent = `${ROLE[roleOf(p)].why}${other}`;
      els.feedback.className = "g-feedback feedback-good";
      els.next.hidden = false;
      return;
    }
    if (!wrong) progress.record(GAME, `g:${cur.roles[0]}`, false, { skill: "recall", answer: p });
    wrong = true;
    b.disabled = true;
    b.classList.add("wrong");
    sfx.bad();
    const role = roleOf(p);
    const batchim = ko.hasBatchim(cur.word);
    // same job, wrong shape: 은 vs 는 etc.
    els.feedback.textContent = cur.roles.includes(role)
      ? `Right job, wrong shape: ${cur.word} ends in a ${batchim ? "consonant" : "vowel"}, so it takes ${particleFor(cur.word, role)}.`
      : `${p} would make ${cur.word} the ${ROLE[role].label.split(" ")[0]}. Think about what job ${cur.word} does here.`;
    els.feedback.className = "g-feedback feedback-bad";
  }

  function next() {
    if (!done) return;
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    els.sky.innerHTML = "";
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound });
  }
})();
