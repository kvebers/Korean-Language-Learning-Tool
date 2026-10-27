// Compares a hand drawing with rendered Hangul glyphs.
// Both are normalised to their bounding box on a small grid (see fitBox), then scored with a
// tolerant precision/recall: how much of the drawing lies near the glyph and how
// much of the glyph is covered by the drawing.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const N = 48; // grid size
  const FILL = 0.8; // share of the grid the letter's longer side takes up
  const TOLERANCE = 3; // pixels a stroke may be off and still count
  const FONT = getComputedStyle(document.documentElement).getPropertyValue("--font-ko") || "sans-serif";

  function grid() {
    const c = document.createElement("canvas");
    c.width = c.height = N;
    return c;
  }

  // Size of the box a w×h shape is scaled into. The aspect ratio is compressed
  // (square root) so a thin ㅡ stays thin, but a hand-drawn ㅁ that is a bit taller
  // than the font's still lines up.
  function fitBox(w, h) {
    const a = Math.sqrt(Math.max(w, 1e-3) / Math.max(h, 1e-3));
    return a >= 1 ? [N * FILL, (N * FILL) / a] : [N * FILL * a, N * FILL];
  }

  function toMask(canvas) {
    const data = canvas.getContext("2d").getImageData(0, 0, N, N).data;
    const mask = new Uint8Array(N * N);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 64 ? 1 : 0;
    return mask;
  }

  // strokes: arrays of [x, y] points in 0..1 pad coordinates
  function rasterStrokes(strokes) {
    const pts = strokes.flat();
    if (!pts.length) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = Math.max(maxX - minX, 1e-3);
    const h = Math.max(maxY - minY, 1e-3);
    if (Math.max(w, h) < 0.08) return null; // too small to judge

    const [bw, bh] = fitBox(w, h);
    const sx = bw / w;
    const sy = bh / h;
    const px = (x) => N / 2 + (x - (minX + maxX) / 2) * sx;
    const py = (y) => N / 2 + (y - (minY + maxY) / 2) * sy;
    const c = grid();
    const ctx = c.getContext("2d");
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3.5;
    ctx.lineCap = ctx.lineJoin = "round";
    for (const stroke of strokes) {
      ctx.beginPath();
      stroke.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
      if (stroke.length === 1) ctx.lineTo(px(stroke[0][0]) + 0.1, py(stroke[0][1]));
      ctx.stroke();
    }
    return toMask(c);
  }

  const glyphCache = new Map();
  function rasterGlyph(char) {
    if (glyphCache.has(char)) return glyphCache.get(char);
    const big = document.createElement("canvas");
    big.width = big.height = 200;
    const bctx = big.getContext("2d");
    bctx.font = `500 140px ${FONT}`;
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.fillText(char, 100, 100);

    const data = bctx.getImageData(0, 0, 200, 200).data;
    let minX = 200, minY = 200, maxX = -1, maxY = -1;
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 200; x++) {
        if (data[(y * 200 + x) * 4 + 3] > 64) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const [bw, bh] = fitBox(w, h);
    const c = grid();
    c.getContext("2d").drawImage(big, minX, minY, w, h, N / 2 - bw / 2, N / 2 - bh / 2, bw, bh);
    const mask = toMask(c);
    glyphCache.set(char, mask);
    return mask;
  }

  function dilate(mask, r) {
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!mask[y * N + x]) continue;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && dx * dx + dy * dy <= r * r) out[ny * N + nx] = 1;
          }
        }
      }
    }
    return out;
  }

  function similarity(drawing, glyph) {
    const nearGlyph = dilate(glyph, TOLERANCE);
    const nearDrawing = dilate(drawing, TOLERANCE);
    let d = 0, dHit = 0, g = 0, gHit = 0;
    for (let i = 0; i < drawing.length; i++) {
      if (drawing[i]) { d++; dHit += nearGlyph[i]; }
      if (glyph[i]) { g++; gHit += nearDrawing[i]; }
    }
    if (!d || !g) return 0;
    const precision = dHit / d;
    const recall = gHit / g;
    return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  }

  // Scores the drawing against every candidate letter, best match first.
  // Returns null when the drawing is empty or too small.
  function rank(strokes, letters) {
    const drawing = rasterStrokes(strokes);
    if (!drawing) return null;
    return letters
      .map((letter) => ({ letter, score: similarity(drawing, rasterGlyph(letter.char)) }))
      .sort((a, b) => b.score - a.score);
  }

  KLT.recognize = { rank };
})();
