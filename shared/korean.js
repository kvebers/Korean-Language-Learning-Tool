// Korean grammar helpers: batchim checks, particles, polite present/past conjugation, numbers.
// Needs shared/hangul.js (compose/decompose).
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const { compose, decompose } = KLT.hangul;

  const last = (word) => word[word.length - 1];
  const hasBatchim = (word) => !!(decompose(last(word)) || {}).final;

  // ---- particles ----------------------------------------------------------

  const PARTICLES = {
    topic: ["은", "는"], // after batchim / after vowel
    subject: ["이", "가"],
    object: ["을", "를"],
    and: ["과", "와"],
  };

  function particle(word, role) {
    const [withFinal, withoutFinal] = PARTICLES[role];
    return hasBatchim(word) ? withFinal : withoutFinal;
  }

  // ---- conjugation (해요체: polite informal) -------------------------------

  // Irregular verbs/adjectives, by dictionary form. Everything else is conjugated by the regular rules.
  const IRREGULAR = {
    d: "듣다 걷다 묻다 싣다 깨닫다", // ㄷ → ㄹ before a vowel (듣다 → 들어요)
    b: "춥다 덥다 쉽다 어렵다 가깝다 무겁다 가볍다 귀엽다 맵다 아름답다 즐겁다 반갑다 고맙다 무섭다 부드럽다 뜨겁다 차갑다 시끄럽다 더럽다 눕다 굽다 돕다 곱다 외롭다 새롭다 싱겁다 두렵다 밉다", // ㅂ → 우 (춥다 → 추워요; 돕다 → 도와요)
    s: "낫다 짓다 붓다 잇다 젓다", // ㅅ drops (낫다 → 나아요)
    h: "그렇다 이렇다 저렇다 어떻다 빨갛다 노랗다 파랗다 하얗다 까맣다", // ㅎ drops, vowel → ㅐ
  };
  const IRR = Object.fromEntries(Object.entries(IRREGULAR).map(([k, v]) => [k, new Set(v.split(" "))]));
  // 르 irregular is the rule for stems ending in 르, except these (which just drop ㅡ).
  const REGULAR_REU = new Set(["따르다", "치르다", "들르다"]);

  function replaceLast(str, ch) {
    return str.slice(0, -1) + ch;
  }

  function withFinal(syl, final) {
    const d = decompose(syl);
    return compose(d.initial, d.vowel, final);
  }

  function brightVowel(v) {
    return v === "ㅏ" || v === "ㅗ" || v === "ㅑ";
  }

  // The 아/어 form of a verb (먹다 → 먹어, 가다 → 가, 하다 → 해): base of -요 and -었어요.
  function infinitive(dict) {
    if (!dict.endsWith("다") || dict.length < 2) throw new Error(`not a dictionary form: ${dict}`);
    let stem = dict.slice(0, -1);
    const L = decompose(last(stem));

    if (last(stem) === "하") return replaceLast(stem, "해");

    if (IRR.d.has(dict) && L.final === "ㄷ") stem = replaceLast(stem, withFinal(last(stem), "ㄹ"));
    else if (IRR.b.has(dict) && L.final === "ㅂ") {
      const base = replaceLast(stem, withFinal(last(stem), ""));
      return base + (dict === "돕다" || dict === "곱다" ? "와" : "워");
    } else if (IRR.s.has(dict) && L.final === "ㅅ") {
      const base = replaceLast(stem, withFinal(last(stem), ""));
      return base + (brightVowel(L.vowel) ? "아" : "어");
    } else if (IRR.h.has(dict) && L.final === "ㅎ") {
      const v = L.vowel === "ㅑ" ? "ㅒ" : "ㅐ";
      return replaceLast(stem, compose(L.initial, v));
    } else if (last(stem) === "르" && stem.length > 1 && !REGULAR_REU.has(dict)) {
      const prev = decompose(stem[stem.length - 2]);
      const head = stem.slice(0, -2) + compose(prev.initial, prev.vowel, "ㄹ");
      return head + (brightVowel(prev.vowel) ? "라" : "러");
    }

    const S = decompose(last(stem));
    const bright = brightVowel(S.vowel);
    if (S.final) return stem + (bright ? "아" : "어");

    const set = (v) => replaceLast(stem, compose(S.initial, v));
    switch (S.vowel) {
      case "ㅏ": case "ㅓ": case "ㅕ": case "ㅐ": case "ㅔ":
        return stem; // 가 → 가, 서 → 서, 보내 → 보내
      case "ㅗ": return set("ㅘ"); // 보 → 봐
      case "ㅜ": return set("ㅝ"); // 배우 → 배워
      case "ㅣ": return set("ㅕ"); // 마시 → 마셔
      case "ㅚ": return set("ㅙ"); // 되 → 돼
      case "ㅡ": {
        // 쓰 → 써, 바쁘 → 바빠: ㅡ drops, the vowel before decides 아/어
        const prev = stem.length > 1 ? decompose(stem[stem.length - 2]) : null;
        return set(prev && brightVowel(prev.vowel) ? "ㅏ" : "ㅓ");
      }
      default:
        return stem + "어"; // 쉬 → 쉬어
    }
  }

  // Polite present / past: 먹다 → 먹어요 / 먹었어요. Also handles 이다 / 아니다 after a noun.
  function conjugate(dict, tense = "present") {
    if (dict === "아니다") return tense === "past" ? "아니었어요" : "아니에요";
    const inf = infinitive(dict);
    if (tense === "present") return inf + "요";
    return replaceLast(inf, withFinal(last(inf), "ㅆ")) + "어요";
  }

  // Future / intention -(으)ㄹ 거예요: 먹다 → 먹을 거예요, 가다 → 갈 거예요, 살다 → 살 거예요
  function future(dict) {
    const stem = dict.slice(0, -1);
    const L = decompose(last(stem));
    const drop = () => replaceLast(stem, withFinal(last(stem), ""));
    let base;
    if (!L.final) base = replaceLast(stem, withFinal(last(stem), "ㄹ"));
    else if (L.final === "ㄹ") base = stem;
    else if (IRR.d.has(dict) && L.final === "ㄷ") base = replaceLast(stem, withFinal(last(stem), "ㄹ")) + "을";
    else if (IRR.b.has(dict) && L.final === "ㅂ") base = drop() + "울";
    else if (IRR.s.has(dict) && L.final === "ㅅ") base = drop() + "을";
    else if (IRR.h.has(dict) && L.final === "ㅎ") base = replaceLast(stem, compose(L.initial, L.vowel, "ㄹ"));
    else base = stem + "을";
    return `${base} 거예요`;
  }

  // noun + 이다: 학생 → 학생이에요, 의사 → 의사예요
  function copula(noun, tense = "present") {
    if (tense === "past") return noun + (hasBatchim(noun) ? "이었어요" : "였어요");
    return noun + (hasBatchim(noun) ? "이에요" : "예요");
  }

  // ---- numbers ------------------------------------------------------------

  const SINO_DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

  // Sino-Korean (money, dates, minutes, phone numbers): 0 … 99,999,999
  function sino(n) {
    if (n === 0) return "영";
    const under10k = (x) => {
      let out = "";
      for (const [unit, name] of [[1000, "천"], [100, "백"], [10, "십"]]) {
        const d = Math.floor(x / unit) % 10;
        if (d) out += (d === 1 ? "" : SINO_DIGITS[d]) + name;
      }
      return out + SINO_DIGITS[x % 10];
    };
    const man = Math.floor(n / 10000);
    const rest = n % 10000;
    return (man ? (man === 1 ? "" : under10k(man)) + "만" : "") + under10k(rest);
  }

  const NATIVE_ONES = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"];
  const NATIVE_ONES_COUNTER = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"];
  const NATIVE_TENS = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];

  // Native Korean (counting things, age, hours): 1 … 99.
  // counter=true gives the form used before a counter word (한 개, 두 살, 스무 살).
  function native(n, { counter = false } = {}) {
    if (n < 1 || n > 99) throw new Error("native numbers go from 1 to 99");
    const t = Math.floor(n / 10), o = n % 10;
    if (counter && n === 20) return "스무";
    return NATIVE_TENS[t] + (counter ? NATIVE_ONES_COUNTER : NATIVE_ONES)[o];
  }

  KLT.ko = { hasBatchim, particle, PARTICLES, infinitive, conjugate, future, copula, sino, native };
})();
