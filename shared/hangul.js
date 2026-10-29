// Hangul letter data shared by every game.
(function () {
  const KLT = (window.KLT = window.KLT || {});

  // tier 1 = the basic alphabet (14 consonants + 10 vowels)
  // tier 2 = double consonants + compound vowels
  // say  = syllable used to voice the letter (consonant + ㅏ, ㅇ + vowel)
  // name = the letter's Korean name
  const LETTERS = [
    ["ㄱ", "consonant", 1, "g / k", "기역", "가"],
    ["ㄴ", "consonant", 1, "n", "니은", "나"],
    ["ㄷ", "consonant", 1, "d / t", "디귿", "다"],
    ["ㄹ", "consonant", 1, "r / l", "리을", "라"],
    ["ㅁ", "consonant", 1, "m", "미음", "마"],
    ["ㅂ", "consonant", 1, "b / p", "비읍", "바"],
    ["ㅅ", "consonant", 1, "s", "시옷", "사"],
    ["ㅇ", "consonant", 1, "silent / ng", "이응", "앙"],
    ["ㅈ", "consonant", 1, "j", "지읒", "자"],
    ["ㅊ", "consonant", 1, "ch", "치읓", "차"],
    ["ㅋ", "consonant", 1, "k (aspirated)", "키읔", "카"],
    ["ㅌ", "consonant", 1, "t (aspirated)", "티읕", "타"],
    ["ㅍ", "consonant", 1, "p (aspirated)", "피읖", "파"],
    ["ㅎ", "consonant", 1, "h", "히읗", "하"],

    ["ㅏ", "vowel", 1, "a", "아", "아"],
    ["ㅑ", "vowel", 1, "ya", "야", "야"],
    ["ㅓ", "vowel", 1, "eo", "어", "어"],
    ["ㅕ", "vowel", 1, "yeo", "여", "여"],
    ["ㅗ", "vowel", 1, "o", "오", "오"],
    ["ㅛ", "vowel", 1, "yo", "요", "요"],
    ["ㅜ", "vowel", 1, "u", "우", "우"],
    ["ㅠ", "vowel", 1, "yu", "유", "유"],
    ["ㅡ", "vowel", 1, "eu", "으", "으"],
    ["ㅣ", "vowel", 1, "i", "이", "이"],

    ["ㄲ", "consonant", 2, "kk", "쌍기역", "까"],
    ["ㄸ", "consonant", 2, "tt", "쌍디귿", "따"],
    ["ㅃ", "consonant", 2, "pp", "쌍비읍", "빠"],
    ["ㅆ", "consonant", 2, "ss", "쌍시옷", "싸"],
    ["ㅉ", "consonant", 2, "jj", "쌍지읒", "짜"],

    ["ㅐ", "vowel", 2, "ae", "애", "애"],
    ["ㅒ", "vowel", 2, "yae", "얘", "얘"],
    ["ㅔ", "vowel", 2, "e", "에", "에"],
    ["ㅖ", "vowel", 2, "ye", "예", "예"],
    ["ㅘ", "vowel", 2, "wa", "와", "와"],
    ["ㅙ", "vowel", 2, "wae", "왜", "왜"],
    ["ㅚ", "vowel", 2, "oe", "외", "외"],
    ["ㅝ", "vowel", 2, "wo", "워", "워"],
    ["ㅞ", "vowel", 2, "we", "웨", "웨"],
    ["ㅟ", "vowel", 2, "wi", "위", "위"],
    ["ㅢ", "vowel", 2, "ui", "의", "의"],
  ].map(([char, type, tier, roman, name, say]) => ({ char, type, tier, roman, name, say }));

  const TIERS = {
    1: "Tier 1 · Basic alphabet",
    2: "Tier 2 · Double consonants & compound vowels",
  };

  // ---- syllable blocks ----------------------------------------------------
  // A syllable is U+AC00 + (initial * 21 + vowel) * 28 + final.
  const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const FINALS = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

  // Revised Romanization; finals use their representative sound.
  const ROMAN_INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const ROMAN_VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const ROMAN_FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

  function compose(initial, vowel, final = "") {
    const i = INITIALS.indexOf(initial), v = VOWELS.indexOf(vowel), f = FINALS.indexOf(final);
    if (i < 0 || v < 0 || f < 0) return null;
    return String.fromCharCode(0xac00 + (i * 21 + v) * 28 + f);
  }

  function decompose(syllable) {
    const code = (syllable || "").charCodeAt(0) - 0xac00;
    if (!(code >= 0 && code <= 11171)) return null;
    const i = Math.floor(code / 588), v = Math.floor((code % 588) / 28), f = code % 28;
    return { initial: INITIALS[i], vowel: VOWELS[v], final: FINALS[f], i, v, f };
  }

  function romanizeSyllable(s) {
    const d = decompose(s);
    return d ? ROMAN_INITIAL[d.i] + ROMAN_VOWEL[d.v] + ROMAN_FINAL[d.f] : s;
  }

  // Letter-by-letter romanization (no sound-change rules), good enough as a reading aid.
  function romanize(text) {
    return [...text].map(romanizeSyllable).join("");
  }

  function syllable(char) {
    const d = decompose(char);
    return { char, type: "syllable", tier: d.final ? "batchim" : "syl", roman: romanizeSyllable(char), name: char, say: char, parts: d };
  }

  // Tier "syl": every basic consonant with every basic vowel (가, 나 … 히).
  const BASIC_C = LETTERS.filter((l) => l.tier === 1 && l.type === "consonant").map((l) => l.char);
  const BASIC_V = LETTERS.filter((l) => l.tier === 1 && l.type === "vowel").map((l) => l.char);
  const OPEN_SYLLABLES = BASIC_C.flatMap((c) => BASIC_V.map((v) => syllable(compose(c, v))));
  // Tier "batchim": common syllables with a final consonant, taken from beginner words.
  const BATCHIM_SYLLABLES = [..."한국말밥물집산강문몸옷꽃책방공생일월년원번분길발손눈날밤맛빵술컵돈땅반선학음식점장상정영명성신인친들을는은있없많좋갑잡입십삼백천만엄형동김님힘감남탁불봄곰달별살속숲약역울잠짐창콩팔폭향흙"]
    .map(syllable);
  const SYLLABLE_TIERS = { syl: "Syllables · consonant + vowel", batchim: "Syllables · with final (받침)" };

  function pool({ tier = "1", type = "all" } = {}) {
    if (tier === "syl") return OPEN_SYLLABLES;
    if (tier === "batchim") return BATCHIM_SYLLABLES;
    return LETTERS.filter(
      (l) => (tier === "all" || l.tier === Number(tier)) && (type === "all" || l.type === type)
    );
  }

  function byChar(char) {
    return LETTERS.find((l) => l.char === char) || (decompose(char) ? syllable(char) : undefined);
  }

  // Up to n items from `list` that look most like `item` (same type; for syllables,
  // sharing the consonant or vowel), so wrong answers are worth thinking about.
  function similar(item, list, n) {
    const others = list.filter((x) => x !== item && x.char !== item.char && x.type === item.type);
    if (item.type !== "syllable") return sample(others, n);
    const p = item.parts;
    const score = (x) => (x.parts.initial === p.initial) + (x.parts.vowel === p.vowel) + (x.parts.final === p.final) + Math.random() * 0.9;
    return others.map((x) => [score(x), x]).sort((a, b) => b[0] - a[0]).slice(0, n).map(([, x]) => x);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  // Picks n items, favouring higher weights; reuses items only once all were picked.
  function weightedSample(arr, n, weightOf = () => 1) {
    const out = [];
    let bag = [...arr];
    while (out.length < n && arr.length) {
      if (!bag.length) bag = arr.filter((x) => x !== out[out.length - 1]);
      const weights = bag.map(weightOf);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let i = 0;
      while (i < bag.length - 1 && (r -= weights[i]) > 0) i++;
      out.push(bag.splice(i, 1)[0]);
    }
    return out;
  }

  KLT.hangul = {
    LETTERS, TIERS, SYLLABLE_TIERS, INITIALS, VOWELS, FINALS,
    pool, byChar, similar, shuffle, sample, weightedSample,
    compose, decompose, romanize, syllable,
  };
})();
