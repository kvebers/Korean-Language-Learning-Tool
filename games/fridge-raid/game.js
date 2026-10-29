// Fridge Raid: read a Korean shopping list, drag the pictured groceries into the fridge.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "fridge-raid";
  const LISTS = 5;

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), items: $("items"), fridge: $("fridge"),
    inside: $("inside"), counter: $("counter"), feedback: $("feedback"), lnum: $("lnum"), score: $("score"), mistakes: $("mistakes"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "list", label: "Shopping list", value: "read", options: [["read", "Read it (Korean)"], ["hear", "Hear it (🔊 only)"]] },
      { key: "size", label: "Items", value: "3", options: [["3", "3 per list"], ["4", "4 per list"], ["5", "5 per list"]] },
      { key: "clutter", label: "Kitchen", value: "8", options: [["6", "Tidy (6 items)"], ["8", "Messy (8 items)"], ["12", "Chaos (12 items)"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);

  const FOOD = { topic: ["food", "drink"], emoji: true };
  let pool = [];
  let listNo = 0;
  let list = [];
  let wrongSince = 0; // wrong drops since the last right one
  let score = 0;
  let total = 0;
  let mistakes = 0;
  let missed = [];
  let startedAt = 0;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  async function startRound() {
    const picked = await vocab.pick({ n: 30, filter: FOOD, newLimit: 4, min: 24 });
    pool = picked.pool;
    listNo = score = total = mistakes = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    nextList(picked.words);
  }

  // one emoji per item so pictures are never ambiguous (계란 and 달걀 are both 🥚)
  function uniqueByEmoji(words) {
    const seen = new Set();
    return words.filter((w) => !seen.has(w.emoji) && seen.add(w.emoji));
  }

  function nextList(preferred) {
    listNo++;
    if (listNo > LISTS) return finish();
    const size = Number(settings.size);
    // the first list leads with due and new words, later lists draw from the whole pool
    const candidates = vocab.distinct(uniqueByEmoji([...hangul.shuffle(preferred || []), ...hangul.shuffle(pool)]));
    list = candidates.slice(0, size);
    const used = new Set(list.map((w) => w.emoji));
    const extras = uniqueByEmoji(hangul.shuffle(pool.length > 12 ? pool : vocab.WORDS.filter((w) => vocab.matches(w, FOOD))))
      .filter((w) => !used.has(w.emoji))
      .slice(0, Math.max(0, Number(settings.clutter) - size));
    wrongSince = 0;
    els.lnum.textContent = `${listNo} / ${LISTS}`;
    els.inside.innerHTML = "";
    els.feedback.textContent = "";

    els.items.innerHTML = "";
    for (const w of list) {
      const li = document.createElement("li");
      li.word = w;
      li.innerHTML = settings.list === "hear"
        ? `<button class="btn say">🔊</button><span class="name"></span>`
        : `<span class="name ko">${ui.esc(w.ko)}</span><button class="btn say" title="Hear it">🔊</button>`;
      li.querySelector(".say").addEventListener("click", () => speech.say(w.ko));
      els.items.appendChild(li);
    }
    if (settings.list === "hear") speech.say(list.map((w) => w.ko).join(", "));

    els.counter.innerHTML = "";
    for (const w of hangul.shuffle([...list, ...extras])) {
      const b = document.createElement("button");
      b.className = "grocery";
      b.textContent = w.emoji;
      b.word = w;
      b.setAttribute("aria-label", "grocery item");
      enableDrag(b);
      els.counter.appendChild(b);
    }
    updateHud();
  }

  // Pointer drag (mouse, touch, pen). A tap without moving puts the item straight in the fridge.
  function enableDrag(b) {
    b.addEventListener("pointerdown", (e) => {
      if (b.disabled) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY };
      let moved = false;
      const move = (ev) => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) moved = true;
        b.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
        els.fridge.classList.toggle("over", overFridge(ev));
      };
      const up = (ev) => {
        b.removeEventListener("pointermove", move);
        b.removeEventListener("pointerup", up);
        b.removeEventListener("pointercancel", up);
        b.style.transform = "";
        els.fridge.classList.remove("over");
        if (!moved || overFridge(ev)) drop(b);
      };
      b.addEventListener("pointermove", move);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
    });
  }

  function overFridge(ev) {
    const r = els.fridge.getBoundingClientRect();
    return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  }

  function drop(b) {
    const w = b.word;
    const li = [...els.items.children].find((x) => x.word === w && !x.classList.contains("got"));
    if (li) {
      const first = wrongSince === 0;
      wrongSince = 0;
      total++;
      if (first) score++;
      else missed.push(w);
      progress.record(GAME, w.id, first, { skill: settings.list === "hear" ? "listen" : "recognize" });
      sfx.good();
      speech.say(w.ko);
      li.classList.add("got");
      li.querySelector(".name").textContent = `${w.emoji} ${w.ko} · ${w.en}`;
      b.disabled = true;
      b.classList.add("stored");
      els.inside.appendChild(b);
      els.feedback.textContent = `${w.ko} = ${w.en} ✓`;
      els.feedback.className = "g-feedback feedback-good";
      if ([...els.items.children].every((x) => x.classList.contains("got"))) setTimeout(() => nextList(), 900);
    } else {
      wrongSince++;
      mistakes++;
      sfx.bad();
      b.classList.add("nope");
      setTimeout(() => b.classList.remove("nope"), 500);
      // show what it was, so the picture gets its word too
      els.feedback.textContent = `That's ${w.ko} (${w.en}). It's not on the list.`;
      els.feedback.className = "g-feedback feedback-bad";
      speech.say(w.ko);
    }
    updateHud();
  }

  function updateHud() {
    els.score.textContent = score;
    els.mistakes.textContent = mistakes;
  }

  function finish() {
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, {
      score, total, startedAt, missed,
      title: mistakes ? "Fridge stocked! 냉장고 완성!" : "Perfect shopping! 완벽해요!",
      stats: [["Wrong items", mistakes]],
      onAgain: startRound,
    });
  }
})();
