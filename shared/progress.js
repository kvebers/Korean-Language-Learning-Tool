// Progress tracking + spaced repetition for letters, syllables and words.
//
// Local version (make serve): the whole progress document lives in data/progress.json
// (GET/PUT /api/progress). Static version (GitHub Pages): it lives in this browser's localStorage.
//
// Scheduling is a Leitner-style system: every correct answer that comes when an item is
// (nearly) due moves it up a box and pushes its next review further out; a mistake moves it
// down and brings it back in 10 minutes. Answers given before an item is due still count
// toward accuracy, but don't move it up (cramming doesn't build long-term memory).
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const mode = (window.KLT_CONFIG || {}).mode === "local" ? "local" : "static";
  const STORE_KEY = "klt.progress";

  const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
  // box → time until the next review
  const INTERVALS = [0, 10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY, 180 * DAY];
  const MAX_BOX = INTERVALS.length - 1;
  const LEARNED_STREAK = 3; // correct answers in a row: "learned" (also unlocks new words)
  const KNOWN_BOX = 3; // remembered after a gap of a day or more
  const MASTERED_BOX = 5;
  const MAX_LOG = 400;

  // Skills: recognising a word (Korean → meaning), recalling it (meaning → Korean),
  // understanding it by ear, and saying it.
  const SKILLS = { recognize: "Recognition", recall: "Recall", listen: "Listening", speak: "Speaking", write: "Writing" };

  // Vocabulary unlocking: start with START words; whenever all but UNLOCK_SLACK of the
  // unlocked words are learned, the next STEP unlock.
  const VOCAB_START = 20;
  const VOCAB_STEP = 10;
  const UNLOCK_SLACK = 0.2;

  function empty() {
    return { version: 2, items: {}, mistakes: [], sessions: [], vocab: { unlocked: VOCAB_START }, daily: {} };
  }

  // Older documents (version 1: letters only) gain the new fields here.
  function upgrade(doc) {
    doc = doc && typeof doc === "object" ? doc : empty();
    doc.items = doc.items || {};
    doc.mistakes = doc.mistakes || [];
    doc.sessions = doc.sessions || [];
    doc.vocab = doc.vocab || { unlocked: VOCAB_START };
    if (!doc.daily) {
      // rebuild the activity history from finished rounds recorded before it existed
      doc.daily = {};
      for (const s of doc.sessions) {
        if (!s.ts || typeof s.score !== "number") continue;
        const day = (doc.daily[new Date(s.ts).toISOString().slice(0, 10)] ||= { correct: 0, wrong: 0 });
        day.correct += s.score;
        day.wrong += Math.max(0, (s.total || 0) - s.score);
      }
    }
    for (const item of Object.values(doc.items)) {
      if (item.box === undefined) {
        // letters learned before scheduling existed start in the 1-day box
        item.box = item.learned ? 2 : item.correct ? 1 : 0;
        item.due = (item.lastSeen || Date.now()) + INTERVALS[item.box];
      }
      item.skills = item.skills || {};
      item.games = item.games || {};
    }
    doc.version = 2;
    return doc;
  }

  // ---- storage ------------------------------------------------------------

  let doc = null;
  const ready = (async () => {
    if (mode === "local") {
      try {
        doc = upgrade(await (await fetch("/api/progress")).json());
      } catch (err) {
        console.warn("[KLT] couldn't load progress from the local server", err);
        doc = empty();
      }
    } else {
      try {
        doc = upgrade(JSON.parse(localStorage.getItem(STORE_KEY)));
      } catch {
        doc = empty();
      }
    }
    return doc;
  })();

  let writing = false, dirty = false;
  async function persist() {
    if (mode === "static") {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(doc));
      } catch (err) {
        console.warn("[KLT] progress not saved", err);
      }
      return;
    }
    // one request at a time; a change made meanwhile is sent right after
    if (writing) return void (dirty = true);
    writing = true;
    try {
      await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
    } catch (err) {
      console.warn("[KLT] progress not saved", err);
    }
    writing = false;
    if (dirty) {
      dirty = false;
      persist();
    }
  }

  // ---- scheduling ---------------------------------------------------------

  function newItem(now) {
    return { seen: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0, learned: false, lastSeen: null, firstSeen: now, box: 0, due: now, games: {}, skills: {} };
  }

  function apply(ev) {
    const now = ev.ts || Date.now();
    const item = (doc.items[ev.item] = doc.items[ev.item] || newItem(now));
    const game = (item.games[ev.game] = item.games[ev.game] || { correct: 0, wrong: 0 });
    item.seen++;
    item.lastSeen = now;
    if (ev.assisted) return item; // hint used: seen, but not scored

    const day = new Date(now).toISOString().slice(0, 10);
    const today = (doc.daily[day] = doc.daily[day] || { correct: 0, wrong: 0 });
    const skill = ev.skill && (item.skills[ev.skill] = item.skills[ev.skill] || { correct: 0, wrong: 0 });

    if (ev.correct) {
      item.correct++;
      game.correct++;
      today.correct++;
      if (skill) skill.correct++;
      item.streak++;
      item.bestStreak = Math.max(item.bestStreak, item.streak);
      const interval = INTERVALS[item.box];
      if (item.box === 0 || now >= item.due - interval / 2) item.box = Math.min(item.box + 1, MAX_BOX);
      item.due = Math.max(item.due, now + INTERVALS[item.box]);
    } else {
      item.wrong++;
      game.wrong++;
      today.wrong++;
      if (skill) skill.wrong++;
      item.streak = 0;
      item.box = Math.max(1, Math.floor(item.box / 2));
      item.due = now + INTERVALS[1];
      doc.mistakes.push({ ts: now, game: ev.game, item: ev.item, answer: ev.answer ?? null });
      doc.mistakes.splice(0, doc.mistakes.length - MAX_LOG);
    }
    item.learned = item.streak >= LEARNED_STREAK;
    return item;
  }

  function status(item, now = Date.now()) {
    if (!item || !item.seen) return "new";
    if (item.box >= MASTERED_BOX) return "mastered";
    if (item.box >= KNOWN_BOX) return "known";
    if (item.wrong > item.correct) return "struggling";
    return "learning";
  }

  const isDue = (item, now = Date.now()) => !!item && item.box > 0 && item.due <= now;
  // Ready to move on: answered right 3 times in a row, or remembered after a day's gap.
  const isProficient = (item) => !!item && (item.learned || item.box >= KNOWN_BOX);

  // ---- vocabulary unlocking -----------------------------------------------

  // ids: every word id in unlock order. Unlocks more words while the learner is ready.
  // Returns { unlocked, proficient, needed } where needed = words to learn before the next batch.
  function updateUnlocks(ids) {
    let unlocked = Math.min(doc.vocab.unlocked || VOCAB_START, ids.length);
    let proficient, needed;
    for (;;) {
      proficient = ids.slice(0, unlocked).filter((id) => isProficient(doc.items[id])).length;
      needed = Math.max(0, Math.ceil(unlocked * (1 - UNLOCK_SLACK)) - proficient);
      if (needed > 0 || unlocked >= ids.length) break;
      unlocked = Math.min(unlocked + VOCAB_STEP, ids.length);
    }
    if (unlocked !== doc.vocab.unlocked) {
      doc.vocab.unlocked = unlocked;
      persist();
    }
    return { unlocked, proficient, needed };
  }

  // ---- public API ---------------------------------------------------------

  KLT.progress = {
    mode,
    enabled: true,
    ready,
    SKILLS,
    INTERVALS,
    LEARNED_STREAK,
    KNOWN_BOX,
    MASTERED_BOX,
    VOCAB_STEP,

    // One answer for one item. extra: { answer, assisted, skill }
    // Resolves with the updated item.
    async record(game, item, correct, extra = {}) {
      await ready;
      const updated = apply({ game, item, correct, ...extra, ts: Date.now() });
      persist();
      return updated;
    },

    // End-of-round summary: { score, total, durationMs, missed: [ids] }
    async session(game, summary) {
      await ready;
      doc.sessions.push({ game, ...summary, ts: Date.now() });
      doc.sessions.splice(0, doc.sessions.length - MAX_LOG);
      persist();
    },

    async load() {
      await ready;
      return doc;
    },

    async stats() {
      await ready;
      return doc.items;
    },

    status,
    isDue,
    isProficient,

    // Higher weight = shown more often: due, unseen and often-missed items come up first.
    weight(stats, id, now = Date.now()) {
      const s = stats[id];
      if (!s) return 1.5;
      let w = 1 + Math.min(s.wrong, 6) * 0.5;
      if (isDue(s, now)) w *= 2;
      else if (s.box >= KNOWN_BOX) w *= 0.3;
      else if (s.learned) w *= 0.4;
      return w;
    },

    async updateUnlocks(ids) {
      await ready;
      return updateUnlocks(ids);
    },

    // Whole document, for export; import replaces it.
    async exportJSON() {
      await ready;
      return JSON.stringify(doc, null, 1);
    },
    async importJSON(text) {
      await ready;
      doc = upgrade(JSON.parse(text));
      await persist();
    },
    async reset() {
      await ready;
      doc = empty();
      await persist();
    },
  };
})();
