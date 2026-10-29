// Tongue Twisters: say a twister against the clock; speech recognition marks the syllables it
// didn't hear in red, then you re-record just the problem words until they're clean.
(function () {
  const { hangul, speech, sfx, progress, ui } = KLT;
  const GAME = "tongue-twister";
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const STAGES = 5;

  const TWISTERS = [
    // warm-ups (short, A1 sounds)
    { level: "warm-up", ko: "가나다라 마바사 아자차카 타파하", en: "The Korean alphabet chant (ㄱ to ㅎ with ㅏ)." },
    { level: "warm-up", ko: "빨간 사과 파란 사과 노란 사과", en: "Red apple, blue apple, yellow apple. (ㅃ / ㅍ / ㄴ)" },
    { level: "warm-up", ko: "오리 다리 다리 오리", en: "Duck legs, bridge duck. (ㄹ between vowels)" },
    { level: "warm-up", ko: "고기 굽는 거기 그 고기", en: "That meat being grilled over there. (ㄱ / ㄲ sounds)" },
    // classics
    { level: "classic", ko: "간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다", en: "The soy sauce factory's manager is Manager Kang; the soybean paste factory's manager is Manager Jang." },
    { level: "classic", ko: "내가 그린 기린 그림은 잘 그린 기린 그림이고 네가 그린 기린 그림은 잘 못 그린 기린 그림이다", en: "The giraffe I drew is a well-drawn giraffe; the giraffe you drew is a badly drawn giraffe." },
    { level: "classic", ko: "경찰청 철창살은 외철창살이냐 쌍철창살이냐", en: "Are the police station's iron bars single bars or double bars?" },
    { level: "classic", ko: "저기 있는 말뚝이 말 맬 말뚝이냐 말 못 맬 말뚝이냐", en: "Is that stake over there one you can tie a horse to, or not?" },
    { level: "classic", ko: "들의 콩깍지는 깐 콩깍지인가 안 깐 콩깍지인가", en: "Are the bean pods in the field shelled or unshelled?" },
    { level: "classic", ko: "작은 토끼 토끼 통 옆에는 큰 토끼 토끼 통이 있고 큰 토끼 토끼 통 옆에는 작은 토끼 토끼 통이 있다", en: "Next to the small rabbit's box is the big rabbit's box, and next to the big one is the small one." },
    { level: "classic", ko: "앞집 팥죽은 붉은 팥 풋팥죽이고 뒷집 콩죽은 햇콩 단콩 콩죽이다", en: "The house in front makes red-bean porridge; the house behind makes sweet new-bean porridge." },
    { level: "classic", ko: "한양 양장점 옆 한영 양장점 한영 양장점 옆 한양 양장점", en: "Hanyang tailor next to Hanyeong tailor, Hanyeong tailor next to Hanyang tailor." },
  ];
  const DIGITS = { 0: "영", 1: "일", 2: "이", 3: "삼", 4: "사", 5: "오", 6: "육", 7: "칠", 8: "팔", 9: "구" };
  const syllables = (text) => [...text.replace(/\d/g, (d) => DIGITS[d]).replace(/[^가-힣]/g, "")];

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), twister: $("twister"), english: $("english"), heard: $("heard"),
    problems: $("problems"), feedback: $("feedback"), mic: $("mic"), next: $("next"), selfOk: $("self-ok"),
    stage: $("stage"), score: $("score"), clock: $("clock"), modeNote: $("mode-note"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "level", label: "Twisters", value: "mixed", options: [["warm-up", "Warm-ups"], ["classic", "Classics"], ["mixed", "Warm-ups, then classics"]] },
      { key: "time", label: "Clock", value: "1", options: [["1.5", "Relaxed"], ["1", "Normal"], ["0.7", "Speedy"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);
  $("hear").addEventListener("click", () => speech.say(cur.ko, { rate: 0.95 }));
  $("hear-slow").addEventListener("click", () => speech.say(cur.ko, { rate: 0.6 }));
  els.mic.addEventListener("click", () => listen(null));
  els.next.addEventListener("click", next);
  $("skip").addEventListener("click", () => settle(false));
  els.selfOk.addEventListener("click", () => settle(true));

  let queue = [];
  let idx = 0;
  let cur = null;
  let words = []; // [{ text, syl: [{ ch, ok }], clean }]
  let firstClean = false;
  let attempted = false;
  let score = 0;
  let missed = [];
  let startedAt = 0;
  let deadline = 0;
  let clockTimer = null;
  let rec = null;
  let done = false;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
    els.modeNote.textContent = Recognition
      ? "Your browser will ask for microphone access. Speech recognition needs an internet connection."
      : "This browser has no speech recognition (Chrome and Edge do): you'll listen, repeat, and mark yourself.";
  }

  function startRound() {
    const pick = (lvl, n) => hangul.sample(TWISTERS.filter((t) => t.level === lvl), n);
    queue = settings.level === "mixed" ? [...pick("warm-up", 2), ...pick("classic", STAGES - 2)] : pick(settings.level, STAGES);
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function ask() {
    cur = queue[idx];
    done = false;
    attempted = false;
    firstClean = false;
    words = cur.ko.split(" ").map((text) => ({ text, syl: syllables(text).map((ch) => ({ ch, ok: null })), clean: false }));
    els.stage.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.english.textContent = cur.en;
    els.heard.textContent = "";
    els.problems.hidden = true;
    els.next.hidden = true;
    els.mic.hidden = !Recognition;
    els.selfOk.hidden = !!Recognition;
    els.feedback.textContent = Recognition ? "Listen first if you like, then press 🎤 and say it all." : "Listen, say it out loud, and mark yourself.";
    els.feedback.className = "g-feedback muted";
    render();
    // about 0.33 s per syllable, plus a little time to start
    const secs = Math.round((2 + syllables(cur.ko).length * 0.33) * Number(settings.time));
    deadline = Date.now() + secs * 1000;
    clearInterval(clockTimer);
    clockTimer = setInterval(tick, 200);
    tick();
  }

  function tick() {
    const left = Math.max(0, deadline - Date.now());
    els.clock.textContent = `⏱ ${(left / 1000).toFixed(1)}s`;
    els.clock.classList.toggle("low", left < 3000);
    if (left <= 0) clearInterval(clockTimer);
  }

  function render() {
    els.twister.innerHTML = words.map((w, wi) =>
      `<span class="word${w.clean ? " clean" : ""}" data-w="${wi}">${w.syl.map((s) => `<span class="syl ${s.ok === true ? "ok" : s.ok === false ? "bad" : ""}">${ui.esc(s.ch)}</span>`).join("")}</span>`
    ).join(" ");
  }

  // Marks target syllables found (in order) in what was heard: longest common subsequence.
  function align(targetSyl, heardSyl) {
    const n = targetSyl.length, m = heardSyl.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = targetSyl[i] === heardSyl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    const hit = new Array(n).fill(false);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (targetSyl[i] === heardSyl[j]) { hit[i] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    return hit;
  }

  // wordIdx null = the whole twister, otherwise re-recording one problem word
  function listen(wordIdx) {
    if (rec || done) return;
    speechSynthesis.cancel();
    rec = new Recognition();
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    const target = wordIdx === null ? words : [words[wordIdx]];
    const flat = target.flatMap((w) => w.syl);
    const button = wordIdx === null ? els.mic : els.problems.querySelector(`[data-w="${wordIdx}"]`);
    button.classList.add("listening");

    let best = [];
    rec.onresult = (e) => {
      const transcripts = [...e.results].map((r) => r[0].transcript).join(" ");
      const alts = e.results[e.results.length - 1].isFinal ? [...e.results[e.results.length - 1]].map((a) => a.transcript) : [];
      // take whichever reading of the speech matches the most syllables
      let hits = align(flat.map((s) => s.ch), syllables(transcripts));
      for (const alt of alts) {
        const h = align(flat.map((s) => s.ch), syllables(alt));
        if (h.filter(Boolean).length > hits.filter(Boolean).length) hits = h;
      }
      best = hits;
      flat.forEach((s, i) => (s.ok = hits[i]));
      els.heard.textContent = `Heard: “${transcripts}”`;
      render();
    };
    rec.onerror = (e) => {
      const msg = { "no-speech": "Didn't hear anything. Try again.", "not-allowed": "Microphone access was blocked.", network: "Speech recognition needs an internet connection." }[e.error];
      els.feedback.textContent = msg || `Speech recognition error: ${e.error}`;
      els.feedback.className = "g-feedback muted";
    };
    rec.onend = () => {
      button.classList.remove("listening");
      rec = null;
      if (!best.length) return;
      for (const w of target) w.clean = w.syl.every((s) => s.ok);
      if (wordIdx === null && !attempted) {
        attempted = true;
        firstClean = words.every((w) => w.clean) && Date.now() <= deadline;
      }
      sfx[target.every((w) => w.clean) ? "good" : "bad"]();
      render();
      afterAttempt();
    };
    rec.start();
  }

  function afterAttempt() {
    if (words.every((w) => w.clean)) return settle(firstClean);
    // offer the problem words for re-recording
    els.problems.hidden = false;
    els.problems.innerHTML = `<p class="muted">Re-record the red words:</p>` + words.map((w, i) => (w.clean ? "" :
      `<span class="pw"><button class="btn" data-hear="${i}">🔊</button><button class="btn primary" data-w="${i}">🎤 ${ui.esc(w.text)}</button></span>`)).join("");
    els.problems.querySelectorAll("[data-w]").forEach((b) => b.addEventListener("click", () => listen(Number(b.dataset.w))));
    els.problems.querySelectorAll("[data-hear]").forEach((b) => b.addEventListener("click", () => speech.say(words[Number(b.dataset.hear)].text, { rate: 0.7 })));
    els.feedback.textContent = `${words.filter((w) => !w.clean).length} word(s) to fix.`;
    els.feedback.className = "g-feedback feedback-bad";
  }

  function settle(clean) {
    if (done) return;
    done = true;
    clearInterval(clockTimer);
    if (clean) score++;
    else missed.push({ char: cur.ko.split(" ").slice(0, 2).join(" ") + "…", roman: cur.level, say: cur.ko });
    progress.record(GAME, `tt:${TWISTERS.indexOf(cur)}`, clean, { skill: "speak" });
    words.forEach((w) => (w.clean = true));
    render();
    els.problems.hidden = true;
    els.feedback.textContent = clean ? "Stage clear on the first try! 대박!" : "Stage cleared. Come back to say it cleanly and beat the clock on the first try.";
    els.feedback.className = `g-feedback ${clean ? "feedback-good" : "muted"}`;
    els.next.hidden = false;
    els.selfOk.hidden = true;
    if (clean) sfx.win();
  }

  function next() {
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound, title: score === queue.length ? "Silver tongue! 발음 최고!" : "Twisters done!" });
  }
})();
