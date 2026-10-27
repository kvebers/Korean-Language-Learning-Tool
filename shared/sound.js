// Korean speech (browser text-to-speech) and small feedback tones.
(function () {
  const KLT = (window.KLT = window.KLT || {});
  const synth = window.speechSynthesis;
  let voice = null;

  function pickVoice() {
    const korean = (synth ? synth.getVoices() : []).filter((v) => /^ko/i.test(v.lang));
    voice = korean.find((v) => /natural|google|online/i.test(v.name)) || korean[0] || null;
  }

  // Voices load asynchronously; resolve once a Korean voice shows up or after a short wait.
  const ready = new Promise((resolve) => {
    if (!synth) return resolve();
    pickVoice();
    if (voice) return resolve();
    synth.addEventListener("voiceschanged", () => {
      pickVoice();
      if (voice) resolve();
    });
    setTimeout(resolve, 1500);
  });

  function say(text, { rate = 0.75 } = {}) {
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    if (voice) u.voice = voice;
    u.rate = rate;
    synth.speak(u);
  }

  let audio = null;
  function tone(freqs, dur = 0.12, type = "sine", gain = 0.08) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      let t = audio.currentTime;
      for (const f of freqs) {
        const osc = audio.createOscillator();
        const g = audio.createGain();
        osc.type = type;
        osc.frequency.value = f;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(audio.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur * 0.8;
      }
    } catch {
      // audio is a nicety; games work silently without it
    }
  }

  KLT.speech = {
    supported: !!synth,
    ready,
    say,
    hasKoreanVoice: () => !!voice,
  };

  KLT.sfx = {
    good: () => tone([660, 880]),
    bad: () => tone([220, 170], 0.16, "triangle"),
    flip: () => tone([520], 0.05, "triangle", 0.04),
    win: () => tone([523, 659, 784, 1047], 0.14),
  };
})();
