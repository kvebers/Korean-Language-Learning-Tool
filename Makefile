PYTHON ?= python
NODE ?= node
PORT ?= 8000
PREVIEW_PORT ?= 8001

.PHONY: help serve build preview check new-game reset-progress clean

help:
	@echo "Korean learning games"
	@echo ""
	@echo "  make serve            Local version: games + progress tracking (PORT=$(PORT))"
	@echo "  make build            Build the static games-only site into dist/ (what GitHub Pages serves)"
	@echo "  make preview          Build, then serve dist/ like GitHub Pages (PREVIEW_PORT=$(PREVIEW_PORT))"
	@echo "  make check            Validate letter data and the game registry"
	@echo "  make new-game NAME=x  Create games/x from the template and register it"
	@echo "  make reset-progress   Delete local progress (data/progress.json)"
	@echo "  make clean            Remove dist/"

serve:
	$(PYTHON) server/server.py --port $(PORT)

build:
	$(PYTHON) scripts/build.py

preview: build
	@echo "Static preview on http://localhost:$(PREVIEW_PORT)/ (Ctrl+C to stop)"
	$(PYTHON) -m http.server $(PREVIEW_PORT) --bind 127.0.0.1 --directory dist

check:
	$(NODE) scripts/check.mjs

new-game:
	$(PYTHON) scripts/new_game.py $(NAME)

reset-progress:
	$(PYTHON) -c "import pathlib; p = pathlib.Path('data/progress.json'); p.unlink(missing_ok=True); print('Progress reset.')"

clean:
	$(PYTHON) -c "import shutil; shutil.rmtree('dist', ignore_errors=True)"
