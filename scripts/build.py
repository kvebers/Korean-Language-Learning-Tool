"""Builds the static (GitHub Pages) version into dist/: games only, no progress tracking."""

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


def main():
    shutil.rmtree(DIST, ignore_errors=True)
    DIST.mkdir()
    shutil.copy2(ROOT / "index.html", DIST / "index.html")
    shutil.copytree(ROOT / "shared", DIST / "shared")
    shutil.copytree(ROOT / "games", DIST / "games", ignore=shutil.ignore_patterns("_template"))
    (DIST / ".nojekyll").touch()  # serve files as-is, no Jekyll processing

    config = (DIST / "shared" / "config.js").read_text(encoding="utf-8")
    if 'mode: "static"' not in config:
        raise SystemExit("shared/config.js must set mode: \"static\" for the Pages build")

    games = sorted(p.name for p in (DIST / "games").iterdir() if p.is_dir())
    print(f"Built {DIST.relative_to(ROOT)}/ with {len(games)} games: {', '.join(games)}")


if __name__ == "__main__":
    main()
