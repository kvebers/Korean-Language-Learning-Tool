// Gemini API client for the conversation features. The API key is the learner's own: it is
// stored in this browser's localStorage and sent only to Google's API, never to our server.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const KEY = "klt.gemini";
  const DEFAULT_MODEL = "gemini-3.1-flash-lite";
  const DAILY_LIMIT = 500; // free-tier requests per day for Flash-Lite
  const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }
  function save(cfg) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch {
      // private mode: the key lasts for this page only
    }
  }

  let cfg = load();
  const today = () => new Date().toISOString().slice(0, 10);

  function usage() {
    return cfg.usageDate === today() ? cfg.usage || 0 : 0;
  }

  function countCall() {
    if (cfg.usageDate !== today()) {
      cfg.usageDate = today();
      cfg.usage = 0;
    }
    cfg.usage++;
    save(cfg);
  }

  class GeminiError extends Error {}

  // contents: [{ role: "user" | "model", text }]. Returns the reply text (or parsed JSON when json: true).
  async function generate({ system, contents, json = false, temperature = 0.8 }) {
    if (!cfg.apiKey) throw new GeminiError("Add your Gemini API key first.");
    const body = {
      contents: contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
      generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    let res;
    try {
      res = await fetch(`${ENDPOINT}/${encodeURIComponent(cfg.model || DEFAULT_MODEL)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
        body: JSON.stringify(body),
      });
    } catch {
      throw new GeminiError("Couldn't reach Gemini. Check your internet connection.");
    }
    countCall();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || res.statusText;
      if (res.status === 400 && /api key/i.test(msg)) throw new GeminiError("That API key doesn't work. Check it in the settings.");
      if (res.status === 403) throw new GeminiError(`Gemini refused the key: ${msg}`);
      if (res.status === 404) throw new GeminiError(`Model “${cfg.model || DEFAULT_MODEL}” wasn't found. Check the model name in the settings.`);
      if (res.status === 429) throw new GeminiError("Gemini's rate limit was reached (free tier: about 500 requests a day, and a few per minute). Wait a little and try again.");
      throw new GeminiError(`Gemini error ${res.status}: ${msg}`);
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) throw new GeminiError("Gemini sent an empty reply. Try again.");
    if (!json) return text;
    try {
      return JSON.parse(text.replace(/^```(json)?|```$/g, ""));
    } catch {
      throw new GeminiError("Gemini's reply wasn't in the expected format. Try again.");
    }
  }

  KLT.gemini = {
    DEFAULT_MODEL,
    DAILY_LIMIT,
    GeminiError,
    hasKey: () => !!cfg.apiKey,
    model: () => cfg.model || DEFAULT_MODEL,
    usage,
    setKey(apiKey) {
      cfg.apiKey = apiKey.trim();
      save(cfg);
    },
    setModel(model) {
      cfg.model = model.trim() || DEFAULT_MODEL;
      save(cfg);
    },
    forget() {
      delete cfg.apiKey;
      save(cfg);
    },
    generate,
  };
})();
