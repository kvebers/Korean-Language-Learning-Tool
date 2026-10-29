// Daily Routine: a board through one day. Match each animated action to its Korean verb to
// move forward; every step ends with a full sentence (time + 에 + object + verb-아요/어요).
(function () {
  const { hangul, ko, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "daily-routine";

  // [hour, verb, emoji, English, object phrase, animation]
  const DAY = [
    [7, "일어나다", "⏰", "wake up", "", "ring"],
    [7, "세수하다", "💦", "wash my face", "", "bob"],
    [7, "양치하다", "🪥", "brush my teeth", "", "shake"],
    [8, "먹다", "🍳", "eat breakfast", "아침을", "bob"],
    [8, "가다", "🏫", "go to school", "학교에", "walk"],
    [9, "공부하다", "📚", "study", "", "bob"],
    [12, "먹다", "🍱", "eat lunch", "점심을", "bob"],
    [3, "운동하다", "🏋️", "exercise", "", "lift"],
    [5, "만나다", "🤝", "meet a friend", "친구를", "shake"],
    [6, "요리하다", "🍳", "cook", "", "shake"],
    [7, "청소하다", "🧹", "clean", "", "sweep"],
    [8, "보다", "📺", "watch TV", "텔레비전을", "glow"],
    [9, "샤워하다", "🚿", "take a shower", "", "bob"],
    [10, "읽다", "📖", "read a book", "책을", "bob"],
    [11, "자다", "😴", "sleep", "", "sleep"],
  ].map(([hour, verb, emoji, en, obj, anim]) => ({ hour, verb, emoji, en, obj, anim }));
  const VERBS = [...new Set(DAY.map((d) => d.verb)), "마시다", "쉬다", "일하다", "놀다", "듣다"];

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), board: $("board"), clock: $("clock"), action: $("action"),
    hint: $("hint"), options: $("options"), feedback: $("feedback"), next: $("next"), step: $("step"), score: $("score"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "hint", label: "English hint", value: "on", options: [["on", "Show it"], ["off", "Animation only"]] },
      { key: "cards", label: "Verb cards", value: "read", options: [["read", "Read them"], ["hear", "Hear them (🔊)"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);
  els.next.addEventListener("click", next);
  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (/^[1-4]$/.test(e.key) && !answered) els.options.children[Number(e.key) - 1]?.querySelector(".pick")?.click();
    else if (e.key === "Enter" && answered) next();
  });

  let pos = 0;
  let score = 0;
  let wrong = false;
  let answered = false;
  let missed = [];
  let startedAt = 0;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  function startRound() {
    pos = score = 0;
    missed = [];
    startedAt = Date.now();
    els.board.innerHTML = DAY.map((s, i) => `<div class="tile" data-i="${i}"><span>${i === 0 ? "🏁" : "?"}</span></div>`).join("") + `<div class="tile goal"><span>🌙</span></div>`;
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  const sentence = (s) => `${ko.native(s.hour, { counter: true })} 시에 ${s.obj ? s.obj + " " : ""}${ko.conjugate(s.verb)}`;

  function ask() {
    const s = DAY[pos];
    wrong = answered = false;
    els.step.textContent = `${pos + 1} / ${DAY.length}`;
    els.score.textContent = score;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    els.next.hidden = true;
    [...els.board.children].forEach((t, i) => {
      t.classList.toggle("here", i === pos);
      t.classList.toggle("passed", i < pos);
    });
    els.board.children[pos].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    els.clock.textContent = `🕐 ${s.hour}:00 ${pos < 6 ? "a.m." : "p.m."}`;
    els.action.innerHTML = `<span class="anim ${s.anim}">${s.emoji}</span>`;
    els.hint.textContent = settings.hint === "on" ? `I ${s.en}` : "";

    const choices = hangul.shuffle([s.verb, ...hangul.sample(VERBS.filter((v) => v !== s.verb), 3)]);
    els.options.innerHTML = "";
    choices.forEach((v, i) => {
      const w = vocab.byKo.get(v);
      const row = document.createElement("div");
      row.className = "vcard";
      row.innerHTML = settings.cards === "hear"
        ? `<button class="btn say">🔊</button><button class="g-option pick"><span class="key">${i + 1}</span>This one</button>`
        : `<button class="g-option ko pick"><span class="key">${i + 1}</span>${ui.esc(v)}</button>`;
      row.querySelector(".pick").addEventListener("click", (e) => choose(e.currentTarget, v, w));
      row.querySelector(".say")?.addEventListener("click", () => speech.say(v));
      els.options.appendChild(row);
    });
  }

  function choose(btn, v, w) {
    if (answered) return;
    const s = DAY[pos];
    if (v !== s.verb) {
      // only the first miss on a step counts against the word
      if (!wrong && w) progress.record(GAME, vocab.byKo.get(s.verb).id, false, { skill: settings.cards === "hear" ? "listen" : "recognize", answer: v });
      wrong = true;
      btn.classList.add("wrong");
      btn.disabled = true;
      sfx.bad();
      speech.say(v);
      els.feedback.textContent = `${v} means “${w ? w.en : "?"}”. Try another card.`;
      els.feedback.className = "g-feedback feedback-bad";
      return;
    }
    answered = true;
    btn.classList.add("right");
    btn.classList.add("ko");
    btn.textContent = v;
    els.options.querySelectorAll(".pick").forEach((b) => (b.disabled = true));
    if (!wrong) {
      score++;
      progress.record(GAME, vocab.byKo.get(v).id, true, { skill: settings.cards === "hear" ? "listen" : "recognize" });
    } else {
      missed.push(vocab.byKo.get(v));
    }
    sfx.good();
    const text = sentence(s);
    speech.say(text);
    els.feedback.innerHTML = `<span class="ko">${ui.esc(text)}</span> <span class="muted">· At ${s.hour} I ${ui.esc(s.en)}.</span>`;
    els.feedback.className = "g-feedback feedback-good";
    const tile = els.board.children[pos];
    tile.querySelector("span").textContent = s.emoji;
    els.next.hidden = false;
  }

  function next() {
    if (!answered) return;
    pos++;
    if (pos < DAY.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, {
      score, total: DAY.length, startedAt, missed,
      title: score === DAY.length ? "A perfect day! 완벽한 하루!" : "Good night! 잘 자요!",
      onAgain: startRound,
    });
  }
})();
