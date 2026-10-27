// Sanity checks: letter data is consistent and every game folder is registered.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
sandbox.KLT = sandbox.window.KLT = {};
vm.createContext(sandbox);
for (const file of ["shared/hangul.js", "shared/games.js", "games/hangul-speak/match.js"]) {
  vm.runInContext(readFileSync(join(root, file), "utf8"), sandbox, { filename: file });
}
const { hangul, GAMES, speakMatch } = sandbox.window.KLT;

const errors = [];
const fail = (msg) => errors.push(msg);

// letters
const seen = new Set();
for (const l of hangul.LETTERS) {
  if (seen.has(l.char)) fail(`duplicate letter ${l.char}`);
  seen.add(l.char);

  // ㄱ (U+3131) decomposes to the conjoining jamo used inside syllables like 가
  const jamo = l.char.normalize("NFKD");
  const say = l.say.normalize("NFD");
  if (l.type === "consonant" && say[0] !== jamo) fail(`${l.char}: say "${l.say}" doesn't start with ${l.char}`);
  if (l.type === "vowel" && (say[0] !== "ᄋ" || say[1] !== jamo)) fail(`${l.char}: say "${l.say}" isn't ㅇ + ${l.char}`);
  if (l.type === "consonant" && l.tier === 1 && l.name.normalize("NFD")[0] !== jamo) fail(`${l.char}: name "${l.name}" doesn't start with ${l.char}`);

  if (!speakMatch.isMatch(l, l.say)) fail(`${l.char}: pronunciation check rejects "${l.say}"`);
  if (!speakMatch.isMatch(l, l.name)) fail(`${l.char}: pronunciation check rejects "${l.name}"`);
}
const tier1 = hangul.pool({ tier: "1" });
if (tier1.length !== 24) fail(`tier 1 should be the 24 basic letters, found ${tier1.length}`);

// pronunciation check must not accept a different letter's sound
for (const a of tier1) {
  for (const b of tier1) {
    if (a !== b && speakMatch.isMatch(a, b.say) && !(a.char === "ㅇ" && b.type === "vowel")) {
      fail(`pronunciation check accepts "${b.say}" (${b.char}) for ${a.char}`);
    }
  }
}

// games
const registered = new Set(GAMES.map((g) => g.id));
for (const id of registered) {
  if (!existsSync(join(root, "games", id, "index.html"))) fail(`shared/games.js lists ${id} but games/${id}/index.html is missing`);
}
for (const dir of readdirSync(join(root, "games"), { withFileTypes: true })) {
  if (dir.isDirectory() && !dir.name.startsWith("_") && !registered.has(dir.name)) {
    fail(`games/${dir.name} is not registered in shared/games.js`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${hangul.LETTERS.length} letters, ${registered.size} games OK`);
