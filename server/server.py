"""Local version: serves the games and records learning progress.

Progress (per-letter correct/wrong counts, mistakes, finished rounds) is stored in
data/progress.json. Uses only the Python standard library.
"""

import argparse
import json
import os
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "progress.json"
LEARNED_STREAK = 3  # correct answers in a row before a letter counts as learned
MAX_MISTAKES = 1000
MAX_SESSIONS = 1000
LOCAL_CONFIG = b'window.KLT_CONFIG = { mode: "local" };\n'

_lock = threading.Lock()


def empty_progress():
    return {"version": 1, "items": {}, "mistakes": [], "sessions": []}


def load():
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return empty_progress()


def save(data):
    DATA_FILE.parent.mkdir(exist_ok=True)
    tmp = DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, DATA_FILE)


def apply_event(data, ev):
    """One answer for one letter. Assisted answers (hint used) are seen but not scored."""
    ts = ev.get("ts") or int(time.time() * 1000)
    item = data["items"].setdefault(
        ev["item"],
        {"seen": 0, "correct": 0, "wrong": 0, "streak": 0, "bestStreak": 0, "learned": False, "lastSeen": None, "games": {}},
    )
    game = item["games"].setdefault(ev["game"], {"correct": 0, "wrong": 0})
    item["seen"] += 1
    item["lastSeen"] = ts
    if ev.get("assisted"):
        return

    if ev["correct"]:
        item["correct"] += 1
        game["correct"] += 1
        item["streak"] += 1
        item["bestStreak"] = max(item["bestStreak"], item["streak"])
    else:
        item["wrong"] += 1
        game["wrong"] += 1
        item["streak"] = 0
        data["mistakes"].append({"ts": ts, "game": ev["game"], "item": ev["item"], "answer": ev.get("answer")})
        del data["mistakes"][:-MAX_MISTAKES]
    item["learned"] = item["streak"] >= LEARNED_STREAK


def valid_event(ev):
    return (
        isinstance(ev, dict)
        and isinstance(ev.get("game"), str) and 0 < len(ev["game"]) <= 64
        and isinstance(ev.get("item"), str) and 0 < len(ev["item"]) <= 16
        and isinstance(ev.get("correct"), bool)
    )


def valid_session(s):
    return isinstance(s, dict) and isinstance(s.get("game"), str) and 0 < len(s["game"]) <= 64


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html; charset=utf-8",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _send(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status, obj):
        self._send(status, json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/shared/config.js":
            return self._send(200, LOCAL_CONFIG, "text/javascript")
        if path == "/api/progress":
            with _lock:
                data = load()
            return self._json(200, {**data, "learnedStreak": LEARNED_STREAK})
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(min(length, 64_000)) or b"null")
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"error": "invalid JSON"})

        if path == "/api/event":
            if not valid_event(body):
                return self._json(400, {"error": "expected {game, item, correct}"})
            with _lock:
                data = load()
                apply_event(data, body)
                save(data)
            return self._json(200, {"ok": True, "item": data["items"][body["item"]]})

        if path == "/api/session":
            if not valid_session(body):
                return self._json(400, {"error": "expected {game, ...}"})
            with _lock:
                data = load()
                data["sessions"].append(body)
                del data["sessions"][:-MAX_SESSIONS]
                save(data)
            return self._json(200, {"ok": True})

        return self._json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        if "/api/" in self.path:  # keep the console readable
            return
        super().log_message(fmt, *args)


class Server(ThreadingHTTPServer):
    # On Windows SO_REUSEADDR lets two servers share a port silently; fail loudly instead.
    allow_reuse_address = os.name != "nt"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-open", action="store_true", help="don't open the browser")
    args = parser.parse_args()

    try:
        server = Server(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT)))
    except OSError as err:
        raise SystemExit(f"Can't use port {args.port} ({err}). Try: make serve PORT=8010")

    url = f"http://localhost:{args.port}/"
    print(f"Korean learning games (local mode) on {url}")
    print(f"Progress is saved to {DATA_FILE.relative_to(ROOT)}. Press Ctrl+C to stop.")
    if not args.no_open:
        threading.Timer(0.5, webbrowser.open, [url]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
