// __GAME_TITLE__
// Shared helpers: KLT.hangul (letters), KLT.speech.say(text), KLT.sfx.good()/bad()/win(),
// KLT.progress.record(GAME, char, correct, { answer }) and KLT.progress.session(GAME, summary),
// KLT.ui.settingsBar/summary/voiceNotice.
(function () {
  const { hangul, speech, sfx, progress, ui } = KLT;
  const GAME = "__GAME_ID__";

  let settings = ui.settingsBar(document.getElementById("settings"), GAME, [], (values) => {
    settings = values;
    render();
  });
  ui.voiceNotice(document.getElementById("notice"));

  function render() {
    const letters = hangul.pool(settings);
    const play = document.getElementById("play");
    play.innerHTML = `<p>${letters.length} letters selected. Build the game here.</p>`;
  }

  render();
})();
