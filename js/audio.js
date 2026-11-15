/* =====================================================================
   audio.js — Web Audio engine for Evening Hymns
   - Karplus-Strong plucked string (sounds like a nylon/steel guitar)
   - Sustained "organ"/"harmonica"-style tones for theory demos
   - Metronome clicks
   Exposes window.HG.Audio
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const T = () => window.HG.Theory;

  let ctx = null;
  let master = null;
  let volume = 0.8;
  const bufferCache = new Map();
  const live = new Set();

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      // gentle limiter so chords don't clip
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 20; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.15;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function now() { return ensure().currentTime; }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
  }
  function getVolume() { return volume; }

  /** Build a Karplus-Strong plucked-string buffer for a MIDI note */
  function makePluckBuffer(midi, tone) {
    const c = ensure();
    const sr = c.sampleRate;
    const freq = T().midiToFreq(midi);
    const N = Math.max(2, Math.round(sr / freq));
    const seconds = midi < 52 ? 3.2 : midi < 64 ? 2.6 : 2.0;
    const len = Math.floor(sr * seconds);
    const out = new Float32Array(len);
    const ring = new Float32Array(N);

    // Excitation: noise burst, low-passed for warmth. Bass strings warmer.
    let seed = 12345 + midi * 7919;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
    for (let i = 0; i < N; i++) ring[i] = rnd();
    const passes = tone === 'bright' ? 1 : (midi < 50 ? 6 : midi < 60 ? 4 : 3);
    for (let p = 0; p < passes; p++) {
      let prev = ring[N - 1];
      for (let i = 0; i < N; i++) { const cur = ring[i]; ring[i] = 0.5 * (cur + prev); prev = cur; }
    }
    // remove DC
    let mean = 0; for (let i = 0; i < N; i++) mean += ring[i]; mean /= N;
    for (let i = 0; i < N; i++) ring[i] -= mean;

    // String loop: averaging low-pass with a decay factor. Higher notes decay faster naturally.
    // decay is applied once per period: 0.998 ≈ one-second half-life for the high E, bass strings a little shorter
    const decay = tone === 'muted' ? 0.985 : (midi < 50 ? 0.9965 : midi < 60 ? 0.9975 : 0.998);
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % N];
      ring[idx] = decay * 0.5 * (cur + nxt);
      out[i] = cur;
      idx = (idx + 1) % N;
    }
    // normalize + fade tail
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    const g = peak > 0 ? 0.6 / peak : 1;
    const fadeStart = Math.floor(len * 0.7);
    for (let i = 0; i < len; i++) {
      let v = out[i] * g;
      if (i > fadeStart) v *= 1 - (i - fadeStart) / (len - fadeStart);
      if (i < 24) v *= i / 24; // click guard
      out[i] = v;
    }
    const buf = c.createBuffer(1, len, sr);
    buf.copyToChannel(out, 0);
    return { buffer: buf, rate: freq * N / sr }; // playbackRate corrects integer-period tuning error
  }

  function getPluck(midi, tone) {
    const key = midi + '|' + (tone || 'warm');
    let b = bufferCache.get(key);
    if (!b) { b = makePluckBuffer(midi, tone || 'warm'); bufferCache.set(key, b); }
    return b;
  }

  /**
   * Pluck a note. when = absolute AudioContext time (or undefined for now).
   * opts: velocity 0..1, tone 'warm'|'bright'|'muted', pan -1..1
   */
  function pluck(midi, when, opts) {
    const c = ensure();
    const o = opts || {};
    const { buffer, rate } = getPluck(Math.round(midi), o.tone);
    const src = c.createBufferSource();
    src.buffer = buffer; src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = (o.velocity == null ? 0.9 : o.velocity);
    src.connect(g);
    if (o.pan != null && c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(master);
    } else g.connect(master);
    const t = when == null ? c.currentTime : Math.max(when, c.currentTime);
    src.start(t);
    live.add(src);
    src.onended = () => live.delete(src);
    return src;
  }

  /** Strum several notes (low to high) with a slight delay between strings */
  function strum(midis, when, opts) {
    const c = ensure();
    const o = opts || {};
    const t0 = when == null ? c.currentTime : when;
    const spread = o.spread == null ? 0.035 : o.spread;
    midis.forEach((m, i) => pluck(m, t0 + i * spread, { velocity: o.velocity, tone: o.tone }));
  }

  /** Sustained tone for theory demos. type: 'organ' | 'harmonica' | 'sine' */
  function tone(midi, when, dur, opts) {
    const c = ensure();
    const o = opts || {};
    const t0 = when == null ? c.currentTime : when;
    const d = dur || 1.2;
    const osc = c.createOscillator();
    const freq = T().midiToFreq(midi);
    osc.frequency.value = freq;
    const type = o.type || 'organ';
    if (type === 'sine') osc.type = 'sine';
    else if (type === 'harmonica') {
      const n = 12, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = 1 / k * (k % 2 ? 1 : 0.6);
      osc.setPeriodicWave(c.createPeriodicWave(re, im));
    } else {
      const re = new Float32Array([0, 0, 0, 0, 0, 0]), im = new Float32Array([0, 1, 0.5, 0.25, 0.12, 0.06]);
      osc.setPeriodicWave(c.createPeriodicWave(re, im));
    }
    const g = c.createGain();
    const vel = (o.velocity == null ? 0.35 : o.velocity);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vel, t0 + 0.03);
    g.gain.setValueAtTime(vel, t0 + d - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = type === 'harmonica' ? 2600 : 3200;
    osc.connect(filt); filt.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + d + 0.02);
    live.add(osc); osc.onended = () => live.delete(osc);
    return osc;
  }

  /** Two tones together (interval demo) */
  function toneChord(midis, when, dur, opts) { midis.forEach(m => tone(m, when, dur, opts)); }

  /** Metronome click */
  function click(when, accent) {
    const c = ensure();
    const t0 = when == null ? c.currentTime : when;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = accent ? 1320 : 880;
    const g = c.createGain();
    g.gain.setValueAtTime(accent ? 0.25 : 0.14, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (accent ? 0.06 : 0.04));
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = accent ? 1320 : 880; f.Q.value = 4;
    osc.connect(f); f.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + 0.08);
  }

  /** Soft "tick" for UI feedback */
  function blip(good) {
    const c = ensure();
    const t0 = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(good ? 660 : 220, t0);
    if (good) osc.frequency.exponentialRampToValueAtTime(990, t0 + 0.08);
    const g = c.createGain(); g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    osc.connect(g); g.connect(master); osc.start(t0); osc.stop(t0 + 0.16);
  }

  function stopAll() {
    for (const s of live) { try { s.stop(); } catch (e) { /* already stopped */ } }
    live.clear();
  }

  /** Warm the cache for a list of MIDI notes (avoids first-play hiccups) */
  function warm(midis, tone) { (midis || []).forEach(m => getPluck(Math.round(m), tone)); }

  window.HG.Audio = { ensure, now, setVolume, getVolume, pluck, strum, tone, toneChord, click, blip, stopAll, warm, get context() { return ctx; } };
})();
