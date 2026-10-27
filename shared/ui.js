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

  // Renders <select>s for the common filters plus game-specific `extra` fields.
  // Returns the current values; calls onChange(values) on every change.
  function settingsBar(el, game, extra, onChange) {
    const stored = loadAll();
    const fields = [...COMMON.map((f) => ({ ...f, storeKey: f.key })), ...extra.map((f) => ({ ...f, storeKey: `${game}.${f.key}` }))];
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

  function letterChip(l) {
    return `<button class="chip" data-say="${esc(l.say)}" title="Play sound">
      <span class="chip-char">${esc(l.char)}</span><span class="chip-roman">${esc(l.roman)}</span></button>`;
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

  function formatTime(ms) {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  KLT.ui = { settingsBar, voiceNotice, summary, letterChip, esc, formatTime };
})();
