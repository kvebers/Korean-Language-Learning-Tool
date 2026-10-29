"""Scaffolds games/<name>/ from games/_template and registers it in shared/games.js."""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "  // @new-game"


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", sys.argv[1]):
        raise SystemExit("usage: make new-game NAME=my-game   (lowercase letters, digits and dashes)")
    name = sys.argv[1]
    target = ROOT / "games" / name
    if target.exists():
        raise SystemExit(f"games/{name} already exists")

    shutil.copytree(ROOT / "games" / "_template", target)
    title = name.replace("-", " ").title()
    for file in target.iterdir():
        text = file.read_text(encoding="utf-8")
        file.write_text(text.replace("__GAME_ID__", name).replace("__GAME_TITLE__", title), encoding="utf-8")

    registry = ROOT / "shared" / "games.js"
    text = registry.read_text(encoding="utf-8")
    entry = (
        "  {\n"
        f'    id: "{name}",\n'
        f'    title: "{title}",\n'
        '    ko: "",\n'
        '    desc: "TODO: describe the game.",\n'
        "    tier: 1,\n"
        "  },\n"
    )
    registry.write_text(text.replace(MARKER, entry + MARKER, 1), encoding="utf-8")

    print(f"Created games/{name}/ and added it to shared/games.js. Edit its title/description there.")


if __name__ == "__main__":
    main()
