// Sentence Builder: tap tiles into Korean word order. One trap tile has the wrong particle shape.
(function () {
  const { hangul, speech, sfx, progress, ui } = KLT;
  const GAME = "sentence-build";

  // [tiles in order, English, kind, other accepted orders]
  const SENTENCES = [
    [["저는", "학생이에요"], "I am a student.", "order"],
    [["저는", "사과를", "먹어요"], "I eat an apple.", "order"],
    [["친구가", "커피를", "마셔요"], "My friend drinks coffee.", "order"],
    [["저는", "오늘", "학교에", "가요"], "I go to school today.", "order", [["오늘", "저는", "학교에", "가요"]]],
    [["어머니는", "부엌에서", "요리해요"], "Mom cooks in the kitchen.", "order"],
    [["저는", "도서관에서", "책을", "읽어요"], "I read a book at the library.", "order"],
    [["동생이", "방에서", "자요"], "My younger sibling sleeps in the room.", "order"],
    [["우리는", "주말에", "영화를", "봐요"], "We watch a movie on the weekend.", "order", [["주말에", "우리는", "영화를", "봐요"]]],
    [["저는", "어제", "친구를", "만났어요"], "I met a friend yesterday.", "order", [["어제", "저는", "친구를", "만났어요"]]],
    [["고양이가", "의자", "위에", "있어요"], "The cat is on the chair.", "order"],
    [["저는", "고기를", "안", "먹어요"], "I don't eat meat.", "negation"],
    [["오늘은", "비가", "안", "와요"], "It isn't raining today.", "negation"],
    [["저는", "수영을", "못", "해요"], "I can't swim.", "negation"],
    [["저는", "커피를", "좋아하지", "않아요"], "I don't like coffee.", "negation"],
    [["저는", "의사가", "아니에요"], "I'm not a doctor.", "negation"],
    [["지금", "시간이", "없어요"], "I don't have time now.", "negation"],
    [["이름이", "뭐예요?"], "What is your name?", "question"],
    [["화장실이", "어디예요?"], "Where is the bathroom?", "question"],
    [["이거", "얼마예요?"], "How much is this?", "question"],
    [["어디에", "가요?"], "Where are you going?", "question"],
    [["무슨", "음식을", "좋아해요?"], "What food do you like?", "question"],
    [["언제", "한국에", "왔어요?"], "When did you come to Korea?", "question"],
    [["누구를", "기다려요?"], "Who are you waiting for?", "question"],
    [["물", "좀", "주세요"], "Some water, please.", "request"],
    [["김밥", "두", "개", "주세요"], "Two gimbap, please.", "request"],
    [["천천히", "말해", "주세요"], "Please speak slowly.", "request"],
    [["저는", "한국에", "가고", "싶어요"], "I want to go to Korea.", "request"],
    [["저는", "비빔밥을", "먹고", "싶어요"], "I want to eat bibimbap.", "request"],
    [["저는", "한국어를", "할", "수", "있어요"], "I can speak Korean.", "request"],
    [["여기에", "앉아도", "돼요?"], "May I sit here?", "request"],
    [["같이", "점심", "먹을까요?"], "Shall we have lunch together?", "request"],
  ].map(([tiles, en, kind, alts = []]) => ({ tiles, en, kind, alts }));
  const KIND = { order: "Word order", negation: "Negation", question: "Questions", request: "Requests & wishes" };

  // the same particle with the wrong shape: 사과를 → 사과을, 책을 → 책를
  const SWAP = { 은: "는", 는: "은", 이: "가", 가: "이", 을: "를", 를: "을" };
  const NOT_PARTICLE = new Set(["같이"]); // ends in 이 but isn't noun + particle
  function trap(tiles) {
    const candidates = tiles.filter((t) => t.length > 1 && SWAP[t[t.length - 1]] && !NOT_PARTICLE.has(t));
    if (!candidates.length) return null;
    const t = hangul.sample(candidates, 1)[0];
    return t.slice(0, -1) + SWAP[t[t.length - 1]];
  }

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), english: $("english"), answer: $("answer"), tiles: $("tiles"),
    feedback: $("feedback"), check: $("check"), next: $("next"), qnum: $("qnum"), score: $("score"), tag: $("tag"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "kind", label: "Sentences", value: "all", options: [["all", "Everything"], ...Object.entries(KIND)] },
      { key: "trap", label: "Trap tile", value: "on", options: [["on", "Include one"], ["off", "No traps"]] },
      { key: "length", label: "Round", value: "10", options: [["8", "8"], ["10", "10"], ["15", "15"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);
  $("clear").addEventListener("click", () => !checked && (placed = [], render()));
  $("hear").addEventListener("click", () => {
    if (!cur) return;
    hinted = true;
    speech.say(cur.tiles.join(" "));
  });
  els.check.addEventListener("click", check);
  els.next.addEventListener("click", next);
  document.addEventListener("keydown", (e) => {
    if (els.play.hidden || e.target.tagName === "SELECT" || e.key !== "Enter") return;
    checked ? next() : check();
  });

  let queue = [];
  let cur = null;
  let pool = []; // { text, used }
  let placed = []; // indexes into pool
  let checked = false;
  let tries = 0;
  let hinted = false;
  let idx = 0;
  let score = 0;
  let missed = [];
  let startedAt = 0;

  function showStart() {
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  async function startRound() {
    const list = SENTENCES.filter((s) => settings.kind === "all" || s.kind === settings.kind);
    const stats = await progress.stats();
    queue = hangul.weightedSample(list, Math.min(Number(settings.length), list.length), (s) => progress.weight(stats, `g:${s.kind}`));
    idx = score = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    ask();
  }

  function ask() {
    cur = queue[idx];
    checked = hinted = false;
    tries = 0;
    placed = [];
    const extra = settings.trap === "on" ? trap(cur.tiles) : null;
    pool = hangul.shuffle([...cur.tiles, ...(extra ? [extra] : [])]).map((text) => ({ text }));
    els.qnum.textContent = `${idx + 1} / ${queue.length}`;
    els.score.textContent = score;
    els.tag.textContent = KIND[cur.kind];
    els.english.textContent = cur.en;
    els.feedback.textContent = "";
    els.feedback.className = "g-feedback";
    els.check.hidden = false;
    els.next.hidden = true;
    els.answer.classList.remove("good", "bad");
    render();
  }

  function render() {
    els.answer.innerHTML = placed.length ? "" : `<span class="muted">Tap the tiles below in order</span>`;
    placed.forEach((pi, i) => {
      const b = document.createElement("button");
      b.className = "tile placed";
      b.textContent = pool[pi].text;
      b.addEventListener("click", () => {
        if (checked) return;
        placed.splice(i, 1);
        render();
      });
      els.answer.appendChild(b);
    });
    els.tiles.innerHTML = "";
    pool.forEach((t, pi) => {
      const b = document.createElement("button");
      b.className = "tile";
      b.textContent = t.text;
      b.disabled = placed.includes(pi) || checked;
      b.addEventListener("click", () => {
        placed.push(pi);
        sfx.flip();
        render();
      });
      els.tiles.appendChild(b);
    });
  }

  function check() {
    if (checked || !placed.length) return;
    const built = placed.map((pi) => pool[pi].text);
    const ok = [cur.tiles, ...cur.alts].some((order) => order.join(" ") === built.join(" "));
    tries++;
    if (!ok && tries < 2) {
      sfx.bad();
      els.answer.classList.add("bad");
      setTimeout(() => els.answer.classList.remove("bad"), 500);
      els.feedback.textContent = explain(built);
      els.feedback.className = "g-feedback feedback-bad";
      return;
    }
    checked = true;
    const counted = ok && tries === 1 && !hinted;
    if (counted) score++;
    else missed.push({ char: cur.tiles.join(" "), roman: cur.en, say: cur.tiles.join(" ") });
    progress.record(GAME, `g:${cur.kind}`, ok && tries === 1, { skill: "recall", assisted: hinted && ok, answer: ok ? undefined : built.join(" ") });
    els.answer.classList.add(ok ? "good" : "bad");
    if (!ok) {
      placed = cur.tiles.map((t) => pool.findIndex((p) => p.text === t));
      render();
    } else render();
    sfx[ok ? "good" : "bad"]();
    speech.say(cur.tiles.join(" "));
    els.feedback.textContent = ok ? `${counted ? "Correct! 맞아요!" : "Right."} ${cur.tiles.join(" ")}` : `The answer: ${cur.tiles.join(" ")}`;
    els.feedback.className = `g-feedback ${ok ? "feedback-good" : "feedback-bad"}`;
    els.check.hidden = true;
    els.next.hidden = false;
  }

  // a nudge for the second try
  function explain(built) {
    const wrongTile = built.find((t) => !cur.tiles.includes(t));
    if (wrongTile) return `“${wrongTile}” has the wrong particle shape: check whether the word ends in a consonant or a vowel.`;
    if (built.length < cur.tiles.length) return "Some tiles are still missing.";
    const verb = cur.tiles[cur.tiles.length - 1];
    if (built[built.length - 1] !== verb) return "In Korean the verb (or 이에요/있어요…) comes last.";
    if (["안", "못"].some((n) => cur.tiles.includes(n))) return "안 / 못 go directly before the verb.";
    return "Close! Check the order of the middle words: who → when → where → what → verb.";
  }

  function next() {
    if (!checked) return;
    idx++;
    if (idx < queue.length) return ask();
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, { score, total: queue.length, startedAt, missed, onAgain: startRound });
  }
})();
