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

  function pool({ tier = "1", type = "all" } = {}) {
    return LETTERS.filter(
      (l) => (tier === "all" || l.tier === Number(tier)) && (type === "all" || l.type === type)
    );
  }

  function byChar(char) {
    return LETTERS.find((l) => l.char === char);
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

  KLT.hangul = { LETTERS, TIERS, pool, byChar, shuffle, sample, weightedSample };
})();
