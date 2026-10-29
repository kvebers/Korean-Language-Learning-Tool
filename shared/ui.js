// Small UI helpers shared by the games: settings bar, voice notice, round summary.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const KEY = "klt.settings";

  // Letter filters every game shares; stored unprefixed so they carry across games.
  const COMMON = [
    {
      key: "tier",
      label: "Letters",
      value: "1",
      options: [
        ["1", "Tier 1 · Basic alphabet"],
        ["2", "Tier 2 · Doubles & compounds"],
        ["all", "All letters"],
        ["syl", "Syllables · 가 나 다"],
        ["batchim", "Syllables with 받침 · 한 국 말"],
      ],
    },
    {
      key: "type",
      label: "Show",
      value: "all",
      options: [
        ["all", "Consonants + vowels"],
        ["consonant", "Consonants only"],
        ["vowel", "Vowels only"],
      ],
    },
  ];

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveAll(values) {
    try {
      localStorage.setItem(KEY, JSON.stringify(values));
    } catch {
      // private mode etc.: settings just won't be remembered
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }

  // Renders <select>s for the common letter filters (unless common: false) plus
  // game-specific `extra` fields. Returns the current values; calls onChange(values) on every change.
  function settingsBar(el, game, extra, onChange, { common = true } = {}) {
    const stored = loadAll();
    // ?tier=syl etc. in the URL presets a setting for this visit, so the home page can link
    // straight to a game's syllable mode without changing what the player chose elsewhere.
    const params = new URLSearchParams(location.search);
    for (const f of COMMON) if (params.has(f.key)) stored[f.key] = params.get(f.key);
    for (const f of extra) if (params.has(f.key)) stored[`${game}.${f.key}`] = params.get(f.key);
    const fields = [...(common ? COMMON : []).map((f) => ({ ...f, storeKey: f.key })), ...extra.map((f) => ({ ...f, storeKey: `${game}.${f.key}` }))];
    const values = {};

    el.innerHTML = "";
    for (const f of fields) {
      const valid = f.options.some(([v]) => v === stored[f.storeKey]);
      values[f.key] = valid ? stored[f.storeKey] : f.value;

      const label = document.createElement("label");
      label.innerHTML = `<span>${esc(f.label)}</span>`;
      const select = document.createElement("select");
      select.innerHTML = f.options
        .map(([v, text]) => `<option value="${esc(v)}">${esc(text)}</option>`)
        .join("");
      select.value = values[f.key];
      select.addEventListener("change", () => {
        values[f.key] = select.value;
        const all = loadAll();
        all[f.storeKey] = select.value;
        saveAll(all);
        onChange({ ...values });
      });
      label.appendChild(select);
      el.appendChild(label);
    }
    return { ...values };
  }

  async function voiceNotice(el) {
    await KLT.speech.ready;
    if (!KLT.speech.supported) {
      el.innerHTML = `<p class="notice">This browser can't play speech, so the games will be silent. Try Chrome or Edge.</p>`;
    } else if (!KLT.speech.hasKoreanVoice()) {
      el.innerHTML = `<p class="notice">No Korean voice found, so pronunciation may be wrong or silent.
        Chrome and Edge include Korean voices. On Windows you can also add one under
        <b>Settings → Time &amp; language → Speech → Add voices → Korean</b>.</p>`;
    }
  }

  // Works for letters, syllables and words (they all have char / roman / say).
  function letterChip(l) {
    return `<button class="chip" data-say="${esc(l.say)}" title="Play sound">
      <span class="chip-char">${esc(l.emoji ? `${l.emoji} ${l.char}` : l.char)}</span><span class="chip-roman">${esc(l.roman)}</span></button>`;
  }

  // Word level filter shared by the vocabulary games.
  const LEVEL_FIELD = {
    key: "level",
    label: "Words",
    value: "all",
    options: [
      ["all", "All my words"],
      ["A1", "A1 only"],
      ["A2", "A2 only"],
      ["A", "A1 + A2"],
    ],
  };

  // A "Unlocked words: 30 · learn 4 more for the next 10" line for word games.
  async function vocabStatus(el) {
    const { info, words } = await KLT.vocab.state();
    el.innerHTML = `<p class="muted vocab-status">📚 <b>${info.unlocked}</b> of ${words.length} words unlocked ·
      ${info.needed ? `learn <b>${info.needed}</b> more to unlock the next ${KLT.progress.VOCAB_STEP}` : "all unlocked"}
      · <a href="../../library/index.html">Word library</a></p>`;
    return info;
  }

  // End-of-round panel. stats: [[label, value]], missed: letter objects.
  function summary(el, { title, stats, missed, onAgain }) {
    const unique = [...new Set(missed)];
    el.innerHTML = `
      <div class="summary panel">
        <h2>${esc(title)}</h2>
        <dl class="stats">${stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${unique.length ? `<h3>Practise these</h3><div class="chips">${unique.map(letterChip).join("")}</div>` : `<p class="muted">No mistakes, great job! 잘했어요!</p>`}
        <div class="actions"><button class="btn primary" data-again>Play again</button>
        <a class="btn" href="../../index.html">All games</a></div>
      </div>`;
    el.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", () => KLT.speech.say(b.dataset.say)));
    el.querySelector("[data-again]").addEventListener("click", onAgain);
    el.hidden = false;
  }

  // Records the round and shows the summary. missed: items (letters, syllables or words).
  function endRound(el, game, { score, total, startedAt, missed = [], onAgain, stats = [], title }) {
    const durationMs = Date.now() - startedAt;
    KLT.sfx.win();
    KLT.progress.session(game, { score, total, durationMs, missed: [...new Set(missed.map((m) => m.id || m.char))] });
    summary(el, {
      title: title || (score === total ? "Perfect round! 완벽해요!" : "Round complete"),
      stats: [
        ["Score", `${score} / ${total}`],
        ["Accuracy", `${total ? Math.round((score / total) * 100) : 0}%`],
        ["Time", formatTime(durationMs)],
        ...stats,
      ],
      missed,
      onAgain,
    });
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function formatTime(ms) {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  KLT.ui = { settingsBar, voiceNotice, summary, endRound, letterChip, esc, formatTime, LEVEL_FIELD, vocabStatus };
})();
