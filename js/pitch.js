/* =====================================================================
   pitch.js — microphone pitch detection (tuner + "listen" game mode)
   Normalized autocorrelation (McLeod-style NSDF) with parabolic refinement.
   Exposes window.HG.Pitch
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};

  /**
   * Detect the fundamental frequency of a Float32 time-domain buffer.
   * Returns { freq, clarity, rms } or null when no clear pitch.
   */
  function detect(buf, sampleRate, opts) {
    const o = opts || {};
    const n = buf.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < (o.minRms || 0.008)) return null;

    const minFreq = o.minFreq || 55;   // below low E (82 Hz) with margin, also drop-D
    const maxFreq = o.maxFreq || 1400;
    const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
    const maxTau = Math.min(n - 2, Math.floor(sampleRate / minFreq));
    const nsdf = new Float32Array(maxTau + 1);

    for (let tau = minTau; tau <= maxTau; tau++) {
      let acf = 0, m = 0;
      const lim = n - tau;
      for (let i = 0; i < lim; i++) {
        const a = buf[i], b = buf[i + tau];
        acf += a * b; m += a * a + b * b;
      }
      nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
    }

    // Key maxima between positive zero crossings
    const peaks = [];
    let tau = minTau;
    while (tau <= maxTau && nsdf[tau] > 0) tau++; // skip initial lobe
    while (tau <= maxTau) {
      while (tau <= maxTau && nsdf[tau] <= 0) tau++;
      let best = -1, bestV = -Infinity;
      while (tau <= maxTau && nsdf[tau] > 0) {
        if (nsdf[tau] > bestV) { bestV = nsdf[tau]; best = tau; }
        tau++;
      }
      if (best > 0) peaks.push({ tau: best, v: bestV });
    }
    if (!peaks.length) return null;
    let globalMax = -Infinity;
    for (const p of peaks) globalMax = Math.max(globalMax, p.v);
    const threshold = (o.threshold || 0.9) * globalMax;
    let chosen = peaks.find(p => p.v >= threshold);
    if (!chosen) return null;
    if (chosen.v < (o.minClarity || 0.6)) return null;

    // Parabolic interpolation
    const t = chosen.tau;
    let refined = t;
    if (t > 0 && t < maxTau) {
      const a = nsdf[t - 1], b = nsdf[t], c = nsdf[t + 1];
      const denom = a - 2 * b + c;
      if (denom !== 0) refined = t + 0.5 * (a - c) / denom;
    }
    return { freq: sampleRate / refined, clarity: chosen.v, rms };
  }

  let stream = null, source = null, analyser = null, raf = 0, actx = null;
  const timeBuf = new Float32Array(2048);
  const history = [];

  /**
   * Start listening. cb receives {freq, midi, cents, name, clarity, rms} or null (silence)
   */
  async function start(cb, opts) {
    const A = window.HG.Audio;
    actx = A.ensure();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Microphone not supported in this browser.');
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    source = actx.createMediaStreamSource(stream);
    analyser = actx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    history.length = 0;
    const T = window.HG.Theory;
    const loop = () => {
      analyser.getFloatTimeDomainData(timeBuf);
      const r = detect(timeBuf, actx.sampleRate, opts);
      if (r) {
        const midiF = T.freqToMidi(r.freq);
        history.push(midiF); if (history.length > 4) history.shift();
        // median smoothing
        const sorted = [...history].sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        const midi = Math.round(med);
        const cents = Math.round((med - midi) * 100);
        cb({ freq: r.freq, midiFloat: med, midi, cents, name: T.noteNameOct(midi), clarity: r.clarity, rms: r.rms, stable: history.length >= 3 && Math.abs(sorted[0] - sorted[sorted.length - 1]) < 0.6 });
      } else {
        history.length = 0;
        cb(null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (source) { try { source.disconnect(); } catch (e) {} }
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; source = null; analyser = null;
  }

  function isListening() { return !!stream; }

  window.HG.Pitch = { detect, start, stop, isListening };
})();
