// Decides whether a speech-recognition transcript is a correct pronunciation of a letter.
(function () {
  const KLT = (window.KLT = window.KLT || {});

  // Hangul syllable block order (U+AC00 + (initial * 21 + vowel) * 28 + final)
  const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";

  // Recognisers often write single syllables as digits (이 → 2, 오 → 5, 사 → 4).
  const DIGITS = { 1: "일", 2: "이", 3: "삼", 4: "사", 5: "오", 6: "육", 7: "칠", 8: "팔", 9: "구" };

  function decompose(syllable) {
    const code = syllable.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return null;
    return {
      initial: INITIALS[Math.floor(code / 588)],
      vowel: VOWELS[Math.floor((code % 588) / 28)],
      hasFinal: code % 28 !== 0,
    };
  }

  function normalise(text) {
    return text.replace(/\d/g, (d) => DIGITS[d] || "").replace(/[^가-힣]/g, "");
  }

  // Accepts the letter's name or sound syllable anywhere in the transcript, or a
  // first syllable that starts with the consonant / is exactly ㅇ + the vowel.
  function isMatch(letter, transcript) {
    const text = normalise(transcript);
    if (!text) return false;
    if (text.includes(letter.name) || text.includes(letter.say)) return true;
    const first = decompose(text[0]);
    if (!first) return false;
    return letter.type === "consonant"
      ? first.initial === letter.char
      : first.initial === "ㅇ" && first.vowel === letter.char && !first.hasFinal;
  }

  KLT.speakMatch = { isMatch, normalise };
})();
