// Word questions shared by the vocabulary games.
// Kinds: recognize (Korean → meaning), recall (meaning → Korean), listen (sound → meaning),
// type (meaning → type the Korean). Needs shared/vocab.js and shared/ui.js.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const { vocab, ui, hangul } = KLT;
  const esc = (s) => ui.esc(s);

  const KINDS = {
    recognize: { skill: "recognize", label: "What does it mean?" },
    recall: { skill: "recall", label: "How do you say it in Korean?" },
    listen: { skill: "listen", label: "Listen: what does it mean?" },
    type: { skill: "recall", label: "Type it in Korean" },
  };

  // Returns { word, kind, skill, label, prompt (html), options: [{ word, html, ko }], say }
  function question(word, kind, pool) {
    const k = KINDS[kind];
    const wrong = vocab.distractors(word, 3, pool);
    const options = hangul.shuffle([word, ...wrong]).map((w) =>
      kind === "recall" ? { word: w, html: esc(w.ko), ko: true } : { word: w, html: esc(w.en) });
    let prompt;
    if (kind === "recognize") prompt = `<div class="big">${esc(word.ko)}</div><div class="sub">${esc(hangul.romanize(word.ko))}</div>`;
    else if (kind === "listen") prompt = `<div class="emoji">🔊</div><div class="sub">Tap 🔊 to hear it again</div>`;
    else prompt = `${word.emoji ? `<div class="emoji">${word.emoji}</div>` : ""}<div class="en">${esc(word.en)}</div>
      <div class="sub">${esc(vocab.POS[word.pos] || "")}</div>`;
    return { word, kind, skill: k.skill, label: k.label, prompt, options, say: kind === "recall" || kind === "type" ? null : word.ko };
  }

  // Renders 4 answer buttons into `el`; onAnswer(option, correct, button). Keys 1–4 answer.
  function renderOptions(el, q, onAnswer) {
    el.innerHTML = "";
    q.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = `g-option${opt.ko ? " ko" : ""}`;
      b.innerHTML = `<span class="key">${i + 1}</span>${opt.html}`;
      b.addEventListener("click", () => {
        if (b.disabled) return;
        const correct = opt.word === q.word;
        for (const other of el.children) {
          other.disabled = true;
          if (other.opt.word === q.word) other.classList.add("right");
        }
        if (!correct) b.classList.add("wrong");
        onAnswer(opt, correct, b);
      });
      b.opt = opt;
      el.appendChild(b);
    });
  }

  // Typed Korean answer: ignores spaces and punctuation.
  function typedMatches(word, typed) {
    const clean = (s) => String(s).replace(/[\s.?!]/g, "");
    return clean(typed) === clean(word.ko);
  }

  // Number keys 1–4 click the matching option in `el` (while `active()` is true).
  function bindKeys(el, active) {
    document.addEventListener("keydown", (e) => {
      if (!active() || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (/^[1-4]$/.test(e.key)) el.children[Number(e.key) - 1]?.click();
    });
  }

  // Detail card for a word (used when introducing it or after a mistake).
  function card(word) {
    return `<div class="word-card">
      ${word.emoji ? `<div class="emoji">${word.emoji}</div>` : ""}
      <div class="ko">${esc(word.ko)}</div>
      <div class="roman">${esc(hangul.romanize(word.ko))}</div>
      <div class="en">${esc(word.en)}</div>
      <div class="meta">${esc(vocab.POS[word.pos] || word.pos)} · ${esc(word.level)} · ${esc((vocab.TOPICS[word.topic] || [word.topic])[0])}</div>
    </div>`;
  }

  KLT.quiz = { KINDS, question, renderOptions, typedMatches, bindKeys, card };
})();
