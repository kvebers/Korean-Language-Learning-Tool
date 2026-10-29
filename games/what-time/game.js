// What Time Is It?: read analog clocks and calendar pages in Korean.
// Hours: native + 시; minutes: Sino + 분 (or 반); months: Sino + 월 (유월, 시월); dates: Sino + 일.
(function () {
  const { hangul, ko, speech, sfx, progress, ui } = KLT;
  const GAME = "what-time";
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const month = (n) => (n === 6 ? "유월" : n === 10 ? "시월" : `${ko.sino(n)}월`);
  const hourKo = (h) => `${ko.native(h, { counter: true })} 시`;
  const timeKo = (h, m, half) => `${hourKo(h)}${m ? (half && m === 30 ? " 반" : ` ${ko.sino(m)} 분`) : ""}`;

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), ask: $("ask"), scene: $("scene"), options: $("options"),
    feedback: $("feedback"), next: $("next"), qnum: $("qnum"), score: $("score"), replay: $("replay"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "what", label: "Practise", value: "both", options: [["time", "Clock times"], ["date", "Dates & weekdays"], ["both", "Both"]] },
      { key: "mode", label: "Mode", value: "read", options: [["read", "See it → pick the Korean"], ["listen", "Hear Korean → pick it"]] },
      { key: "ampm", label: "오전 / 오후", value: "off", options: [["off", "Leave out"], ["on", "Include"]] },
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
  $("next").addEventListener("click", next);
  els.replay.addEventListener("click", () => q && speech.say(q.say));
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
    const kinds = settings.what === "both" ? ["time", "date", "weekday", "time"] : settings.what === "time" ? ["time"] : ["date", "weekday"];
    queue = [...Array(Number(settings.length))].map(() => hangul.sample(kinds, 1)[0]);
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function clockSvg(h, m, pm) {
    const hr = ((h % 12) + m / 60) * 30, mn = m * 6;
    const ticks = [...Array(12)].map((_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      return `<text x="${50 + Math.sin(a) * 38}" y="${53.5 + -Math.cos(a) * 38}" text-anchor="middle">${i || 12}</text>`;
    }).join("");
    return `<svg viewBox="0 0 100 100" class="clock">
      <circle cx="50" cy="50" r="47" class="face"/>${ticks}
      <line x1="50" y1="50" x2="${50 + Math.sin((hr * Math.PI) / 180) * 22}" y2="${50 - Math.cos((hr * Math.PI) / 180) * 22}" class="hour"/>
      <line x1="50" y1="50" x2="${50 + Math.sin((mn * Math.PI) / 180) * 33}" y2="${50 - Math.cos((mn * Math.PI) / 180) * 33}" class="minute"/>
      <circle cx="50" cy="50" r="2.5" class="pin"/></svg>
      ${settings.ampm === "on" ? `<div class="ampm">${pm ? "🌇 afternoon / evening" : "🌅 morning"}</div>` : ""}`;
  }

  function calendarHtml(mo, d, weekday, highlight) {
    return `<div class="cal"><div class="cal-top">${new Date(2000, mo - 1).toLocaleString("en", { month: "long" })}</div>
      <div class="cal-day">${d}</div>${highlight ? `<div class="cal-wd">${WEEKDAYS_EN[weekday]}</div>` : ""}</div>`;
  }

  // Options are { ko, en }. Mix-ups of the number system share the right answer's figure
  // (en: null), so they're only used when reading, not when listening.
  function ask() {
    const kind = queue[idx];
    wrong = done = false;
    let right, wrongs, scene, askText;
    const fig = (h, m, pm) => `${h}:${String(m).padStart(2, "0")}${settings.ampm === "on" ? (pm ? " p.m." : " a.m.") : ""}`;
    const monthEn = (mo) => new Date(2000, mo - 1).toLocaleString("en", { month: "long" });
    if (kind === "time") {
      const h = rand(1, 12), m = rand(0, 11) * 5, pm = Math.random() < 0.5;
      const half = m === 30 && Math.random() < 0.5;
      const pre = (isPm) => (settings.ampm === "on" ? `${isPm ? "오후" : "오전"} ` : "");
      const at = (hh, mm, isPm = pm, hf = false) => ({ ko: pre(isPm) + timeKo(hh, mm, hf), en: fig(hh, mm, isPm) });
      right = at(h, m, pm, half);
      wrongs = [
        { ko: `${pre(pm)}${ko.sino(h)} 시${m ? ` ${ko.sino(m)} 분` : ""}`, en: null }, // Sino hour
        m ? { ko: `${pre(pm)}${hourKo(h)} ${ko.native(m)} 분`, en: null } : null, // native minutes
        at((h % 12) + 1, m),
        at(h, (m + 15) % 60),
        at(h === 1 ? 12 : h - 1, (m + 30) % 60),
        settings.ampm === "on" ? at(h, m, !pm, half) : null,
      ];
      scene = clockSvg(h, m, pm);
      askText = "지금 몇 시예요?";
      q = { item: "g:time", rule: "Hours use native numbers (한 시, 두 시, 세 시…), minutes use Sino-Korean (오 분, 십 분…). 30 minutes = 반." };
    } else if (kind === "date") {
      const mo = rand(1, 12), d = rand(1, 28);
      const on = (mm, dd) => ({ ko: `${month(mm)} ${ko.sino(dd)}일`, en: `${monthEn(mm)} ${dd}` });
      right = on(mo, d);
      wrongs = [
        { ko: mo === 6 || mo === 10 ? `${ko.sino(mo)}월 ${ko.sino(d)}일` : `${ko.native(mo)}월 ${ko.sino(d)}일`, en: null },
        { ko: `${month(mo)} ${ko.native(d, { counter: true })} 일`, en: null },
        on((mo % 12) + 1, d),
        on(mo, d + 1),
        on(mo === 1 ? 12 : mo - 1, d),
      ];
      scene = calendarHtml(mo, d);
      askText = "오늘은 몇 월 며칠이에요?";
      q = { item: "g:date", rule: `Months and dates are Sino-Korean: ${month(mo)} ${ko.sino(d)}일.${mo === 6 || mo === 10 ? " June is 유월 and October is 시월 (not 육월 / 십월)." : ""}` };
    } else {
      const wd = rand(0, 6), mo = rand(1, 12), d = rand(1, 28);
      right = { ko: WEEKDAYS[wd], en: WEEKDAYS_EN[wd] };
      wrongs = WEEKDAYS.map((w, i) => ({ ko: w, en: WEEKDAYS_EN[i] })).filter((w) => w.ko !== right.ko);
      scene = calendarHtml(mo, d, wd, true);
      askText = "무슨 요일이에요?";
      q = { item: "g:date", rule: "월 Monday · 화 Tuesday · 수 Wednesday · 목 Thursday · 금 Friday · 토 Saturday · 일 Sunday (moon, fire, water, wood, metal, earth, sun)." };
    }
    const listen = settings.mode === "listen";
    const label = (o) => (listen ? o.en : o.ko);
    const seen = new Set([label(right)]);
    const usable = hangul.shuffle(wrongs.filter((w) => w && (!listen || w.en))).filter((w) => !seen.has(label(w)) && seen.add(label(w)));
    // reading: always include a number-system mix-up when there is one
    usable.sort((a, b) => (listen ? 0 : (a.en === null ? -1 : 0) - (b.en === null ? -1 : 0)));
    const opts = hangul.shuffle([right, ...usable.slice(0, 3)]);
    q = { ...q, right: label(right), say: right.ko, ko: right.ko, en: right.en };

    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.ask.textContent = askText;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    $("next").hidden = true;
    els.replay.hidden = !listen;
    els.scene.innerHTML = listen ? `<div class="listen">🔊</div>` : scene;
    els.options.innerHTML = "";
    opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = `g-option${listen ? "" : " ko"}`;
      b.innerHTML = `<span class="key">${i + 1}</span>${ui.esc(label(o))}`;
      b.addEventListener("click", () => choose(b, label(o)));
      els.options.appendChild(b);
    });
    if (listen) speech.say(right.ko);
  }

  function choose(b, o) {
    if (done || b.disabled) return;
    if (o !== q.right) {
      if (!wrong) progress.record(GAME, q.item, false, { skill: settings.mode === "listen" ? "listen" : "recall", answer: o });
      wrong = true;
      b.disabled = true;
      b.classList.add("wrong");
      sfx.bad();
      els.feedback.textContent = q.rule;
      els.feedback.className = "g-feedback feedback-bad";
      return;
    }
    done = true;
    b.classList.add("right");
    [...els.options.children].forEach((x) => (x.disabled = true));
    if (!wrong) {
      score++;
      progress.record(GAME, q.item, true, { skill: settings.mode === "listen" ? "listen" : "recall" });
    } else {
      missed.push({ char: q.ko, roman: q.en, say: q.ko });
    }
    sfx.good();
    speech.say(q.ko);
    els.feedback.textContent = `${q.ko} ✓ (${q.en})`;
    els.feedback.className = "g-feedback feedback-good";
    if (settings.mode === "listen") els.scene.querySelector(".listen").textContent = q.ko;
    $("next").hidden = false;
  }

  function next() {
    if (!done) return;
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound });
  }
})();
