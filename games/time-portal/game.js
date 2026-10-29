// Time Portal: send a verb card through the right time portal (어제/오늘/내일), then pick
// the conjugated form: -았/었어요 (past), -아/어요 (present), -(으)ㄹ 거예요 (future).
(function () {
  const { hangul, ko, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "time-portal";
  const TENSES = { past: "past", present: "present", future: "future" };

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), cue: $("cue"), card: $("card"), forms: $("forms"),
    feedback: $("feedback"), next: $("next"), qnum: $("qnum"), score: $("score"), futurePortal: $("future-portal"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "tenses", label: "Portals", value: "2", options: [["2", "Yesterday · Today"], ["3", "+ Tomorrow (future)"]] },
      { key: "length", label: "Round", value: "10", options: [["10", "10 cards"], ["15", "15 cards"], ["20", "20 cards"]] },
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
  document.querySelectorAll(".portal").forEach((p) => p.addEventListener("click", () => enter(p)));
  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (stage === "portal" && /^[1-3]$/.test(e.key)) document.querySelectorAll(".portal")[Number(e.key) - 1]?.click();
    else if (stage === "form" && /^[1-4]$/.test(e.key)) els.forms.children[Number(e.key) - 1]?.click();
    else if (stage === "done" && e.key === "Enter") next();
  });

  const CUES = {
    past: { v: ["Yesterday I…", "Last night I…", "Yesterday my friend…"], adj: ["Yesterday it was…"] },
    present: { v: ["Today I…", "Right now I…", "These days I…"], adj: ["Today it is…"] },
    future: { v: ["Tomorrow I'm going to…", "This weekend I'll…"], adj: ["Tomorrow it will be…"] },
  };
  const TIME_WORD = { past: "어제", present: "오늘", future: "내일" };

  let queue = [];
  let card = null;
  let stage = "portal";
  let wrong = false;
  let idx = 0;
  let score = 0;
  let missed = [];
  let startedAt = 0;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  // plain gloss: "to eat" → "eat", "to be cold" → "cold"
  const gloss = (w) => w.en.split(/[;,]/)[0].replace(/^to be /, "").replace(/^to /, "").trim();

  async function startRound() {
    const n = Number(settings.length);
    const usable = (w) => /^[가-힣]+다$/.test(w.ko) && !["이다", "아니다"].includes(w.ko) && w.topic !== "polite";
    const { words } = await vocab.pick({ n, filter: { level: "A", pos: ["v", "adj"], test: usable }, newLimit: 2, min: 20 });
    const tenses = settings.tenses === "3" ? ["past", "present", "future"] : ["past", "present"];
    queue = words.map((w) => ({ word: w, tense: hangul.sample(tenses, 1)[0] }));
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.futurePortal.hidden = settings.tenses !== "3";
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function form(dict, tense) {
    return tense === "future" ? ko.future(dict) : ko.conjugate(dict, tense);
  }

  // Wrong forms that learners actually produce: the other vowel (가었어요), no contraction
  // (가아요), and the other tenses.
  function wrongForms(dict, tense) {
    const stem = dict.slice(0, -1);
    const right = form(dict, tense);
    const out = new Set();
    if (tense === "past") ["았어요", "었어요"].forEach((e) => out.add(stem + e));
    if (tense === "present") ["아요", "어요"].forEach((e) => out.add(stem + e));
    if (tense === "future") out.add(`${stem}을 거예요`).add(`${stem} 거예요`);
    for (const t of Object.keys(TENSES)) if (t !== tense && (t !== "future" || settings.tenses === "3")) out.add(form(dict, t));
    out.delete(right);
    return hangul.shuffle([...out].filter((f) => /^[가-힣 ]+$/.test(f))).slice(0, 3);
  }

  function ask() {
    card = queue[idx];
    stage = "portal";
    wrong = false;
    const w = card.word;
    const kind = w.pos === "adj" ? "adj" : "v";
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.cue.innerHTML = `<span class="en">${ui.esc(hangul.sample(CUES[card.tense][kind], 1)[0])} <b>${ui.esc(gloss(w))}</b></span>`;
    els.card.innerHTML = `${w.emoji ? `<span class="em">${w.emoji}</span>` : ""}<span class="ko">${ui.esc(w.ko)}</span>`;
    els.card.className = "card";
    els.forms.hidden = true;
    els.next.hidden = true;
    els.feedback.textContent = "Which portal?";
    els.feedback.className = "g-feedback muted";
    document.querySelectorAll(".portal").forEach((p) => p.classList.remove("right", "wrong"));
  }

  function enter(portal) {
    if (stage !== "portal") return;
    const t = portal.dataset.tense;
    if (t !== card.tense) {
      wrong = true;
      sfx.bad();
      portal.classList.add("wrong");
      els.feedback.textContent = `${TIME_WORD[t]} isn't it: listen to the sentence's time.`;
      els.feedback.className = "g-feedback feedback-bad";
      return;
    }
    sfx.flip();
    portal.classList.add("right");
    els.card.className = `card into-${t}`;
    stage = "form";
    const right = form(card.word.ko, card.tense);
    const options = hangul.shuffle([right, ...wrongForms(card.word.ko, card.tense)]);
    els.forms.innerHTML = "";
    options.forEach((f, i) => {
      const b = document.createElement("button");
      b.className = "g-option ko";
      b.innerHTML = `<span class="key">${i + 1}</span>${ui.esc(f)}`;
      b.addEventListener("click", () => choose(b, f, right));
      els.forms.appendChild(b);
    });
    els.forms.hidden = false;
    els.feedback.textContent = `${TIME_WORD[t]}: which form comes out?`;
    els.feedback.className = "g-feedback muted";
  }

  function choose(b, f, right) {
    if (stage !== "form") return;
    if (f !== right) {
      wrong = true;
      sfx.bad();
      b.classList.add("wrong");
      b.disabled = true;
      els.feedback.textContent = hintFor(card.word.ko, card.tense);
      els.feedback.className = "g-feedback feedback-bad";
      return;
    }
    stage = "done";
    b.classList.add("right");
    [...els.forms.children].forEach((x) => (x.disabled = true));
    if (!wrong) score++;
    else missed.push({ char: card.word.ko, roman: right, say: right });
    sfx.good();
    speech.say(`${TIME_WORD[card.tense]} ${right}`);
    progress.record(GAME, `g:${card.tense}`, !wrong, { skill: "recall", answer: wrong ? "wrong form/portal" : undefined });
    els.feedback.textContent = `${TIME_WORD[card.tense]} ${right} ✓  (${card.word.ko} = ${card.word.en})`;
    els.feedback.className = "g-feedback feedback-good";
    els.next.hidden = false;
  }

  function hintFor(dict, tense) {
    const stem = dict.slice(0, -1);
    const lastV = (hangul.decompose(stem[stem.length - 1]) || {}).vowel;
    if (stem.endsWith("하")) return "하다 verbs: 해요 / 했어요 / 할 거예요.";
    if (tense === "future") return hangul.decompose(stem[stem.length - 1]).final ? "After a consonant: -을 거예요 (ㄹ-stems: just 거예요)." : "After a vowel: add ㄹ to the stem, then 거예요.";
    const bright = lastV === "ㅏ" || lastV === "ㅗ";
    return `The stem's last vowel is ${lastV}, so it takes ${bright ? "아" : "어"}${tense === "past" ? "ㅆ어요" : "요"}, and vowels merge (가+아→가, 오+아→와, 이+어→여, 우+어→워).`;
  }

  function next() {
    if (stage !== "done") return;
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound });
  }
})();
