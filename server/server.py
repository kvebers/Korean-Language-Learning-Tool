"""Local version: serves the games and records learning progress.

Progress is stored in data/progress.json. The browser (shared/progress.js) keeps the
learning logic and spaced-repetition schedule; this server only loads and saves the document.
Uses only the Python standard library.
"""

import argparse
import json
import os
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "progress.json"
MAX_BODY = 20_000_000  # bytes; a full vocabulary's progress is well under 1 MB
LOCAL_CONFIG = b'window.KLT_CONFIG = { mode: "local" };\n'

_lock = threading.Lock()


def empty_progress():
    return {"version": 2, "items": {}, "mistakes": [], "sessions": []}


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


def valid_progress(doc):
    return isinstance(doc, dict) and isinstance(doc.get("items"), dict)


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
            return self._json(200, data)
        return super().do_GET()

    def do_PUT(self):
        if self.path.split("?", 1)[0] != "/api/progress":
            return self._json(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length > MAX_BODY:
                return self._json(413, {"error": "too large"})
            body = json.loads(self.rfile.read(length) or b"null")
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"error": "invalid JSON"})
        if not valid_progress(body):
            return self._json(400, {"error": "expected a progress document with items"})
        with _lock:
            save(body)
        return self._json(200, {"ok": True})

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
