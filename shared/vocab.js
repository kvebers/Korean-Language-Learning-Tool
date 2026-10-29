// Vocabulary library (shared/words/*.js) + which words a learner has unlocked.
// Needs shared/hangul.js and shared/progress.js.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const { hangul, progress } = KLT;

  const LEVELS = ["A1", "A2", "B1", "B2"];
  const POS = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", pron: "pronoun", num: "number", cnt: "counter", det: "determiner", exp: "expression" };

  // topic → label and the "hub" word it is built around (used by Word Web)
  const TOPICS = {
    greet: ["Greetings", "인사"], people: ["People", "사람"], question: ["Question words", "질문"],
    family: ["Family", "가족"], food: ["Food", "음식"], drink: ["Drinks", "음료수"], number: ["Numbers & counters", "숫자"],
    month: ["Months", "달력"], time: ["Time", "시간"], home: ["Home", "집"], place: ["Places", "장소"], position: ["Positions", "위치"],
    transport: ["Transport", "교통"], body: ["Body", "몸"], weather: ["Weather & seasons", "날씨"], nature: ["Nature", "자연"],
    animal: ["Animals", "동물"], color: ["Colors", "색"], clothes: ["Clothes", "옷"], school: ["School", "학교"], work: ["Work", "직업"],
    hobby: ["Hobbies", "취미"], routine: ["Daily routine", "일상"], action: ["Actions", "하다"], describe: ["Describing", "모양"],
    adverb: ["Adverbs & connectors", "그리고"], shop: ["Shopping", "쇼핑"], health: ["Health", "건강"], feeling: ["Feelings", "기분"],
    communication: ["Communication", "연락"], polite: ["Polite forms", "존댓말"], things: ["Everyday things", "물건"],
    society: ["Society", "사회"], language: ["Language", "언어"], measure: ["Measurements", "길이"], economy: ["Economy & work", "경제"],
    travel: ["Travel", "여행"], media: ["Media & events", "방송"], relations: ["Relationships", "관계"], life: ["Life", "생활"],
    culture: ["Culture", "문화"], nouns: ["Useful nouns", "것"], research: ["Research & analysis", "연구"], ideas: ["Ideas", "생각"],
    environment: ["Environment", "환경"], tech: ["Technology", "기술"], study: ["Study & stories", "교육"],
  };

  const WORDS = [];
  for (const [level, text] of KLT.WORD_DATA || []) {
    let topic = "misc";
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (line[0] === "@") {
        topic = line.slice(1);
        continue;
      }
      const [ko, en, pos, emoji = ""] = line.split("|");
      WORDS.push({
        id: `w:${ko}`, ko, en, pos, emoji, level, topic, order: WORDS.length,
        // the same fields letters have, so shared UI (chips, summaries) works with words
        char: ko, say: ko, roman: en, type: "word",
      });
    }
  }
  const IDS = WORDS.map((w) => w.id);
  const byId = new Map(WORDS.map((w) => [w.id, w]));
  const byKo = new Map(WORDS.map((w) => [w.ko, w]));

  // Library + learner state: { words, unlocked, stats, info: { unlocked, proficient, needed } }
  async function state() {
    const info = await progress.updateUnlocks(IDS);
    const stats = await progress.stats();
    return { words: WORDS, unlocked: WORDS.slice(0, info.unlocked), stats, info };
  }

  function matches(w, f = {}) {
    return (!f.level || f.level === "all" || w.level === f.level || (f.level === "A" && w.level[0] === "A"))
      && (!f.topic || f.topic === "all" || [].concat(f.topic).includes(w.topic))
      && (!f.pos || [].concat(f.pos).includes(w.pos))
      && (!f.emoji || !!w.emoji)
      && (!f.test || f.test(w));
  }

  // Words for one round of a game, most useful first:
  // due reviews, then a few new words, then the weakest of the rest.
  // filter: { level, topic, pos, emoji, test }
  // preview: also use not-yet-unlocked words of this filter when fewer than `min` are unlocked
  async function pick({ n = 10, filter = {}, newLimit = 5, min = n, preview = true } = {}) {
    const { unlocked, stats } = await state();
    const now = Date.now();
    let pool = unlocked.filter((w) => matches(w, filter));
    if (preview && pool.length < min) {
      const extra = WORDS.filter((w) => !pool.includes(w) && matches(w, filter)).slice(0, min - pool.length);
      pool = pool.concat(extra);
    }
    const due = pool.filter((w) => progress.isDue(stats[w.id], now));
    const fresh = pool.filter((w) => !stats[w.id] || !stats[w.id].seen).slice(0, newLimit);
    const rest = pool.filter((w) => !due.includes(w) && !fresh.includes(w));
    const weighted = hangul.weightedSample(rest, Math.max(0, n - due.length - fresh.length), (w) => progress.weight(stats, w.id, now));
    const chosen = [...hangul.shuffle(due).slice(0, n), ...fresh, ...weighted].slice(0, n);
    return { words: hangul.shuffle(chosen), pool, stats };
  }

  // Wrong answers that are worth thinking about: same part of speech, same topic if possible.
  // "to be cold; chilly" → ["cold", "chilly"]
  const senses = (w) => w.en.split(/[;,]/).map((s) => normalise(s).replace(/^(i m|to be|to|a|an|the) /, "")).filter(Boolean);

  // Near-synonyms (미안합니다 "sorry" / 죄송합니다 "I'm sorry", 계란 / 달걀) never count as wrong answers.
  function overlaps(a, b) {
    const sa = senses(a), sb = senses(b);
    return sa.some((x) => sb.some((y) => x === y || (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x)))));
  }

  function distractors(word, n, pool = WORDS) {
    const usable = (w) => w !== word && w.ko !== word.ko && !overlaps(w, word);
    const sameTopic = pool.filter((w) => usable(w) && w.pos === word.pos && w.topic === word.topic);
    const samePos = pool.filter((w) => usable(w) && w.pos === word.pos && !sameTopic.includes(w));
    const any = WORDS.filter((w) => usable(w) && w.pos === word.pos);
    const out = [...hangul.sample(sameTopic, n)];
    for (const list of [samePos, any]) {
      if (out.length >= n) break;
      out.push(...hangul.sample(list.filter((w) => !out.includes(w)), n - out.length));
    }
    return out.slice(0, n);
  }

  // Normalises a typed answer for comparison: lowercase, no punctuation/brackets.
  function normalise(text) {
    return String(text).toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9가-힣 ]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Does a typed English answer match any sense of the word's meaning?
  function meaningMatches(word, typed) {
    const t = normalise(typed).replace(/^(to be|to|a|an|the) /, "");
    if (!t) return false;
    return word.en.split(/[;,]/).some((sense) => {
      const s = normalise(sense).replace(/^(to be|to|a|an|the) /, "");
      return s && (s === t || (t.length >= 4 && s.includes(t)));
    });
  }

    // Drops words whose meaning overlaps an earlier one, for boards where any pair must be unambiguous.
  function distinct(words) {
    const out = [];
    for (const w of words) if (!out.some((o) => overlaps(o, w))) out.push(w);
    return out;
  }

  KLT.vocab = { WORDS, IDS, LEVELS, POS, TOPICS, byId, byKo, state, pick, matches, distractors, overlaps, distinct, normalise, meaningMatches };
})();
