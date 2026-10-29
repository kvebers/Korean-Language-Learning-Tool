// Character Talk: chat (typed or spoken) with an AI character in simple Korean.
// The character sticks to the learner's level and known words, corrects mistakes, suggests
// replies, and "Help me say…" turns English into Korean. Uses KLT.gemini (learner's own key).
(function () {
  const { hangul, speech, sfx, progress, ui, vocab, gemini } = KLT;
  const GAME = "character-talk";
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const HISTORY = 24; // messages sent to the model (and kept per character)

  const CHARACTERS = {
    minji: {
      name: "민지 Minji", avatar: "🧑‍🎓", desc: "University student in Seoul",
      persona: "민지, a cheerful 22-year-old university student in Seoul who loves K-dramas, 떡볶이 and her cat 나비",
      scenario: "Free conversation: get to know each other, talk about daily life, food, hobbies and plans.",
    },
    cafe: {
      name: "카페 직원 Barista", avatar: "☕", desc: "Ordering at a café in Hongdae",
      persona: "a friendly barista at a café in Hongdae",
      scenario: "The learner is a customer ordering. Ask what they'd like, hot or iced (따뜻한/아이스), size, for here or to go (드시고 가세요? 가져가세요?), and tell the price in won.",
    },
    market: {
      name: "시장 아주머니 Market vendor", avatar: "🧺", desc: "Shopping at a traditional market",
      persona: "a warm, chatty vendor at a traditional market who sells fruit and vegetables",
      scenario: "The learner is shopping. Talk about what you sell, prices in won, quantities with counters (개, 봉지), and allow a little friendly bargaining.",
    },
    classmate: {
      name: "준호 Junho", avatar: "🧑", desc: "New classmate from Busan",
      persona: "준호, a slightly shy new classmate from Busan in a language class",
      scenario: "First meeting: introductions. Ask and answer about name, country, job or studies, age, and hobbies.",
    },
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    chat: $("chat"), suggest: $("suggest"), msg: $("msg"), composer: $("composer"), mic: $("mic"), send: $("send"),
    avatar: $("avatar"), charName: $("char-name"), charDesc: $("char-desc"), setup: $("setup"), setupStatus: $("setup-status"),
    key: $("key"), model: $("model"), usage: $("usage"), helpForm: $("help-form"), helpInput: $("help-input"), helpOut: $("help-out"),
    lookup: $("lookup"),
  };

  let settings = ui.settingsBar(
    $("settings"),
    GAME,
    [
      { key: "char", label: "Talk with", value: "minji", options: Object.entries(CHARACTERS).map(([k, c]) => [k, c.name]) },
      { key: "level", label: "My level", value: "A1", options: [["A1", "A1 · beginner"], ["A2", "A2 · elementary"]] },
      { key: "voice", label: "Voice", value: "auto", options: [["auto", "Read replies aloud"], ["tap", "Only when I tap 🔊"]] },
      { key: "english", label: "Translation", value: "tap", options: [["tap", "Hidden (tap to show)"], ["show", "Always shown"]] },
    ],
    (values) => {
      settings = values;
      loadChat();
    },
    { common: false }
  );
  ui.voiceNotice($("notice"));

  let messages = []; // { role: "user", ko, correction? } | { role: "model", data }
  let busy = false;

  // ---- settings -------------------------------------------------------------

  function refreshSetup() {
    els.model.value = gemini.model();
    els.key.value = "";
    els.key.placeholder = gemini.hasKey() ? "•••••••• (saved; paste a new one to replace it)" : "AIza…";
    els.setupStatus.textContent = gemini.hasKey() ? `· key saved · ${gemini.model()}` : "· add your API key to start";
    els.usage.textContent = `Requests today: ${gemini.usage()} / ~${gemini.DAILY_LIMIT} (free tier for Flash-Lite). Each message, opening line and “Help me say” uses one.`;
    if (!gemini.hasKey()) els.setup.open = true;
  }

  $("key-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (els.key.value.trim()) gemini.setKey(els.key.value);
    gemini.setModel(els.model.value);
    refreshSetup();
    if (gemini.hasKey()) {
      els.setup.open = false;
      if (!messages.length) opening();
    }
  });
  $("forget").addEventListener("click", () => {
    gemini.forget();
    refreshSetup();
  });

  // ---- conversation ---------------------------------------------------------

  const storeKey = () => `klt.talk.${settings.char}`;

  function loadChat() {
    const c = CHARACTERS[settings.char];
    els.avatar.textContent = c.avatar;
    els.charName.textContent = c.name;
    els.charDesc.textContent = c.desc;
    try {
      messages = JSON.parse(localStorage.getItem(storeKey())) || [];
    } catch {
      messages = [];
    }
    render();
    if (!messages.length && gemini.hasKey()) opening();
  }

  function saveChat() {
    try {
      localStorage.setItem(storeKey(), JSON.stringify(messages.slice(-HISTORY)));
    } catch {
      // not remembered
    }
  }

  async function knownWords() {
    const { unlocked, stats } = await vocab.state();
    const known = unlocked.filter((w) => progress.isProficient(stats[w.id]) || stats[w.id]?.seen);
    return (known.length >= 30 ? known : unlocked.length >= 30 ? unlocked : vocab.WORDS.slice(0, 120)).slice(0, 220).map((w) => w.ko);
  }

  async function systemPrompt() {
    const c = CHARACTERS[settings.char];
    const words = await knownWords();
    return `You are ${c.persona}. You are chatting with a ${settings.level} (CEFR) learner of Korean.
Scenario: ${c.scenario}
Rules:
- Write your reply ONLY in natural, polite Korean (해요체). 1–2 short sentences. Grammar suitable for ${settings.level}.
- Prefer words the learner already knows: ${words.join(", ")}. Use at most one word outside that list per reply.
- Keep the conversation going: usually end with one simple question.
- Stay in character and in the scenario. Be warm and encouraging.
- If the learner writes English or mixes languages, still reply in Korean, and show them the Korean in "correction".
Return only JSON in this shape:
{"ko": "your reply in Korean",
 "en": "English translation of your reply",
 "correction": {"ko": "corrected version of the learner's last message, or \\"\\" if it was correct and natural", "note": "very short English explanation of the fix, or \\"\\""},
 "words": [{"ko": "dictionary form", "en": "meaning"}],
 "suggestions": ["2 or 3 short, different Korean replies the learner could give next, at their level"]}
"words" lists 2–4 key words from your reply.`;
  }

  function contents() {
    return messages.slice(-HISTORY).map((m) => (m.role === "user" ? { role: "user", text: m.ko } : { role: "model", text: m.data.ko }));
  }

  async function ask(extraUser) {
    if (busy) return;
    if (!gemini.hasKey()) {
      els.setup.open = true;
      return;
    }
    busy = true;
    els.send.disabled = true;
    const typing = document.createElement("div");
    typing.className = "msg model typing";
    typing.textContent = "…";
    els.chat.appendChild(typing);
    scroll();
    try {
      const turns = contents();
      if (extraUser) turns.push({ role: "user", text: extraUser });
      const data = await gemini.generate({ system: await systemPrompt(), contents: turns, json: true });
      if (!data.ko) throw new gemini.GeminiError("Gemini's reply was missing the Korean text. Try again.");
      // attach the correction to the learner's message it's about
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser && data.correction && data.correction.ko && !extraUser) {
        lastUser.correction = data.correction;
      } else if (lastUser && !extraUser && !lastUser.checked) {
        recordUsedWords(lastUser.ko);
      }
      if (lastUser) lastUser.checked = true;
      messages.push({ role: "model", data });
      saveChat();
      render();
      if (settings.voice === "auto") speech.say(data.ko, { rate: 0.85 });
    } catch (err) {
      showError(err);
    } finally {
      typing.remove();
      busy = false;
      els.send.disabled = false;
      refreshSetup();
    }
  }

  function opening() {
    ask("(Start the conversation now: greet me in character and ask one simple question.)");
  }

  els.composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = els.msg.value.trim();
    if (!text || busy) return;
    messages.push({ role: "user", ko: text });
    els.msg.value = "";
    saveChat();
    render();
    ask();
  });

  $("reset").addEventListener("click", () => {
    messages = [];
    saveChat();
    render();
    if (gemini.hasKey()) opening();
  });

  $("slower").addEventListener("click", () => {
    if (busy) return;
    messages.push({ role: "user", ko: "잘 모르겠어요. 더 쉽게 말해 주세요." });
    saveChat();
    render();
    ask();
  });

  // Learner used library words in a message the AI found correct: counts as active recall.
  function recordUsedWords(text) {
    const seen = new Set();
    for (const token of text.split(/\s+/)) {
      const w = findWord(token);
      if (w && !seen.has(w.id) && w.ko.length >= 2) {
        seen.add(w.id);
        progress.record(GAME, w.id, true, { skill: "speak" });
      }
    }
  }

  // ---- rendering ------------------------------------------------------------

  function scroll() {
    els.chat.scrollTop = els.chat.scrollHeight;
  }

  // Korean text with each word tappable for a lookup.
  function tappable(text) {
    return ui.esc(text).split(/(\s+)/).map((t) => (/[가-힣]/.test(t) ? `<span class="tw">${t}</span>` : t)).join("");
  }

  function render() {
    els.chat.innerHTML = "";
    if (!messages.length) {
      els.chat.innerHTML = `<p class="muted empty">${gemini.hasKey() ? "Starting the conversation…" : "Add your Gemini API key in ⚙️ AI settings above to start chatting."}</p>`;
    }
    for (const m of messages) {
      const el = document.createElement("div");
      if (m.role === "user") {
        el.className = "msg user";
        el.innerHTML = `<div class="ko">${tappable(m.ko)}</div>${m.correction ? `<div class="correction">✏️ <span class="ko">${tappable(m.correction.ko)}</span>
          <button class="btn mini" data-say="${ui.esc(m.correction.ko)}">🔊</button>${m.correction.note ? `<div class="note">${ui.esc(m.correction.note)}</div>` : ""}</div>` : ""}`;
      } else {
        const d = m.data;
        el.className = "msg model";
        el.innerHTML = `<div class="ko">${tappable(d.ko)}</div>
          <div class="tools"><button class="btn mini" data-say="${ui.esc(d.ko)}">🔊</button>
          ${settings.english === "show" ? "" : `<button class="btn mini" data-reveal>EN</button>`}</div>
          <div class="en" ${settings.english === "show" ? "" : "hidden"}>${ui.esc(d.en || "")}</div>
          ${(d.words || []).length ? `<div class="words">${d.words.map((w) => `<button class="chip" data-say="${ui.esc(w.ko)}"><span class="chip-char">${ui.esc(w.ko)}</span><span class="chip-roman">${ui.esc(w.en)}</span></button>`).join("")}</div>` : ""}`;
      }
      els.chat.appendChild(el);
    }
    els.chat.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", () => speech.say(b.dataset.say, { rate: 0.85 })));
    els.chat.querySelectorAll("[data-reveal]").forEach((b) => b.addEventListener("click", () => {
      const en = b.closest(".msg").querySelector(".en");
      en.hidden = !en.hidden;
    }));
    els.chat.querySelectorAll(".tw").forEach((t) => t.addEventListener("click", (e) => lookup(t.textContent, e)));

    // suggested replies from the latest character message
    const lastModel = [...messages].reverse().find((m) => m.role === "model");
    const sugg = lastModel && messages[messages.length - 1] === lastModel ? lastModel.data.suggestions || [] : [];
    els.suggest.innerHTML = sugg.length ? `<span class="muted small">Ideas:</span>` + sugg.map((s) => `<button class="chip sug">${ui.esc(s)}</button>`).join("") : "";
    els.suggest.querySelectorAll(".sug").forEach((b) => b.addEventListener("click", () => {
      els.msg.value = b.textContent;
      els.msg.focus();
      speech.say(b.textContent, { rate: 0.85 });
    }));
    scroll();
  }

  function showError(err) {
    const el = document.createElement("p");
    el.className = "notice";
    el.textContent = err instanceof gemini.GeminiError ? err.message : `Something went wrong: ${err.message}`;
    els.chat.appendChild(el);
    scroll();
  }

  // ---- word lookup (local library first, then the AI's word list) -----------

  // 먹었어요 → 먹다, 학교에 → 학교, 좋아요 → 좋다: try shorter and shorter beginnings.
  function findWord(token) {
    const t = token.replace(/[^가-힣]/g, "");
    for (let n = t.length; n >= 1; n--) {
      const head = t.slice(0, n);
      const w = vocab.byKo.get(head) || vocab.byKo.get(head + "다") || (n >= 2 ? vocab.byKo.get(head + "하다") : null);
      if (w && (n >= 2 || t.length === 1 || w.ko.length > 1)) return w;
    }
    return null;
  }

  function lookup(token, e) {
    const w = findWord(token);
    const fromAi = messages.flatMap((m) => (m.role === "model" ? m.data.words || [] : [])).find((x) => token.includes(x.ko.replace(/다$/, "")));
    els.lookup.innerHTML = w
      ? `${w.emoji ? `<span class="em">${w.emoji}</span>` : ""}<b class="ko">${ui.esc(w.ko)}</b> ${ui.esc(w.en)}
         <span class="pill">${ui.esc(w.level)}</span> <button class="btn mini" data-say="${ui.esc(w.ko)}">🔊</button>`
      : fromAi
        ? `<b class="ko">${ui.esc(fromAi.ko)}</b> ${ui.esc(fromAi.en)} <button class="btn mini" data-say="${ui.esc(fromAi.ko)}">🔊</button>`
        : `<b class="ko">${ui.esc(token)}</b> <span class="muted">not in the word library. Try “Help me say…”.</span>`;
    els.lookup.hidden = false;
    els.lookup.style.left = `${Math.min(e.clientX, innerWidth - 280)}px`;
    els.lookup.style.top = `${e.clientY + 14}px`;
    els.lookup.querySelector("[data-say]")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      speech.say(ev.currentTarget.dataset.say);
    });
    e.stopPropagation();
  }
  document.addEventListener("click", (e) => {
    if (!els.lookup.contains(e.target)) els.lookup.hidden = true;
  });

  // ---- help me say ----------------------------------------------------------

  $("help-btn").addEventListener("click", () => {
    els.helpForm.hidden = !els.helpForm.hidden;
    if (!els.helpForm.hidden) els.helpInput.focus();
  });

  els.helpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = els.helpInput.value.trim();
    if (!text) return;
    els.helpOut.innerHTML = `<p class="muted">Translating…</p>`;
    const last = [...messages].reverse().find((m) => m.role === "model");
    try {
      const data = await gemini.generate({
        system: `You are a friendly Korean tutor for a ${settings.level} learner. Turn what the learner wants to say into short, natural, polite Korean (해요체) at ${settings.level} level.${last ? ` It is a reply to: "${last.data.ko}".` : ""}
Return only JSON: {"ko": "the Korean sentence", "breakdown": [{"ko": "word as used", "base": "dictionary form", "en": "meaning"}], "tip": "one short grammar tip in English"}`,
        contents: [{ role: "user", text }],
        json: true,
        temperature: 0.3,
      });
      els.helpOut.innerHTML = `<div class="help-card">
        <div class="ko big">${ui.esc(data.ko)} <button class="btn mini" data-say="${ui.esc(data.ko)}">🔊</button></div>
        <div class="muted">${ui.esc(hangul.romanize(data.ko))}</div>
        <div class="words">${(data.breakdown || []).map((b) => `<button class="chip" data-say="${ui.esc(b.ko)}"><span class="chip-char">${ui.esc(b.ko)}</span><span class="chip-roman">${ui.esc(b.en)}</span></button>`).join("")}</div>
        ${data.tip ? `<p class="small">💡 ${ui.esc(data.tip)}</p>` : ""}
        <div class="g-row left"><button class="btn primary" id="use-help">Use this</button></div></div>`;
      els.helpOut.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", () => speech.say(b.dataset.say, { rate: 0.8 })));
      $("use-help").addEventListener("click", () => {
        els.msg.value = data.ko;
        els.helpOut.innerHTML = "";
        els.helpForm.hidden = true;
        els.helpInput.value = "";
        els.msg.focus();
      });
      speech.say(data.ko, { rate: 0.8 });
    } catch (err) {
      els.helpOut.innerHTML = `<p class="notice">${ui.esc(err.message)}</p>`;
    }
    refreshSetup();
  });

  // ---- speaking ---------------------------------------------------------------

  if (!Recognition) els.mic.hidden = true;
  let rec = null;
  els.mic.addEventListener("click", () => {
    if (rec) return rec.stop();
    speechSynthesis.cancel();
    rec = new Recognition();
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.onresult = (e) => {
      els.msg.value = [...e.results].map((r) => r[0].transcript).join(" ");
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") showError(new gemini.GeminiError("Microphone access was blocked."));
    };
    rec.onend = () => {
      rec = null;
      els.mic.classList.remove("listening");
      els.msg.focus();
    };
    els.mic.classList.add("listening");
    rec.start();
    sfx.flip();
  });

  refreshSetup();
  loadChat();
})();
