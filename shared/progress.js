// Progress tracking. Only active when served by the local server (mode "local");
// in the static GitHub Pages build every call is a no-op.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const enabled = (window.KLT_CONFIG || {}).mode === "local";

  async function post(path, body) {
    try {
      await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn("[KLT] progress not saved", err);
    }
  }

  KLT.progress = {
    enabled,

    // One answer for one letter. extra: { answer, assisted }
    record(game, item, correct, extra = {}) {
      if (enabled) post("/api/event", { game, item, correct, ...extra, ts: Date.now() });
    },

    // End-of-round summary: { score, total, durationMs, missed: [chars] }
    session(game, summary) {
      if (enabled) post("/api/session", { game, ...summary, ts: Date.now() });
    },

    async stats() {
      if (!enabled) return {};
      try {
        const res = await fetch("/api/progress");
        return (await res.json()).items || {};
      } catch {
        return {};
      }
    },

    // Higher weight = shown more often: unseen and often-missed letters come up first.
    weight(stats, char) {
      const s = stats[char];
      if (!s) return 1.5;
      let w = 1 + Math.min(s.wrong, 6) * 0.5;
      if (s.learned) w *= 0.4;
      return w;
    },
  };
})();
