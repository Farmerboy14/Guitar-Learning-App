/* =====================================================================
   ui.js — tiny DOM helpers + shared widgets (transport, tempo ladder,
   chord strip, key picker, listen-mode controller)
   Exposes window.HG.UI
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};

  /** h('div.class#id', {attrs}, children...) */
  function h(tag, attrs, ...children) {
    const m = /^([a-z0-9-]+)((?:[.#][\w-]+)*)$/i.exec(tag);
    const el = document.createElement(m ? m[1] : tag);
    if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) { if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1); }
    if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k in el && typeof v !== 'string' && !k.startsWith('data-')) { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
        else el.setAttribute(k, v === true ? '' : v);
      }
    } else if (attrs != null) children.unshift(attrs);
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  const fmtKey = k => String(k).replace(/#/g, '♯').replace(/b(?=m|$|\/)/g, '♭').replace(/([A-G])b/g, '$1♭');
  const fmtChord = c => String(c).replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');

  function toast(msg, ms) {
    let t = document.getElementById('toast');
    if (!t) { t = h('div#toast'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  /** Chord diagram strip for a list of chord symbols */
  function chordStrip(chords) {
    const F = window.HG.Fretboard, Tab = window.HG.Tab;
    const wrap = h('div.chord-strip');
    for (const c of chords) {
      const shape = F.shapeFor(c);
      if (!shape) { wrap.appendChild(h('div.chord-missing', fmtChord(c))); continue; }
      const box = h('div.chord-box', { title: shape.note || '' });
      const svg = Tab.chordDiagram(Object.assign({}, shape, { symbol: fmtChord(c) }), { width: 72 });
      svg.addEventListener('click', () => { window.HG.Audio.ensure(); window.HG.Audio.strum(F.shapeMidis(shape), null, { velocity: 0.8 }); });
      box.appendChild(svg);
      if (shape.note) box.appendChild(h('div.chord-note', shape.note));
      wrap.appendChild(box);
    }
    return wrap;
  }

  /**
   * Transport bar bound to HG.Player.
   * opts: { tempo, minTempo, maxTempo, onTempo, showLoop, onLoopToggle, arr, showRoles }
   * returns { el, setTempo, setPlaying, refresh }
   */
  function transport(opts) {
    const P = window.HG.Player, A = window.HG.Audio, S = window.HG.Store.settings();
    const o = Object.assign({ minTempo: 30, maxTempo: 180, tempo: 72, showRoles: false }, opts || {});
    let tempo = o.tempo;
    const playBtn = h('button.btn.primary.play-btn', { 'aria-label': 'Play' }, '▶ Play');
    const stopBtn = h('button.btn', { 'aria-label': 'Stop' }, '■');
    const tempoVal = h('span.tempo-val', tempo + ' BPM');
    const slider = h('input', { type: 'range', min: o.minTempo, max: o.maxTempo, value: tempo, class: 'tempo-slider', 'aria-label': 'Tempo' });
    const minus = h('button.btn.small', { 'aria-label': 'Slower' }, '−5');
    const plus = h('button.btn.small', { 'aria-label': 'Faster' }, '+5');
    const metro = h('label.toggle', h('input', { type: 'checkbox', checked: S.metronome }), ' Click');
    const countIn = h('label.toggle', h('input', { type: 'checkbox', checked: S.countIn }), ' Count-in');
    const loopBtn = h('button.btn', { title: 'Repeat the whole piece (or the selected measures)' }, '🔁 Loop');
    let looping = false;
    const setTempo = v => { tempo = Math.max(o.minTempo, Math.min(o.maxTempo, Math.round(v))); slider.value = tempo; tempoVal.textContent = tempo + ' BPM'; P.setTempo(tempo); if (o.onTempo) o.onTempo(tempo); };
    slider.addEventListener('input', () => setTempo(+slider.value));
    minus.addEventListener('click', () => setTempo(tempo - 5));
    plus.addEventListener('click', () => setTempo(tempo + 5));
    metro.querySelector('input').addEventListener('change', e => { P.setMetronome(e.target.checked); S.metronome = e.target.checked; window.HG.Store.save(); });
    countIn.querySelector('input').addEventListener('change', e => { P.setCountIn(e.target.checked); S.countIn = e.target.checked; window.HG.Store.save(); });
    loopBtn.addEventListener('click', () => { looping = !looping; loopBtn.classList.toggle('active', looping); P.setLoopAll(looping); if (o.onLoopToggle) o.onLoopToggle(looping); });
    const setPlaying = on => { playBtn.textContent = on ? '⏸ Pause' : '▶ Play'; playBtn.classList.toggle('playing', on); };
    playBtn.addEventListener('click', () => {
      A.ensure();
      if (P.playing) { P.pause(); setPlaying(false); }
      else { P.setTempo(tempo); P.setMetronome(metro.querySelector('input').checked); P.setCountIn(countIn.querySelector('input').checked); P.play(); setPlaying(true); }
    });
    stopBtn.addEventListener('click', () => { P.stop(); setPlaying(false); if (o.onStop) o.onStop(); });
    const el = h('div.transport', h('div.transport-row', playBtn, stopBtn, loopBtn, h('div.tempo-box', minus, slider, plus, tempoVal)), h('div.transport-row.small-row', metro, countIn));
    if (o.showRoles) {
      const roles = h('div.roles', h('span.muted', 'App plays: '));
      for (const [role, label] of [['melody', 'melody'], ['bass', 'bass'], ['fill', 'fills']]) {
        const cb = h('input', { type: 'checkbox', checked: true });
        cb.addEventListener('change', () => P.muteRole(role, !cb.checked));
        roles.appendChild(h('label.toggle', cb, ' ' + label));
      }
      el.appendChild(roles);
    }
    P.onEnd = () => setPlaying(false);
    requestAnimationFrame(() => { const hd = document.querySelector('.app-header'); if (hd && window.innerWidth > 640) el.style.top = hd.offsetHeight + 'px'; });
    return { el, setTempo, setPlaying, get tempo() { return tempo; }, playBtn };
  }

  /** Tempo ladder: three clean runs unlock +5 BPM. Persisted via getter/setter. */
  function tempoLadder(opts) {
    const o = Object.assign({ start: 60, goal: 100 }, opts || {});
    let runs = o.cleanRuns || 0;
    let tempo = o.current || o.start;
    const runsEl = h('span.runs');
    const info = h('div.ladder-info');
    const btn = h('button.btn.good', '✓ I played it cleanly');
    const back = h('button.btn.small', 'That was too fast');
    const refresh = () => {
      runsEl.textContent = '●'.repeat(runs) + '○'.repeat(Math.max(0, 3 - runs));
      info.textContent = tempo >= o.goal ? `Goal reached: ${tempo} BPM. Keep it musical!` : `Now: ${tempo} BPM · goal ${o.goal} BPM · 3 clean runs → +5`;
    };
    btn.addEventListener('click', () => {
      runs += 1;
      window.HG.Store.markDone('warmup', 4);
      if (runs >= 3) { runs = 0; tempo = Math.min(o.goal, tempo + 5); if (o.onTempo) o.onTempo(tempo); toast(tempo >= o.goal ? 'Goal tempo reached!' : 'Nice. Speeding up to ' + tempo + ' BPM'); }
      if (o.onRuns) o.onRuns(runs, tempo);
      refresh();
    });
    back.addEventListener('click', () => { tempo = Math.max(o.start, tempo - 5); runs = 0; if (o.onTempo) o.onTempo(tempo); if (o.onRuns) o.onRuns(runs, tempo); refresh(); });
    refresh();
    return { el: h('div.ladder', h('div.ladder-row', btn, back, runsEl), info), get tempo() { return tempo; } };
  }

  /**
   * Listen mode ("Note Hunt"): waits for the microphone to hear each melody note in turn.
   * targets: array of { idx (event index), midi }.
   */
  function listenController(opts) {
    const Pitch = window.HG.Pitch, A = window.HG.Audio, T = window.HG.Theory, F = window.HG.Fretboard;
    let i = 0, hits = 0, misses = 0, lastWrong = null, active = false, targets = opts.targets || [];
    const status = h('div.listen-status');
    const hint = h('div.listen-hint');
    const score = h('div.listen-score');
    const startBtn = h('button.btn.primary', '🎤 Start listening');
    const skipBtn = h('button.btn.small', 'Skip note');
    const resetBtn = h('button.btn.small', 'Restart');
    const showTarget = () => {
      if (opts.clear) opts.clear();
      if (i >= targets.length) { status.textContent = `Finished! ${hits} right, ${misses} slips.`; hint.textContent = ''; if (opts.onFinish) opts.onFinish(hits, misses); return; }
      const t = targets[i];
      if (opts.highlight) opts.highlight(t.idx, 'tab-target');
      const pos = t.string ? `string ${t.string}, fret ${t.fret}` : '';
      hint.textContent = `Play ${T.noteNameOct(t.midi)} (${pos})`;
      score.textContent = `${i} / ${targets.length} · ${hits} right`;
    };
    const onPitch = r => {
      if (!active || i >= targets.length) return;
      if (!r) { status.textContent = 'Listening…'; return; }
      status.textContent = `Hearing ${r.name} (${r.cents > 0 ? '+' : ''}${r.cents}¢)`;
      if (!r.stable) return;
      const t = targets[i];
      const diff = Math.abs(r.midi - t.midi);
      if (diff === 0 || diff === 12) {
        hits++; A.blip(true);
        if (opts.highlight) opts.highlight(t.idx, 'tab-good');
        i++; lastWrong = null;
        setTimeout(showTarget, 120);
      } else if (lastWrong !== r.midi) {
        lastWrong = r.midi; misses++;
        if (opts.highlight) opts.highlight(t.idx, 'tab-wrong');
        setTimeout(() => { if (opts.unhighlight) opts.unhighlight(t.idx, 'tab-wrong'); }, 400);
      }
    };
    startBtn.addEventListener('click', async () => {
      if (active) { active = false; Pitch.stop(); startBtn.textContent = '🎤 Start listening'; status.textContent = 'Stopped.'; return; }
      try {
        A.ensure();
        await Pitch.start(onPitch, { minClarity: 0.7 });
        active = true; startBtn.textContent = '⏹ Stop listening'; showTarget();
      } catch (e) { status.textContent = 'Microphone not available: ' + e.message + '. You can still press Space to step through the notes.'; }
    });
    skipBtn.addEventListener('click', () => { if (i < targets.length) { i++; showTarget(); } });
    resetBtn.addEventListener('click', () => { i = 0; hits = 0; misses = 0; showTarget(); });
    const keyHandler = e => { if (e.code === 'Space' && opts.keyStep) { e.preventDefault(); if (i < targets.length) { hits++; if (opts.highlight) opts.highlight(targets[i].idx, 'tab-good'); i++; showTarget(); } } };
    document.addEventListener('keydown', keyHandler);
    const el = h('div.listen', h('div.listen-row', startBtn, skipBtn, resetBtn), status, hint, score);
    return { el, stop() { active = false; Pitch.stop(); document.removeEventListener('keydown', keyHandler); }, setTargets(t) { targets = t; i = 0; hits = 0; misses = 0; if (active) showTarget(); }, showTarget };
  }

  /** Key picker with "best keys" ranking and capo hints relative to a reference key */
  function keyPicker(opts) {
    const T = window.HG.Theory;
    const sel = h('select.key-select');
    const ranked = opts.ranked || [];
    for (const r of ranked) {
      const capo = opts.refKey ? T.mod(T.parseKey(opts.refKey).rootPc - T.parseKey(r.key).rootPc, 12) : null;
      let label = fmtKey(r.key);
      if (r === ranked[0]) label += ' ★ easiest';
      else if (ranked.indexOf(r) < 3) label += ' ★';
      if (capo != null && capo !== 0) label += ` · capo ${capo} sounds like ${fmtKey(opts.refKey)}`;
      if (capo === 0) label += ' · same as hymnal';
      sel.appendChild(h('option', { value: r.key, selected: r.key === opts.value }, label));
    }
    sel.addEventListener('change', () => opts.onChange && opts.onChange(sel.value));
    return sel;
  }

  window.HG.UI = { h, clear, fmtKey, fmtChord, toast, chordStrip, transport, tempoLadder, listenController, keyPicker };
})();
