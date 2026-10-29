// Korean Typing: learn the 두벌식 keyboard. Keys are read by position (KeyboardEvent.code),
// so it works without a Korean input method. Copy mode shows the text; dictation only plays it.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "hangul-typing";

  // 두벌식 layout: code → [jamo, jamo with Shift]
  const ROWS = [
    [["KeyQ", "ㅂ", "ㅃ"], ["KeyW", "ㅈ", "ㅉ"], ["KeyE", "ㄷ", "ㄸ"], ["KeyR", "ㄱ", "ㄲ"], ["KeyT", "ㅅ", "ㅆ"], ["KeyY", "ㅛ"], ["KeyU", "ㅕ"], ["KeyI", "ㅑ"], ["KeyO", "ㅐ", "ㅒ"], ["KeyP", "ㅔ", "ㅖ"]],
    [["KeyA", "ㅁ"], ["KeyS", "ㄴ"], ["KeyD", "ㅇ"], ["KeyF", "ㄹ"], ["KeyG", "ㅎ"], ["KeyH", "ㅗ"], ["KeyJ", "ㅓ"], ["KeyK", "ㅏ"], ["KeyL", "ㅣ"]],
    [["KeyZ", "ㅋ"], ["KeyX", "ㅌ"], ["KeyC", "ㅊ"], ["KeyV", "ㅍ"], ["KeyB", "ㅠ"], ["KeyN", "ㅜ"], ["KeyM", "ㅡ"]],
  ];
  const KEY_OF = {}; // jamo → { code, shift }
  for (const row of ROWS) for (const [code, plain, shifted] of row) {
    KEY_OF[plain] = { code, shift: false };
    if (shifted) KEY_OF[shifted] = { code, shift: true };
  }
  const SPLIT = {
    ㅘ: "ㅗㅏ", ㅙ: "ㅗㅐ", ㅚ: "ㅗㅣ", ㅝ: "ㅜㅓ", ㅞ: "ㅜㅔ", ㅟ: "ㅜㅣ", ㅢ: "ㅡㅣ",
    ㄳ: "ㄱㅅ", ㄵ: "ㄴㅈ", ㄶ: "ㄴㅎ", ㄺ: "ㄹㄱ", ㄻ: "ㄹㅁ", ㄼ: "ㄹㅂ", ㄽ: "ㄹㅅ", ㄾ: "ㄹㅌ", ㄿ: "ㄹㅍ", ㅀ: "ㄹㅎ", ㅄ: "ㅂㅅ",
  };
  const HOME = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"];

  // Keys to press for a text, grouped per character: 한 → [ㅎ, ㅏ, ㄴ]
  function keysFor(text) {
    return [...text].map((ch) => {
      const d = hangul.decompose(ch);
      const jamo = d ? [d.initial, d.vowel, d.final].filter(Boolean) : [ch];
      return { ch, keys: jamo.flatMap((j) => [...(SPLIT[j] || j)]) };
    });
  }

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), target: $("target"), typed: $("typed"), meaning: $("meaning"),
    keyboard: $("keyboard"), feedback: $("feedback"), qnum: $("qnum"), acc: $("acc"), speed: $("speed"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "set", label: "Practise", value: "home", options: [["home", "Home row letters"], ["letters", "All letters"], ["syllables", "Syllables"], ["words", "My words"]] },
      { key: "mode", label: "Mode", value: "copy", options: [["copy", "Copy what you see"], ["dictation", "Dictation (hear it, type it)"]] },
      { key: "hint", label: "Key hint", value: "on", options: [["on", "Highlight the next key"], ["off", "No hints"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);
  $("replay").addEventListener("click", () => cur && speech.say(cur.text));

  let items = [];
  let idx = 0;
  let cur = null; // { text, word?, groups, pos: [charIdx, keyIdx], errors }
  let hits = 0;
  let errors = 0;
  let missed = [];
  let startedAt = 0;
  let score = 0;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  function renderKeyboard() {
    els.keyboard.innerHTML = ROWS.map((row, r) => `<div class="krow r${r}">${row.map(([code, plain, shifted]) =>
      `<button class="key ${plain.match(/[ㅏ-ㅣ]/) ? "vowel" : "cons"}" data-code="${code}"><b>${plain}</b>${shifted ? `<small>${shifted}</small>` : ""}<i>${code.slice(3)}</i></button>`).join("")}</div>`).join("") +
      `<div class="krow"><button class="key shift" data-code="ShiftLeft">⇧ Shift</button><button class="key space" data-code="Space">space</button></div>`;
    let shiftOn = false;
    els.keyboard.querySelectorAll(".key").forEach((k) => k.addEventListener("click", () => {
      if (k.dataset.code === "ShiftLeft") {
        shiftOn = !shiftOn;
        k.classList.toggle("on", shiftOn);
        return;
      }
      press(k.dataset.code, shiftOn);
      shiftOn = false;
      els.keyboard.querySelector(".shift").classList.remove("on");
    }));
  }

  async function startRound() {
    if (settings.set === "home") items = hangul.shuffle([...HOME, ...HOME]).slice(0, 15).map((t) => ({ text: t }));
    else if (settings.set === "letters") items = hangul.sample(hangul.LETTERS.filter((l) => KEY_OF[l.char] || SPLIT[l.char]), 15).map((l) => ({ text: l.char }));
    else if (settings.set === "syllables") items = hangul.sample([...hangul.pool({ tier: "syl" }), ...hangul.pool({ tier: "batchim" })], 12).map((s) => ({ text: s.char }));
    else items = (await vocab.pick({ n: 10, filter: { test: (w) => /^[가-힣 ]+$/.test(w.ko) }, newLimit: 0 })).words.map((w) => ({ text: w.ko, word: w }));
    idx = hits = errors = score = 0;
    missed = [];
    startedAt = Date.now();
    renderKeyboard();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    els.play.focus();
    ask();
  }

  function ask() {
    const it = items[idx];
    cur = { ...it, groups: keysFor(it.text), c: 0, k: 0, errors: 0 };
    els.qnum.textContent = `${idx + 1} / ${items.length}`;
    els.feedback.textContent = settings.mode === "dictation" ? "Listen and type what you hear." : "";
    els.feedback.className = "g-feedback muted";
    els.meaning.textContent = it.word ? `${it.word.emoji || ""} ${it.word.en}` : "";
    if (settings.mode === "dictation" || it.word) speech.say(it.text);
    render();
  }

  function nextKey() {
    const g = cur.groups[cur.c];
    return g ? g.keys[cur.k] : null;
  }

  function render() {
    const dict = settings.mode === "dictation";
    els.target.innerHTML = cur.groups.map((g, i) =>
      `<span class="${i < cur.c ? "done" : i === cur.c ? "now" : ""}">${dict && i >= cur.c ? "□" : ui.esc(g.ch === " " ? " " : g.ch)}</span>`).join("");
    // the current syllable as typed so far, e.g. ㅎ → 하 → 한
    const g = cur.groups[cur.c];
    let partial = "";
    if (g) {
      const typed = g.keys.slice(0, cur.k);
      partial = typed.length ? composePartial(g.ch, typed.length) : "";
    }
    els.typed.textContent = cur.groups.slice(0, cur.c).map((x) => x.ch).join("") + partial;
    els.keyboard.querySelectorAll(".key").forEach((k) => k.classList.remove("next", "next-shift"));
    const nk = nextKey();
    if (nk && settings.hint === "on") {
      const key = nk === " " ? { code: "Space" } : KEY_OF[nk];
      if (key) {
        els.keyboard.querySelector(`[data-code="${key.code}"]`)?.classList.add("next");
        if (key.shift) els.keyboard.querySelector(".shift")?.classList.add("next");
      }
    }
    els.acc.textContent = hits + errors ? `${Math.round((hits / (hits + errors)) * 100)}%` : "100%";
    const mins = (Date.now() - startedAt) / 60000;
    els.speed.textContent = mins > 0.05 ? Math.round(hits / mins) : 0;
  }

  // What the syllable looks like after the first n of its keys (just the jamo while incomplete).
  function composePartial(ch, n) {
    const d = hangul.decompose(ch);
    if (!d) return ch;
    const keys = keysFor(ch)[0].keys;
    const iLen = 1, vLen = (SPLIT[d.vowel] || d.vowel).length;
    if (n <= iLen) return d.initial;
    if (n < iLen + vLen) return hangul.compose(d.initial, keys[1]);
    if (n === iLen + vLen) return hangul.compose(d.initial, d.vowel);
    return hangul.compose(d.initial, d.vowel, keys[iLen + vLen]) || ch;
  }

  function press(code, shift) {
    if (!cur || els.play.hidden) return;
    const want = nextKey();
    if (want === null) return;
    const wantKey = want === " " ? { code: "Space", shift: false } : KEY_OF[want];
    // Shift doesn't matter for keys without a shifted letter
    const shiftMatters = !!ROWS.flat().find((r) => r[0] === code && r[2]);
    const ok = wantKey && code === wantKey.code && (!shiftMatters || shift === wantKey.shift);
    const keyEl = els.keyboard.querySelector(`[data-code="${code}"]`);
    if (!ok) {
      errors++;
      cur.errors++;
      sfx.bad();
      keyEl?.classList.add("wrong");
      setTimeout(() => keyEl?.classList.remove("wrong"), 250);
      if (cur.errors === 3 && settings.hint === "off") {
        els.feedback.textContent = `Next: ${want} (key ${wantKey.code.replace("Key", "")}${wantKey.shift ? " + Shift" : ""})`;
      }
      render();
      return;
    }
    hits++;
    keyEl?.classList.add("hit");
    setTimeout(() => keyEl?.classList.remove("hit"), 150);
    cur.k++;
    if (cur.k >= cur.groups[cur.c].keys.length) {
      cur.c++;
      cur.k = 0;
    }
    render();
    if (cur.c >= cur.groups.length) done();
  }

  function done() {
    const clean = cur.errors === 0;
    if (clean) score++;
    else missed.push(cur.word || { char: cur.text, roman: hangul.romanize(cur.text), say: cur.text });
    sfx.good();
    if (cur.word && settings.mode === "dictation") progress.record(GAME, cur.word.id, clean, { skill: "listen" });
    els.feedback.textContent = `${cur.text} ✓${cur.word ? ` · ${cur.word.en}` : ""}`;
    els.feedback.className = "g-feedback feedback-good";
    speech.say(cur.text);
    const was = cur;
    cur = null;
    setTimeout(() => {
      idx++;
      if (idx < items.length) return ask();
      els.play.hidden = true;
      ui.endRound(els.summary, GAME, {
        score, total: items.length, startedAt, missed,
        stats: [["Key accuracy", `${hits + errors ? Math.round((hits / (hits + errors)) * 100) : 100}%`], ["Speed", `${els.speed.textContent} keys/min`]],
        onAgain: startRound,
      });
    }, was.text.length > 2 ? 900 : 450);
  }

  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code.startsWith("Key") || e.code === "Space") {
      e.preventDefault();
      press(e.code, e.shiftKey);
    }
  });
})();
