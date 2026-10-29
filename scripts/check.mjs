// Sanity checks: letter and word data, grammar helpers, and that every game is registered
// and every page's scripts exist.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {}, console };
sandbox.KLT = sandbox.window.KLT = {};
vm.createContext(sandbox);
const SHARED = [
  "shared/hangul.js", "shared/korean.js", "shared/progress.js", "shared/games.js",
  "shared/words/a1.js", "shared/words/a2.js", "shared/words/b1.js", "shared/words/b2.js", "shared/vocab.js",
  "games/hangul-speak/match.js", "games/particle-pop/sentences.js",
];
for (const file of SHARED) {
  vm.runInContext(readFileSync(join(root, file), "utf8"), sandbox, { filename: file });
}
const { hangul, ko, vocab, GAMES, GAME_TIERS, speakMatch, PARTICLE_SENTENCES } = sandbox.window.KLT;

const errors = [];
const fail = (msg) => errors.push(msg);

// ---- letters ----------------------------------------------------------------
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

// ---- syllables ----------------------------------------------------------------
if (hangul.pool({ tier: "syl" }).length !== 140) fail("tier syl should be 14 consonants × 10 vowels");
const batchim = hangul.pool({ tier: "batchim" });
if (new Set(batchim.map((s) => s.char)).size !== batchim.length) fail("duplicate syllables in the 받침 list");
for (const s of batchim) if (!s.parts.final) fail(`받침 syllable ${s.char} has no final consonant`);
for (const s of [...hangul.pool({ tier: "syl" }), ...batchim]) {
  if (hangul.compose(s.parts.initial, s.parts.vowel, s.parts.final) !== s.char) fail(`compose/decompose mismatch for ${s.char}`);
}
if (hangul.romanize("한국어") !== "hangukeo") fail(`romanize("한국어") gave ${hangul.romanize("한국어")}`);

// ---- grammar helpers ----------------------------------------------------------
const CONJ = {
  먹다: "먹어요/먹었어요", 가다: "가요/갔어요", 오다: "와요/왔어요", 마시다: "마셔요/마셨어요", 배우다: "배워요/배웠어요",
  하다: "해요/했어요", 공부하다: "공부해요/공부했어요", 쓰다: "써요/썼어요", 바쁘다: "바빠요/바빴어요", 듣다: "들어요/들었어요",
  춥다: "추워요/추웠어요", 돕다: "도와요/도왔어요", 모르다: "몰라요/몰랐어요", 부르다: "불러요/불렀어요", 낫다: "나아요/나았어요",
  그렇다: "그래요/그랬어요", 하얗다: "하얘요/하얬어요", 되다: "돼요/됐어요", 쉬다: "쉬어요/쉬었어요", 살다: "살아요/살았어요",
  좋다: "좋아요/좋았어요", 보내다: "보내요/보냈어요", 크다: "커요/컸어요", 입다: "입어요/입었어요", 씻다: "씻어요/씻었어요",
  기다리다: "기다려요/기다렸어요", 보다: "봐요/봤어요", 주다: "줘요/줬어요", 아프다: "아파요/아팠어요", 따르다: "따라요/따랐어요",
  얇다: "얇아요/얇았어요", 서다: "서요/섰어요", 켜다: "켜요/켰어요", 아니다: "아니에요/아니었어요",
};
for (const [dict, want] of Object.entries(CONJ)) {
  const got = `${ko.conjugate(dict)}/${ko.conjugate(dict, "past")}`;
  if (got !== want) fail(`conjugate(${dict}) = ${got}, expected ${want}`);
}
const FUTURE = { 먹다: "먹을 거예요", 가다: "갈 거예요", 살다: "살 거예요", 듣다: "들을 거예요", 춥다: "추울 거예요", 만들다: "만들 거예요" };
for (const [dict, want] of Object.entries(FUTURE)) if (ko.future(dict) !== want) fail(`future(${dict}) = ${ko.future(dict)}, expected ${want}`);
const NUMS = [[ko.sino(10), "십"], [ko.sino(15), "십오"], [ko.sino(10000), "만"], [ko.sino(35000), "삼만오천"], [ko.native(20, { counter: true }), "스무"], [ko.native(23, { counter: true }), "스물세"], [ko.native(4), "넷"]];
for (const [got, want] of NUMS) if (got !== want) fail(`number: got ${got}, expected ${want}`);
if (ko.particle("책", "object") !== "을" || ko.particle("사과", "topic") !== "는") fail("particle() picks the wrong form");

// every A1/A2 verb/adjective must conjugate to Hangul (the time portal uses them)
for (const w of vocab.WORDS) {
  if ((w.level === "A1" || w.level === "A2") && ["v", "adj"].includes(w.pos) && /^[가-힣]+다$/.test(w.ko)) {
    try {
      for (const f of [ko.conjugate(w.ko), ko.conjugate(w.ko, "past"), ko.future(w.ko)]) {
        if (!/^[가-힣 ]+$/.test(f)) fail(`conjugating ${w.ko} produced "${f}"`);
      }
    } catch (err) {
      fail(`conjugating ${w.ko} threw ${err.message}`);
    }
  }
}

// ---- words ----------------------------------------------------------------------
const kos = new Set();
for (const w of vocab.WORDS) {
  if (kos.has(w.ko)) fail(`duplicate word ${w.ko}`);
  kos.add(w.ko);
  if (!w.en) fail(`${w.ko}: missing meaning`);
  if (!vocab.POS[w.pos]) fail(`${w.ko}: unknown part of speech "${w.pos}"`);
  if (!vocab.TOPICS[w.topic]) fail(`${w.ko}: unknown topic "${w.topic}" (add it to TOPICS in shared/vocab.js)`);
  if (!/^[가-힣 ?]+$/.test(w.ko)) fail(`${w.ko}: not plain Hangul`);
}
if (vocab.WORDS.length < 2000) fail(`the word library should have at least 2000 words, found ${vocab.WORDS.length}`);
const food = vocab.WORDS.filter((w) => ["food", "drink"].includes(w.topic) && w.emoji && w.level[0] === "A");
if (new Set(food.map((w) => w.emoji)).size < 25) fail("Fridge Raid needs at least 25 different food/drink pictures");

// ---- particle sentences ----------------------------------------------------------
const ROLES = ["topic", "subject", "object", "e", "eseo", "do"];
for (const s of PARTICLE_SENTENCES) {
  if (s.length !== 5 || !Array.isArray(s[2]) || !s[2].every((r) => ROLES.includes(r))) fail(`bad particle sentence: ${JSON.stringify(s)}`);
}

// ---- games and pages ----------------------------------------------------------------
const registered = new Set(GAMES.map((g) => g.id));
for (const g of GAMES) {
  if (!existsSync(join(root, "games", g.id, "index.html"))) fail(`shared/games.js lists ${g.id} but games/${g.id}/index.html is missing`);
  if (!GAME_TIERS[g.tier]) fail(`${g.id}: unknown tier ${g.tier}`);
}
const pages = ["index.html", "progress/index.html", "library/index.html"];
for (const dir of readdirSync(join(root, "games"), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  if (!dir.name.startsWith("_") && !registered.has(dir.name)) fail(`games/${dir.name} is not registered in shared/games.js`);
  if (!dir.name.startsWith("_")) pages.push(`games/${dir.name}/index.html`);
}
for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  for (const [, src] of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+\.(?:js|css))"/g)) {
    if (/^https?:/.test(src)) continue;
    if (!existsSync(join(root, dirname(page), src))) fail(`${page} loads ${src}, which doesn't exist`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${hangul.LETTERS.length} letters, ${vocab.WORDS.length} words, ${registered.size} games, ${pages.length} pages OK`);
