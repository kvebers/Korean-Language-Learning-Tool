// Where Is It?: position words (위/아래/앞/뒤/옆/안) + 에 있어요, and 있어요/없어요 questions.
(function () {
  const { hangul, ko, speech, sfx, progress, ui } = KLT;
  const GAME = "where-is-it";

  const POS = { 위: "on / above", 아래: "under", 앞: "in front of", 뒤: "behind", 옆: "next to", 안: "inside" };
  // reference objects; `box` ones can hold things (안)
  const REFS = [
    { ko: "의자", em: "🪑", en: "chair" }, { ko: "침대", em: "🛏️", en: "bed" }, { ko: "상자", em: "📦", en: "box", box: true },
    { ko: "가방", em: "👜", en: "bag", box: true }, { ko: "나무", em: "🌳", en: "tree" }, { ko: "소파", em: "🛋️", en: "sofa" },
  ];
  const THINGS = [
    { ko: "고양이", em: "🐈", en: "the cat" }, { ko: "강아지", em: "🐶", en: "the puppy" }, { ko: "책", em: "📕", en: "the book" },
    { ko: "공", em: "⚽", en: "the ball" }, { ko: "열쇠", em: "🔑", en: "the key" }, { ko: "휴대폰", em: "📱", en: "the phone" }, { ko: "새", em: "🐦", en: "the bird" },
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), ask: $("ask"), askEn: $("ask-en"), scene: $("scene"),
    options: $("options"), feedback: $("feedback"), next: $("next"), qnum: $("qnum"), score: $("score"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "mode", label: "Mode", value: "mixed", options: [["say", "See the picture → pick the sentence"], ["picture", "Read the sentence → pick the picture"], ["mixed", "Mixed, with 있어요/없어요 questions"]] },
      { key: "english", label: "English", value: "on", options: [["on", "Show"], ["off", "Hide"]] },
      { key: "length", label: "Round", value: "10", options: [["10", "10"], ["15", "15"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);
  $("replay").addEventListener("click", () => q && speech.say(q.say));
  els.next.addEventListener("click", next);
  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (/^[1-4]$/.test(e.key)) els.options.children[Number(e.key) - 1]?.click();
    else if (e.key === "Enter" && done) next();
  });

  let queue = [];
  let q = null;
  let idx = 0;
  let score = 0;
  let wrong = false;
  let done = false;
  let missed = [];
  let startedAt = 0;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  function startRound() {
    const kinds = settings.mode === "mixed" ? ["say", "picture", "yesno", "say"] : [settings.mode];
    queue = [...Array(Number(settings.length))].map(() => hangul.sample(kinds, 1)[0]);
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  const positionsFor = (ref) => Object.keys(POS).filter((p) => p !== "안" || ref.box);
  const scene = (ref, thing, pos, small = false) =>
    `<div class="scene${small ? " small" : ""}"><span class="ref">${ref.em}</span><span class="thing at-${pos}">${thing.em}</span></div>`;
  const sentence = (ref, pos) => `${ref.ko} ${pos}에 있어요`;

  function ask() {
    const kind = queue[idx];
    const ref = hangul.sample(REFS, 1)[0];
    const thing = hangul.sample(THINGS, 1)[0];
    const pos = hangul.sample(positionsFor(ref), 1)[0];
    const subj = `${thing.ko}${ko.particle(thing.ko, "subject")}`;
    wrong = done = false;
    els.options.innerHTML = "";
    let opts;

    if (kind === "say") {
      q = { right: sentence(ref, pos), say: `${subj} ${sentence(ref, pos)}`, en: `${cap(thing.en)} is ${POS[pos]} the ${ref.en}.` };
      els.ask.textContent = `${subj} 어디에 있어요?`;
      els.askEn.textContent = settings.english === "on" ? `Where is ${thing.en}?` : "";
      els.scene.innerHTML = scene(ref, thing, pos);
      const others = hangul.sample(positionsFor(ref).filter((p) => p !== pos), 3);
      opts = hangul.shuffle([pos, ...others]).map((p) => ({ html: ui.esc(sentence(ref, p)), value: sentence(ref, p), ko: true }));
      speech.say(els.ask.textContent);
    } else if (kind === "picture") {
      q = { right: pos, say: `${subj} ${sentence(ref, pos)}`, en: `${cap(thing.en)} is ${POS[pos]} the ${ref.en}.` };
      els.ask.textContent = `${subj} ${sentence(ref, pos)}.`;
      els.askEn.textContent = settings.english === "on" ? "Which picture is it?" : "";
      els.scene.innerHTML = "";
      const others = hangul.sample(positionsFor(ref).filter((p) => p !== pos), 3);
      opts = hangul.shuffle([pos, ...others]).map((p) => ({ html: scene(ref, thing, p, true), value: p }));
      speech.say(els.ask.textContent);
    } else {
      // yes/no: is there a [thing] [pos] the [ref]?
      const asked = Math.random() < 0.5 ? pos : hangul.sample(positionsFor(ref).filter((p) => p !== pos), 1)[0];
      const yes = asked === pos;
      q = { right: yes ? "네, 있어요." : "아니요, 없어요.", say: `${ref.ko} ${asked}에 ${subj} 있어요?`, en: yes ? `Yes, there is.` : `No, there isn't: it's ${POS[pos]} the ${ref.en}.` };
      els.ask.textContent = `${ref.ko} ${asked}에 ${subj} 있어요?`;
      els.askEn.textContent = settings.english === "on" ? `Is ${thing.en} ${POS[asked]} the ${ref.en}?` : "";
      els.scene.innerHTML = scene(ref, thing, pos);
      opts = hangul.shuffle(["네, 있어요.", "아니요, 없어요.", "네, 없어요.", "아니요, 있어요."]).map((v) => ({ html: ui.esc(v), value: v, ko: true }));
      speech.say(els.ask.textContent);
    }
    q.kind = kind;

    opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = `g-option${o.ko ? " ko" : ""}${kind === "picture" ? " pic" : ""}`;
      b.innerHTML = `<span class="key">${i + 1}</span>${o.html}`;
      b.addEventListener("click", () => choose(b, o.value));
      els.options.appendChild(b);
    });
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    els.next.hidden = true;
  }

  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  function choose(b, value) {
    if (done || b.disabled) return;
    if (value !== q.right) {
      if (!wrong) progress.record(GAME, "g:location", false, { skill: "recognize", answer: value });
      wrong = true;
      b.disabled = true;
      b.classList.add("wrong");
      sfx.bad();
      els.feedback.textContent = q.kind === "yesno"
        ? "네 goes with 있어요 (yes, there is), 아니요 with 없어요 (no, there isn't). Look at where it really is."
        : "Look again: 위 on/above · 아래 under · 앞 in front · 뒤 behind · 옆 next to · 안 inside";
      els.feedback.className = "g-feedback feedback-bad";
      return;
    }
    done = true;
    b.classList.add("right");
    [...els.options.children].forEach((x) => (x.disabled = true));
    if (!wrong) {
      score++;
      progress.record(GAME, "g:location", true, { skill: "recognize" });
    } else missed.push({ char: q.say, roman: q.en, say: q.say });
    sfx.good();
    speech.say(q.kind === "yesno" ? q.right : q.say);
    els.feedback.textContent = `${q.kind === "yesno" ? q.right : q.say} ✓ ${settings.english === "on" ? `(${q.en})` : ""}`;
    els.feedback.className = "g-feedback feedback-good";
    els.next.hidden = false;
  }

  function next() {
    if (!done) return;
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound });
  }
})();
