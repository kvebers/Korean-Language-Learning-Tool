// Word Web: link drifting words to the seed word of their topic; avoid the distractors.
(function () {
  const { hangul, speech, sfx, progress, ui, vocab } = KLT;
  const GAME = "word-web";
  const WEBS = 4;
  // topics close enough that their words would be unfair distractors
  const RELATED = { food: ["drink", "shop"], drink: ["food"], family: ["people", "polite"], weather: ["nature"], body: ["health"], health: ["body"], time: ["month", "number"], school: ["work"], place: ["home", "position"], home: ["place", "things"], hobby: ["routine", "action"], feeling: ["describe"] };
  const TOPICS = ["food", "family", "body", "weather", "animal", "color", "clothes", "school", "home", "place", "transport", "hobby", "feeling", "health", "time", "drink"];

  const $ = (id) => document.getElementById(id);
  const els = {
    start: $("start"), play: $("play"), summary: $("summary"), space: $("space"), lasers: $("lasers"), seed: $("seed"),
    feedback: $("feedback"), wnum: $("wnum"), links: $("links"), mistakes: $("mistakes"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "links", label: "Web size", value: "5", options: [["4", "4 links"], ["5", "5 links"], ["7", "7 links"]] },
      { key: "decoys", label: "Distractors", value: "4", options: [["3", "3"], ["4", "4"], ["6", "6"]] },
      { key: "meaning", label: "Nodes show", value: "ko", options: [["ko", "Korean only"], ["both", "Korean + meaning"]] },
    ],
    (values) => {
      settings = values;
      showStart();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));
  $("start-btn").addEventListener("click", startRound);

  let topics = [];
  let web = 0;
  let nodes = [];
  let need = 0;
  let linked = 0;
  let score = 0;
  let total = 0;
  let mistakes = 0;
  let missed = [];
  let startedAt = 0;
  let running = false;
  let last = 0;

  function showStart() {
    running = false;
    els.start.hidden = false;
    els.play.hidden = els.summary.hidden = true;
  }

  async function startRound() {
    const { unlocked } = await vocab.state();
    // prefer topics the learner has unlocked words in
    const count = (t) => unlocked.filter((w) => w.topic === t).length;
    topics = hangul.shuffle(TOPICS).sort((a, b) => count(b) - count(a)).slice(0, 8);
    topics = hangul.shuffle(topics.slice(0, 6)).slice(0, WEBS);
    web = score = total = mistakes = 0;
    missed = [];
    startedAt = Date.now();
    els.start.hidden = els.summary.hidden = true;
    els.play.hidden = false;
    running = true;
    await nextWeb();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  async function nextWeb() {
    web++;
    if (web > WEBS) return finish();
    const topic = topics[web - 1];
    const [label, hubKo] = vocab.TOPICS[topic];
    const hub = vocab.byKo.get(hubKo);
    const n = Number(settings.links);
    const isHub = (w) => w.ko === hubKo;
    const { words } = await vocab.pick({ n, filter: { topic, level: "A", test: (w) => !isHub(w) }, newLimit: 2, min: n });
    const { words: decoys } = await vocab.pick({
      n: Number(settings.decoys),
      filter: { level: "A", test: (w) => w.topic !== topic && !isHub(w) && !(RELATED[topic] || []).includes(w.topic) },
      newLimit: 0,
      min: 10,
    });

    nodes.forEach((nd) => nd.el.remove());
    els.lasers.innerHTML = "";
    nodes = [];
    need = words.length;
    linked = 0;
    els.seed.innerHTML = `<span class="ko">${ui.esc(hubKo)}</span><small>${ui.esc(hub ? hub.en : label)}</small>`;
    els.seed.onclick = () => speech.say(hubKo);
    speech.say(hubKo);
    els.wnum.textContent = `${web} / ${WEBS}`;
    els.feedback.textContent = `Link the words that belong with ${hubKo} (${label.toLowerCase()}).`;
    els.feedback.className = "g-feedback muted";

    const W = els.space.clientWidth, H = els.space.clientHeight;
    for (const [w, good] of hangul.shuffle([...words.map((w) => [w, true]), ...decoys.map((w) => [w, false])])) {
      const el = document.createElement("button");
      el.className = "node";
      el.innerHTML = `<span class="ko">${ui.esc(w.ko)}</span>${settings.meaning === "both" ? `<small>${ui.esc(w.en.split(";")[0])}</small>` : ""}`;
      els.space.appendChild(el);
      // start away from the seed in the middle
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.15;
      const nd = {
        word: w, good, el, done: false,
        x: W / 2 + Math.cos(angle) * W * r, y: H / 2 + Math.sin(angle) * H * r,
        vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
      };
      el.addEventListener("click", () => shoot(nd));
      nodes.push(nd);
    }
    updateHud();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const W = els.space.clientWidth, H = els.space.clientHeight;
    const cx = W / 2, cy = H / 2;
    for (const nd of nodes) {
      const w = nd.el.offsetWidth, h = nd.el.offsetHeight;
      if (nd.done) {
        // linked words settle into an orbit around the seed
        nd.x += (nd.tx - nd.x) * Math.min(1, dt * 3);
        nd.y += (nd.ty - nd.y) * Math.min(1, dt * 3);
      } else {
        nd.x += nd.vx * dt;
        nd.y += nd.vy * dt;
        if (nd.x < w / 2 || nd.x > W - w / 2) nd.vx *= -1;
        if (nd.y < h / 2 || nd.y > H - h / 2) nd.vy *= -1;
        nd.x = Math.min(Math.max(nd.x, w / 2), W - w / 2);
        nd.y = Math.min(Math.max(nd.y, h / 2), H - h / 2);
        // keep clear of the seed
        const dx = nd.x - cx, dy = nd.y - cy, d = Math.hypot(dx, dy) || 1;
        if (d < 90) {
          nd.vx += (dx / d) * 40 * dt * 10;
          nd.vy += (dy / d) * 40 * dt * 10;
        }
        const speed = Math.hypot(nd.vx, nd.vy);
        if (speed > 40) {
          nd.vx *= 40 / speed;
          nd.vy *= 40 / speed;
        }
      }
      nd.el.style.transform = `translate(${nd.x - w / 2}px, ${nd.y - h / 2}px)`;
      if (nd.line) {
        nd.line.setAttribute("x1", cx);
        nd.line.setAttribute("y1", cy);
        nd.line.setAttribute("x2", nd.x);
        nd.line.setAttribute("y2", nd.y);
      }
    }
    requestAnimationFrame(loop);
  }

  function laser(nd, cls) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", cls);
    els.lasers.appendChild(line);
    nd.line = line;
    return line;
  }

  function shoot(nd) {
    if (nd.done || nd.el.disabled) return;
    speech.say(nd.word.ko);
    if (nd.good) {
      nd.done = true;
      linked++;
      score++;
      total++;
      sfx.good();
      laser(nd, "beam");
      nd.el.classList.add("linked");
      if (settings.meaning !== "both") nd.el.insertAdjacentHTML("beforeend", `<small>${ui.esc(nd.word.en.split(";")[0])}</small>`);
      const W = els.space.clientWidth, H = els.space.clientHeight;
      const a = (linked / need) * Math.PI * 2 - Math.PI / 2;
      nd.tx = W / 2 + Math.cos(a) * Math.min(W, H) * 0.36;
      nd.ty = H / 2 + Math.sin(a) * Math.min(W, H) * 0.36;
      progress.record(GAME, nd.word.id, true, { skill: "recognize" });
      els.feedback.textContent = `${nd.word.ko} = ${nd.word.en} ✓`;
      els.feedback.className = "g-feedback feedback-good";
      if (linked === need) {
        els.feedback.textContent = "Web complete! 완성!";
        sfx.win();
        setTimeout(() => running && nextWeb(), 1400);
      }
    } else {
      mistakes++;
      total++;
      missed.push(nd.word);
      sfx.bad();
      const line = laser(nd, "miss");
      nd.el.disabled = true;
      nd.el.classList.add("decoy");
      nd.el.insertAdjacentHTML("beforeend", settings.meaning === "both" ? "" : `<small>${ui.esc(nd.word.en.split(";")[0])}</small>`);
      progress.record(GAME, nd.word.id, false, { skill: "recognize", answer: "linked to the wrong web" });
      els.feedback.textContent = `${nd.word.ko} means “${nd.word.en}”: it belongs to another web.`;
      els.feedback.className = "g-feedback feedback-bad";
      setTimeout(() => {
        line.remove();
        nd.line = null;
      }, 500);
    }
    updateHud();
  }

  function updateHud() {
    els.links.textContent = `${linked} / ${need}`;
    els.mistakes.textContent = mistakes;
  }

  function finish() {
    running = false;
    els.play.hidden = true;
    ui.endRound(els.summary, GAME, {
      score, total, startedAt, missed,
      title: mistakes ? "Webs woven! 잘했어요!" : "Flawless weaving! 완벽해요!",
      stats: [["Webs", WEBS], ["Mistakes", mistakes]],
      onAgain: startRound,
    });
  }
})();
