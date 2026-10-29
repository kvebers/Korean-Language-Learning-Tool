// Memory Vault: spaced-repetition tower defense. Invaders carry words (due reviews first);
// answering for the front invader destroys it. Missed words return in the next wave.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab, quiz } = KLT;
  const GAME = "memory-vault";
  const LIVES = 5;
  const WAVES = 5;
  const LANES = 3;

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), field: $("field"), banner: $("banner"),
    wave: $("wave"), score: $("score"), lives: $("lives"), qlabel: $("qlabel"), options: $("options"),
    feedback: $("feedback"), pause: $("pause"), dueNote: $("due-note"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      {
        key: "kind",
        label: "Invaders carry",
        value: "mixed",
        options: [
          ["recognize", "Korean (pick the meaning)"],
          ["recall", "Meaning (pick the Korean)"],
          ["listen", "Sound (pick the meaning)"],
          ["mixed", "A mix of all three"],
        ],
      },
      { key: "speed", label: "Speed", value: "1", options: [["0.7", "Calm"], ["1", "Normal"], ["1.4", "Fast"]] },
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

  let pool = [];
  let reserve = []; // words not yet sent
  let recycle = []; // missed words for the next wave
  let enemies = [];
  let target = null;
  let wave = 0;
  let toSpawn = 0;
  let spawnIn = 0;
  let lives = LIVES;
  let score = 0;
  let total = 0;
  let missed = [];
  let startedAt = 0;
  let last = 0;
  let paused = false;
  let running = false;

  $("start-btn").addEventListener("click", startGame);
  els.pause.addEventListener("click", () => setPaused(!paused));
  quiz.bindKeys(els.options, () => running && !paused);
  document.addEventListener("visibilitychange", () => document.hidden && running && setPaused(true));

  async function showStart() {
    running = false;
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
    const { unlocked, stats } = await vocab.state();
    const due = unlocked.filter((w) => progress.isDue(stats[w.id])).length;
    els.dueNote.textContent = due ? `${due} word${due === 1 ? " is" : "s are"} due for review: they attack first.` : "No words are due: you'll defend with your weakest words.";
  }

  async function startGame() {
    const picked = await vocab.pick({ n: 40, filter: { level: settings.level }, newLimit: 3, min: 12 });
    reserve = picked.words;
    // due words lead the attack
    reserve.sort((a, b) => progress.isDue(picked.stats[b.id]) - progress.isDue(picked.stats[a.id]));
    pool = picked.pool.length >= 8 ? picked.pool : vocab.WORDS.slice(0, 60);
    recycle = [];
    enemies.forEach((e) => e.el.remove());
    enemies = [];
    target = null;
    wave = 0;
    lives = LIVES;
    score = total = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    running = true;
    paused = false;
    els.pause.textContent = "⏸ Pause";
    nextWave();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function nextWave() {
    wave++;
    if (wave > WAVES || (!reserve.length && !recycle.length)) return finish(true);
    toSpawn = Math.min(3 + wave, reserve.length + recycle.length);
    spawnIn = 1.2;
    els.wave.textContent = `${wave} / ${WAVES}`;
    els.banner.textContent = `Wave ${wave}`;
    els.banner.hidden = false;
    setTimeout(() => (els.banner.hidden = true), 1200);
    updateHud();
  }

  function kindFor() {
    return settings.kind === "mixed" ? hangul.sample(["recognize", "recognize", "recall", "listen"], 1)[0] : settings.kind;
  }

  function spawn() {
    const word = recycle.length ? recycle.shift() : reserve.shift();
    if (!word) return;
    const q = quiz.question(word, kindFor(), pool);
    const el = document.createElement("div");
    el.className = "invader";
    const label = q.kind === "recognize" ? ui.esc(word.ko) : q.kind === "listen" ? "🔊" : `${word.emoji ? word.emoji + " " : ""}${ui.esc(word.en)}`;
    el.innerHTML = `<span class="body">👾</span><span class="tag${q.kind === "recognize" ? " ko" : ""}">${label}</span>`;
    if (q.kind === "listen") el.addEventListener("click", () => speech.say(word.ko));
    const lane = Math.floor(Math.random() * LANES);
    el.style.top = `${10 + lane * 30}%`;
    els.field.appendChild(el);
    const speed = (0.045 + wave * 0.006) * Number(settings.speed);
    enemies.push({ word, q, el, x: 0, speed, missedOnce: false });
    total++;
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) step(dt);
    requestAnimationFrame(loop);
  }

  function step(dt) {
    if (toSpawn > 0 && (spawnIn -= dt) <= 0) {
      spawn();
      toSpawn--;
      spawnIn = Math.max(1.6, 4 - wave * 0.4) / Number(settings.speed);
    }
    for (const e of enemies) {
      e.x += e.speed * dt;
      e.el.style.left = `calc(${e.x * 88}% - 10px)`;
    }
    const breached = enemies.filter((e) => e.x >= 1);
    for (const e of breached) breach(e);
    if (!running) return;

    const front = enemies.reduce((best, e) => (!best || e.x > best.x ? e : best), null);
    if (front !== target) aim(front);
    if (!enemies.length && toSpawn === 0) nextWave();
  }

  function aim(e) {
    if (target) target.el.classList.remove("target");
    target = e;
    els.options.innerHTML = "";
    if (!e) {
      els.qlabel.textContent = "";
      return;
    }
    e.el.classList.add("target");
    els.qlabel.textContent = e.q.label;
    quiz.renderOptions(els.options, e.q, (opt, correct, btn) => answer(e, opt, correct, btn));
    if (e.q.say) speech.say(e.q.say);
  }

  function answer(e, opt, correct) {
    if (!enemies.includes(e)) return;
    if (correct) {
      sfx.good();
      if (!e.missedOnce) score++;
      progress.record(GAME, e.word.id, !e.missedOnce, { skill: e.q.skill });
      if (e.q.kind !== "recognize") speech.say(e.word.ko);
      els.feedback.textContent = `💥 ${e.word.ko} = ${e.word.en}`;
      els.feedback.className = "g-feedback feedback-good";
      blast(e);
    } else {
      sfx.bad();
      if (!e.missedOnce) {
        e.missedOnce = true;
        missed.push(e.word);
        recycle.push(e.word);
        progress.record(GAME, e.word.id, false, { skill: e.q.skill, answer: opt.word.ko });
      }
      e.speed *= 1.25;
      e.el.classList.add("revealed");
      e.el.querySelector(".tag").innerHTML = `${ui.esc(e.word.ko)} · ${ui.esc(e.word.en)}`;
      els.feedback.textContent = `Shield up! It's ${e.word.ko} (${e.word.en}). Answer again to blast it.`;
      els.feedback.className = "g-feedback feedback-bad";
      speech.say(e.word.ko);
      // fresh options so the second try still means something
      setTimeout(() => {
        if (target === e) {
          e.q = quiz.question(e.word, e.q.kind, pool);
          target = null;
          aim(e);
        }
      }, 900);
    }
    updateHud();
  }

  function blast(e) {
    enemies = enemies.filter((x) => x !== e);
    e.el.classList.add("boom");
    setTimeout(() => e.el.remove(), 400);
    if (target === e) target = null;
  }

  function breach(e) {
    enemies = enemies.filter((x) => x !== e);
    e.el.remove();
    if (target === e) target = null;
    lives--;
    sfx.bad();
    if (!e.missedOnce) {
      missed.push(e.word);
      recycle.push(e.word);
      progress.record(GAME, e.word.id, false, { skill: e.q.skill });
    }
    els.feedback.textContent = `💔 ${e.word.ko} (${e.word.en}) got through!`;
    els.feedback.className = "g-feedback feedback-bad";
    els.field.classList.add("hit");
    setTimeout(() => els.field.classList.remove("hit"), 300);
    updateHud();
    if (lives <= 0) finish(false);
  }

  function updateHud() {
    els.score.textContent = score;
    els.lives.textContent = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(LIVES - Math.max(0, lives));
  }

  function setPaused(p) {
    paused = p;
    els.pause.textContent = p ? "▶ Resume" : "⏸ Pause";
    els.field.classList.toggle("paused", p);
  }

  function finish(won) {
    if (!running) return;
    running = false;
    enemies.forEach((e) => e.el.remove());
    enemies = [];
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, {
      score, total, startedAt, missed,
      title: won ? (lives === LIVES ? "Flawless defense! 완벽해요!" : "The vault holds! 성공!") : "The vault fell… 다시 해 봐요!",
      stats: [["Waves", Math.min(wave, WAVES)], ["Vault", `${Math.max(0, lives)} / ${LIVES}`]],
      onAgain: startGame,
    });
    ui.vocabStatus($("vocab-status"));
  }

  showStart();
})();
