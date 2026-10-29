// Word Match: pair Korean words with their meanings.
// Relaxed: one untimed board, take your time. Speed: matched rows refill against the clock,
// to make recognition of familiar words automatic.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "word-match";
  const SPEED_ROWS = 5;
  const SPEED_TIME = 90e3;

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), left: $("left"), right: $("right"),
    pairs: $("pairs"), mistakes: $("mistakes"), time: $("time"), timebar: $("timebar"), timefill: $("timefill"),
    modeText: $("mode-text"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "mode", label: "Mode", value: "relaxed", options: [["relaxed", "Relaxed (no clock)"], ["speed", "Speed (90 seconds)"]] },
      { key: "pairs", label: "Pairs", value: "6", options: [["5", "5 pairs"], ["6", "6 pairs"], ["8", "8 pairs"]] },
      { key: "side", label: "Show", value: "en", options: [["en", "Korean ↔ English"], ["sound", "Sound ↔ English"]] },
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
  $("start-btn").addEventListener("click", startRound);
  $("quit").addEventListener("click", () => finish());

  let queue = [];
  let selected = null;
  let matched = 0;
  let mistakes = 0;
  let missed = [];
  let startedAt = 0;
  let timer = null;
  let deadline = 0;

  function showStart() {
    clearInterval(timer);
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
    els.modeText.textContent = settings.mode === "speed"
      ? "Match as many pairs as you can in 90 seconds. Matched rows refill with new words. Best with words you already know."
      : "Pair each Korean word with its meaning. No clock: take the time to think about each word. Tap a Korean card to hear it.";
  }

  async function startRound() {
    const speed = settings.mode === "speed";
    const n = speed ? 40 : Number(settings.pairs);
    const { words } = await vocab.pick({ n, filter: { level: settings.level }, newLimit: speed ? 0 : 2, min: speed ? 20 : n });
    queue = vocab.distinct(words); // 미안합니다 "sorry" and 죄송합니다 "I'm sorry" never share a board
    selected = null;
    matched = mistakes = 0;
    missed = [];
    startedAt = Date.now();
    els.left.innerHTML = els.right.innerHTML = "";
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    els.timebar.hidden = !speed;

    const first = queue.splice(0, speed ? SPEED_ROWS : n);
    hangul.shuffle(first).forEach((w) => els.left.appendChild(card("ko", w)));
    hangul.shuffle(first).forEach((w) => els.right.appendChild(card("en", w)));
    clearInterval(timer);
    deadline = Date.now() + SPEED_TIME;
    timer = setInterval(tick, 250);
    tick();
  }

  function card(side, w) {
    const b = document.createElement("button");
    b.className = `wcard ${side}`;
    if (side === "ko") b.innerHTML = settings.side === "sound" ? `<span class="icon">🔊</span>` : ui.esc(w.ko);
    else b.innerHTML = `${w.emoji ? `<span class="em">${w.emoji}</span>` : ""}${ui.esc(w.en)}`;
    b.word = w;
    b.side = side;
    b.addEventListener("click", () => pick(b));
    return b;
  }

  function tick() {
    const speed = settings.mode === "speed";
    const ms = speed ? Math.max(0, deadline - Date.now()) : Date.now() - startedAt;
    els.time.textContent = ui.formatTime(ms);
    els.pairs.textContent = matched;
    els.mistakes.textContent = mistakes;
    if (speed) {
      els.timefill.style.width = `${(ms / SPEED_TIME) * 100}%`;
      if (ms <= 0) finish();
    }
  }

  function pick(b) {
    if (b.disabled) return;
    if (b.side === "ko") speech.say(b.word.ko);
    if (!selected || selected.side === b.side) {
      if (selected) selected.classList.remove("selected");
      selected = b;
      b.classList.add("selected");
      return;
    }
    const ko = b.side === "ko" ? b : selected;
    const en = b.side === "en" ? b : selected;
    selected.classList.remove("selected");
    selected = null;

    if (ko.word === en.word) {
      matched++;
      sfx.good();
      progress.record(GAME, ko.word.id, true, { skill: settings.side === "sound" ? "listen" : "recognize" });
      for (const c of [ko, en]) {
        c.disabled = true;
        c.classList.add("done");
      }
      if (settings.side === "sound") ko.innerHTML = ui.esc(ko.word.ko);
      if (settings.mode === "speed") refill(ko, en);
      else if (matched === els.left.children.length) setTimeout(finish, 600);
    } else {
      mistakes++;
      missed.push(ko.word);
      sfx.bad();
      progress.record(GAME, ko.word.id, false, { skill: settings.side === "sound" ? "listen" : "recognize", answer: en.word.en });
      for (const c of [ko, en]) c.classList.add("miss");
      setTimeout(() => [ko, en].forEach((c) => c.classList.remove("miss")), 600);
    }
    tick();
  }

  // Speed mode: matched cards fade, then a new pair takes their places. The new meaning then
  // swaps with a random card in its column, so the row doesn't give the answer away.
  function refill(ko, en) {
    setTimeout(() => {
      const w = queue.shift();
      if (!w) {
        ko.remove();
        en.remove();
        if (!els.left.children.length) finish();
        return;
      }
      ko.replaceWith(card("ko", w));
      const fresh = card("en", w);
      en.replaceWith(fresh);
      const other = hangul.shuffle([...els.right.children])[0];
      if (other && other !== fresh) {
        const marker = document.createComment("");
        other.replaceWith(marker);
        fresh.replaceWith(other);
        marker.replaceWith(fresh);
      }
    }, 350);
  }

  function finish() {
    if (els.play.hidden) return;
    clearInterval(timer);
    els.play.hidden = true;
    const speed = settings.mode === "speed";
    ui.endRound(els.summary, GAME, {
      score: matched, total: matched + mistakes, startedAt, missed,
      title: speed ? `${matched} pairs in 90 seconds!` : mistakes ? "All pairs matched! 다 맞췄어요!" : "Perfect, no mistakes! 완벽해요!",
      stats: [["Pairs", matched], ["Mistakes", mistakes]],
      onAgain: startRound,
    });
    ui.vocabStatus($("vocab-status"));
  }

  showStart();
})();
