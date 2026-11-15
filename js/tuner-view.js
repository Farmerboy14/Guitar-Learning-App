/* tuner-view.js — chromatic tuner + reference tones */
(function () {
  'use strict';
  const HG = window.HG;
  const { h } = HG.UI;
  HG.views = HG.views || {};
  HG.views.tuner = function (view) {
    const F = HG.Fretboard, A = HG.Audio, Pitch = HG.Pitch, T = HG.Theory;
    view.appendChild(h('h1', 'Tuner'));
    view.appendChild(h('p.muted', 'Standard tuning, low to high: E A D G B e. Pluck one string at a time and let it ring. Tune up to the note (loosen below it first, then tighten) so the string holds its pitch.'));
    const noteEl = h('div.tuner-note', '—');
    const needle = h('div.needle');
    const centsEl = h('div.tuner-cents', 'Press Start and pluck a string');
    const stringHint = h('div.muted.small');
    const btn = h('button.btn.primary', '🎤 Start tuner');
    let active = false;
    btn.addEventListener('click', async () => {
      if (active) { active = false; Pitch.stop(); btn.textContent = '🎤 Start tuner'; centsEl.textContent = 'Stopped.'; return; }
      try {
        A.ensure();
        await Pitch.start(r => {
          if (!r) { needle.style.left = '50%'; needle.classList.remove('intune'); return; }
          noteEl.textContent = r.name;
          const c = Math.max(-50, Math.min(50, r.cents));
          needle.style.left = (50 + c) + '%';
          needle.classList.toggle('intune', Math.abs(r.cents) <= 5);
          centsEl.textContent = (Math.abs(r.cents) <= 5 ? 'In tune ✓ ' : r.cents < 0 ? 'Flat: tighten a little ' : 'Sharp: loosen a little ') + `(${r.cents > 0 ? '+' : ''}${r.cents} cents, ${r.freq.toFixed(1)} Hz)`;
          const near = [6, 5, 4, 3, 2, 1].map(s => ({ s, d: Math.abs(F.midiAt(s, 0) - r.midi) })).sort((a, b) => a.d - b.d)[0];
          stringHint.textContent = near.d === 0 ? `That is string ${near.s} (open)` : near.d <= 2 ? `Closest open string: ${near.s} (${T.noteNameOct(F.midiAt(near.s, 0))})` : '';
        }, { minClarity: 0.75 });
        active = true; btn.textContent = '⏹ Stop';
      } catch (e) { centsEl.textContent = 'Microphone not available: ' + e.message; }
    });
    const refs = h('div.string-btns');
    [6, 5, 4, 3, 2, 1].forEach(s => refs.appendChild(h('button.btn', { onClick: () => { A.ensure(); A.pluck(F.midiAt(s, 0), null, { velocity: 0.9 }); } }, `${s}: ${T.noteNameOct(F.midiAt(s, 0))}`)));
    view.appendChild(h('div.card.tuner', noteEl, h('div.tuner-meter', h('div.center'), needle), centsEl, stringHint, h('div.btn-row', { style: { justifyContent: 'center' } }, btn), h('h3', 'Reference tones'), h('p.small.muted', 'Tap to hear each open string, then match it by ear.'), refs));
    view.appendChild(h('div.card', h('h3', 'Why tuning matters for hymns'), h('p.small', 'Fingerstyle lets notes ring together, so a string that is slightly off makes every chord shimmer unpleasantly. Thirty seconds with the tuner is the best-sounding thing you can do tonight. Check again after putting on a capo: pressing the strings down can pull them sharp.')));
    return () => { active = false; Pitch.stop(); };
  };
})();
