// Say the Letter: see a Hangul letter and pronounce it. Uses the browser's speech
// recognition when available, otherwise falls back to listening and self-grading.
(function () {
  const { hangul, speech, sfx, progress, ui, speakMatch } = KLT;
  const GAME = "hangul-speak";
  const MAX_TRIES = 3;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), qnum: $("qnum"), score: $("score"), tries: $("tries"),
    letter: $("letter"), reveal: $("reveal"), mic: $("mic"), listen: $("listen"),
    feedback: $("feedback"), self: $("self"), after: $("after"), override: $("override"),
    summary: $("summary"), modeNote: $("mode-note"),
  };

  let settings;
  let queue = [];
  let idx = 0;
  let score = 0;
  let missed = [];
  let current = null;
  let tries = 0;
  let heardHelp = false; // listened to the answer before getting it right
  let result = null; // { pass, heard } once the letter is settled
  let lastHeard = null; // transcript of the latest failed try
  let recognizer = null;
  let listening = false;
  let startedAt = 0;

  settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      {
        key: "check",
        label: "Checking",
        value: Recognition ? "auto" : "self",
        options: [
          ["auto", "Speech recognition"],
          ["self", "Self check (listen & compare)"],
        ],
      },
      { key: "length", label: "Round", value: "10", options: [["10", "10 letters"], ["20", "20 letters"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    }
  );
  ui.voiceNotice($("notice"));

  const auto = () => settings.check === "auto" && !!Recognition;

  $("start-btn").addEventListener("click", startRound);
  els.mic.addEventListener("click", listen);
  els.listen.addEventListener("click", () => {
    speech.say(current.say);
    if (result) return;
    // In self check, hearing the answer is how you compare, so it isn't help.
    if (auto()) heardHelp = true;
    else reveal();
  });
  $("self-ok").addEventListener("click", () => settle(true, null));
  $("self-miss").addEventListener("click", () => settle(false, null));
  els.override.addEventListener("click", () => {
    heardHelp = true; // self-declared, so it doesn't count toward the score
    settle(true, lastHeard);
  });
  $("next").addEventListener("click", next);

  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT") return;
    if (e.key === "Enter" && result) {
      e.preventDefault();
      next();
    } else if (e.key === " " && !result && auto()) {
      e.preventDefault();
      listen();
    }
  });

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = true;
    els.summary.hidden = true;
    els.modeNote.textContent = auto()
      ? "Your browser will ask for microphone access. Speech recognition needs an internet connection."
      : Recognition
        ? "Self check: say it aloud, then press “Hear it” to compare and mark yourself."
        : "This browser has no speech recognition (Chrome and Edge do), so you'll say it aloud and compare with the native sound yourself.";
  }

  async function startRound() {
    const pool = hangul.pool(settings);
    const stats = await progress.stats();
    queue = hangul.weightedSample(pool, Number(settings.length), (l) => progress.weight(stats, l.char));
    idx = 0;
    score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = true;
    els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function ask() {
    current = queue[idx];
    tries = 0;
    heardHelp = false;
    result = null;
    lastHeard = null;
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.letter.textContent = current.char;
    els.reveal.hidden = true;
    els.feedback.textContent = auto() ? "Press Speak (or Space) and say the sound." : "Say the sound out loud, then press “Hear it”.";
    els.feedback.className = "feedback muted";
    els.mic.hidden = !auto();
    els.mic.disabled = false;
    els.self.hidden = true;
    els.after.hidden = true;
    els.override.hidden = true;
    $("next").hidden = false;
    updateTries();
  }

  function updateTries() {
    els.tries.textContent = auto() && !result ? `${MAX_TRIES - tries} tries left` : "";
  }

  function reveal() {
    els.reveal.hidden = false;
    els.reveal.innerHTML = `<b class="ko">${ui.esc(current.say)}</b> · ${ui.esc(current.name)} · ${ui.esc(current.roman)}`;
    if (!auto() && !result) els.self.hidden = false;
  }

  function listen() {
    if (listening || result || !auto()) return;
    speechSynthesis.cancel();
    recognizer = new Recognition();
    recognizer.lang = "ko-KR";
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 5;

    recognizer.onresult = (e) => {
      const alternatives = [...e.results[0]].map((a) => a.transcript.trim());
      const heard = alternatives[0] || "";
      tries++;
      if (alternatives.some((t) => speakMatch.isMatch(current, t))) return settle(true, heard);
      if (tries >= MAX_TRIES) return settle(false, heard);
      lastHeard = heard;
      sfx.bad();
      els.feedback.textContent = `Heard “${heard || "?"}”. Try again.`;
      els.feedback.className = "feedback feedback-bad";
      // recognition is imperfect: let the player overrule it
      els.after.hidden = false;
      els.override.hidden = false;
      $("next").hidden = true;
      updateTries();
    };
    recognizer.onerror = (e) => {
      const messages = {
        "no-speech": "Didn't hear anything. Try again, a bit louder.",
        "not-allowed": "Microphone access was blocked. Allow it in the address bar, or switch Checking to “Self check”.",
        "network": "Speech recognition needs an internet connection. Switch Checking to “Self check” to play offline.",
        "audio-capture": "No microphone found.",
      };
      els.feedback.textContent = messages[e.error] || `Speech recognition error: ${e.error}`;
      els.feedback.className = "feedback muted";
    };
    recognizer.onend = () => {
      listening = false;
      els.mic.classList.remove("listening");
      els.mic.textContent = "🎤 Speak";
    };

    listening = true;
    els.mic.classList.add("listening");
    els.mic.textContent = "Listening…";
    recognizer.start();
  }

  // pass/fail for the current letter; heard = transcript (null in self check)
  function settle(pass, heard) {
    result = { pass, heard };
    reveal();
    els.self.hidden = true;
    els.mic.disabled = true;
    els.after.hidden = false;
    $("next").hidden = false;
    els.override.hidden = pass || !auto();
    updateTries();

    const said = heard ? `Heard “${heard}”. ` : "";
    if (pass) {
      sfx.good();
      els.feedback.textContent = `${said}${heardHelp ? "Good (you listened first, so it doesn't count toward score)" : "Correct! 맞아요!"}`;
      els.feedback.className = "feedback feedback-good";
    } else {
      sfx.bad();
      els.feedback.textContent = `${said}Listen to the correct sound and try it next time.`;
      els.feedback.className = "feedback feedback-bad";
    }
    setTimeout(() => speech.say(current.say), 300);
  }

  function next() {
    if (!result) return;
    if (result.pass && !heardHelp) score++;
    if (!result.pass) missed.push(current);
    progress.record(GAME, current.char, result.pass, {
      assisted: heardHelp,
      ...(result.heard && !result.pass ? { answer: result.heard } : {}),
    });

    idx++;
    if (idx < queue.length) return ask();

    const durationMs = Date.now() - startedAt;
    current = null;
    els.play.hidden = true;
    sfx.win();
    progress.session(GAME, {
      score,
      total: queue.length,
      durationMs,
      missed: [...new Set(missed.map((l) => l.char))],
    });
    ui.summary(els.summary, {
      title: score === queue.length ? "Perfect round! 완벽해요!" : "Round complete",
      stats: [
        ["Score", `${score} / ${queue.length}`],
        ["Accuracy", `${Math.round((score / queue.length) * 100)}%`],
        ["Time", ui.formatTime(durationMs)],
      ],
      missed,
      onAgain: startRound,
    });
  }
})();
