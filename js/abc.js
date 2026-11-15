/* =====================================================================
   abc.js — a small ABC-notation parser (the subset hymns need)
   Supports: K: M: L: Q: T: headers, notes with accidentals/octaves/lengths,
   rests (z), ties (-), broken rhythm (> <), bar lines, chord symbols in
   quotes ("G", "D7"), tuplets ((3), and w: lyric lines with - _ * syntax.
   Each music line becomes one "system" (a line of tab on screen).
   Time is measured in ticks: 48 ticks per quarter note.
   Exposes window.HG.ABC
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const TPQ = 48;                 // ticks per quarter note
  const WHOLE = TPQ * 4;          // 192

  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

  function keySignature(keyStr) {
    // returns { accidentals: {F:1,...}, root, mode }
    const T = window.HG.Theory;
    const clean = String(keyStr || 'C').trim();
    const m = /^([A-G][#b]?)\s*(m|min|minor|maj|major|dor|dorian|mix|mixolydian|aeo|aeolian|ion|ionian|lyd|lydian|phr|phrygian|loc|locrian)?/i.exec(clean);
    if (!m) return { accidentals: {}, root: 'C', mode: 'major' };
    const root = m[1];
    const modeTok = (m[2] || '').toLowerCase();
    let mode = 'major', offsetToMajor = 0;
    if (/^(m|min|minor|aeo|aeolian)$/.test(modeTok)) { mode = 'minor'; offsetToMajor = 3; }
    else if (/^dor/.test(modeTok)) { mode = 'dorian'; offsetToMajor = 10; }
    else if (/^mix/.test(modeTok)) { mode = 'mixolydian'; offsetToMajor = 5; }
    else if (/^lyd/.test(modeTok)) { mode = 'lydian'; offsetToMajor = 7; }
    else if (/^phr/.test(modeTok)) { mode = 'phrygian'; offsetToMajor = 8; }
    else if (/^loc/.test(modeTok)) { mode = 'locrian'; offsetToMajor = 1; }
    const majorPc = T.mod(T.pcOf(root) + offsetToMajor, 12);
    // position on circle of fifths: C=0, G=1, ... F=-1 ...
    const fifths = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
    let n = fifths[majorPc];
    // spelled with flats for Gb/Cb style keys
    if (majorPc === 6 && /b/.test(root)) n = -6;
    const acc = {};
    if (n > 0) for (let i = 0; i < n; i++) acc[SHARP_ORDER[i]] = 1;
    if (n < 0) for (let i = 0; i < -n; i++) acc[FLAT_ORDER[i]] = -1;
    return { accidentals: acc, root, mode, fifths: n };
  }

  function parseFraction(str, fallback) {
    if (!str) return fallback;
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(str.trim());
    if (!m) return fallback;
    return parseInt(m[1], 10) / parseInt(m[2], 10);
  }

  /** Parse a duration suffix like '', '2', '3/2', '/', '//', '/2', '3' -> multiplier */
  function parseLength(str) {
    if (!str) return 1;
    let s = str;
    let num = 1, den = 1;
    const m = /^(\d+)?(\/+)?(\d+)?$/.exec(s);
    if (!m) return 1;
    if (m[1]) num = parseInt(m[1], 10);
    if (m[2]) {
      if (m[3]) den = parseInt(m[3], 10);
      else den = Math.pow(2, m[2].length);
    }
    return num / den;
  }

  /** Split lyric line into syllable tokens per ABC rules */
  function lyricTokens(line) {
    const toks = [];
    const s = line.replace(/\|/g, ' ').trim();
    const words = s.split(/\s+/).filter(Boolean);
    for (const w of words) {
      // split on hyphens, keeping the hyphen on the left syllable
      const parts = w.split('-');
      for (let i = 0; i < parts.length; i++) {
        let p = parts[i];
        if (i < parts.length - 1) p += '-';
        if (p === '_') { toks.push({ text: null, extend: true }); continue; }
        if (p === '*') { toks.push({ text: null, skip: true }); continue; }
        if (p === '-' ) continue;
        if (p === '') continue;
        // underscores inside a token: "sound_" means syllable then extend
        const ext = /_+$/.exec(p);
        if (ext) {
          toks.push({ text: p.replace(/_+$/, '').replace(/~/g, ' ') });
          for (let k = 0; k < ext[0].length; k++) toks.push({ text: null, extend: true });
        } else toks.push({ text: p.replace(/~/g, ' ') });
      }
    }
    return toks;
  }

  /**
   * Parse ABC text. Returns:
   * { title, composer, meter:{num,den}, unit (fraction), tempo (bpm for quarter), key, keySig,
   *   ticksPerMeasure, systems:[{ measures:[ {index, ticks, notes:[...], chords:[{tick,symbol}]} ] }],
   *   measures: flat array of all measures, lyricsText: [verse strings]
   * }
   * note: { tick (in measure), dur (ticks), midi (null for rest), rest, tieStart, tied, lyric, chord }
   */
  function parse(text) {
    const T = window.HG.Theory;
    const lines = String(text).replace(/\r/g, '').split('\n');
    const tune = { title: '', composer: '', meter: { num: 4, den: 4 }, unit: 1 / 8, tempo: 80, key: 'C', keySig: keySignature('C'), systems: [], measures: [], verses: [] };
    let unitSet = false;
    let systemLines = []; // {music, lyrics:[]}
    let cur = null;

    for (const raw of lines) {
      const line = raw.replace(/%.*$/, '').trimEnd();
      if (!line.trim()) continue;
      const hm = /^([A-Za-z]):\s*(.*)$/.exec(line);
      if (hm && hm[1] !== 'w' && hm[1] !== 'W') {
        const f = hm[1], v = hm[2].trim();
        if (f === 'T') tune.title = tune.title || v;
        else if (f === 'C') tune.composer = v;
        else if (f === 'M') {
          if (v === 'C') tune.meter = { num: 4, den: 4 };
          else if (v === 'C|') tune.meter = { num: 2, den: 2 };
          else { const mm = /^(\d+)\/(\d+)$/.exec(v); if (mm) tune.meter = { num: +mm[1], den: +mm[2] }; }
        }
        else if (f === 'L') { tune.unit = parseFraction(v, 1 / 8); unitSet = true; }
        else if (f === 'Q') {
          const qm = /(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/.exec(v);
          if (qm) {
            const bpm = +qm[3];
            if (qm[1]) { const beat = (+qm[1]) / (+qm[2]); tune.tempo = Math.round(bpm * beat * 4); } // convert to quarter bpm
            else tune.tempo = bpm;
          }
        }
        else if (f === 'K') { tune.key = v; tune.keySig = keySignature(v); }
        continue;
      }
      if (hm && (hm[1] === 'w' || hm[1] === 'W')) {
        if (cur) cur.lyrics.push(hm[2]);
        continue;
      }
      // music line
      cur = { music: line, lyrics: [] };
      systemLines.push(cur);
    }
    if (!unitSet) {
      // ABC default: if meter < 0.75 use 1/16 else 1/8
      tune.unit = (tune.meter.num / tune.meter.den) < 0.75 ? 1 / 16 : 1 / 8;
    }
    tune.ticksPerMeasure = Math.round(tune.meter.num * (WHOLE / tune.meter.den));
    const unitTicks = tune.unit * WHOLE;

    let measureIndex = 0;
    let pendingTie = false;
    let lastNote = null;
    const allNotes = [];

    for (const sys of systemLines) {
      const system = { measures: [] };
      let measure = { index: measureIndex, notes: [], chords: [], ticks: 0 };
      let tick = 0;
      let measureAcc = {};
      let pendingChord = null;
      let brokenNext = 0; // +1 => next note halved (prev dotted), -1 => next note dotted
      let tuplet = null;   // {n, remaining, factor}
      const s = sys.music;
      let i = 0;
      const flushMeasure = () => {
        if (measure.notes.length || measure.chords.length) {
          measure.ticks = tick;
          system.measures.push(measure);
          tune.measures.push(measure);
          measureIndex++;
        }
        measure = { index: measureIndex, notes: [], chords: [], ticks: 0 };
        tick = 0; measureAcc = {};
      };
      while (i < s.length) {
        const ch = s[i];
        if (ch === ' ' || ch === '\t') { i++; continue; }
        if (ch === '"') { // chord symbol
          const end = s.indexOf('"', i + 1);
          const sym = s.slice(i + 1, end < 0 ? s.length : end).trim();
          if (sym && !/^[<>_^@]/.test(sym)) pendingChord = sym;
          i = end < 0 ? s.length : end + 1; continue;
        }
        if (ch === '!' ) { const end = s.indexOf('!', i + 1); i = end < 0 ? s.length : end + 1; continue; }
        if (ch === '+' ) { const end = s.indexOf('+', i + 1); i = end < 0 ? s.length : end + 1; continue; }
        if (ch === '{') { const end = s.indexOf('}', i + 1); i = end < 0 ? s.length : end + 1; continue; } // grace notes ignored
        if (ch === '[') {
          // inline field [K:..] etc or chord [CEG] -> we take the first note only
          const end = s.indexOf(']', i + 1);
          const inner = s.slice(i + 1, end < 0 ? s.length : end);
          if (/^[A-Za-z]:/.test(inner)) {
            const f = inner[0], v = inner.slice(2).trim();
            if (f === 'K') { tune.keySig = keySignature(v); tune.key = v; }
            i = end + 1; continue;
          }
          // bracket chord: parse notes inside, keep the highest as melody
          i++; // step inside; the ']' will be skipped below when encountered
          continue;
        }
        if (ch === ']') { i++; continue; }
        if (ch === '(') {
          const tm = /^\((\d)(?::(\d))?(?::(\d))?/.exec(s.slice(i));
          if (tm) {
            const n = +tm[1];
            const q = tm[2] ? +tm[2] : (n === 3 ? 2 : n === 2 ? 3 : 2);
            const r = tm[3] ? +tm[3] : n;
            tuplet = { remaining: r, factor: q / n };
            i += tm[0].length; continue;
          }
          i++; continue; // slur start
        }
        if (ch === ')') { i++; continue; }
        if (ch === '|' || ch === ':') {
          // bar line variants
          let j = i;
          while (j < s.length && /[|:\]\[]/.test(s[j])) j++;
          // numbered endings like |1 or [2 — we do not support repeats; ignore digits
          while (j < s.length && /\d/.test(s[j])) j++;
          flushMeasure();
          i = j; continue;
        }
        if (ch === '>' || ch === '<') {
          let n = 0; while (s[i] === ch) { n++; i++; }
          brokenNext = ch === '>' ? n : -n;
          // apply to previous note
          if (lastNote) {
            const factor = ch === '>' ? (2 - Math.pow(0.5, n)) : Math.pow(0.5, n);
            const old = lastNote.dur;
            lastNote.dur = Math.round(old * factor);
            tick += lastNote.dur - old;
          }
          continue;
        }
        if (ch === '-') { if (lastNote) { lastNote.tieStart = true; pendingTie = true; } i++; continue; }
        // note or rest
        const nm = /^([\^_=]*)([A-Ga-gzxZ])([,']*)(\d*\/*\d*)/.exec(s.slice(i));
        if (!nm) { i++; continue; }
        i += nm[0].length;
        const accStr = nm[1], letter = nm[2], octStr = nm[3], lenStr = nm[4];
        let dur = Math.round(unitTicks * parseLength(lenStr));
        if (brokenNext !== 0) {
          const n = Math.abs(brokenNext);
          dur = Math.round(dur * (brokenNext > 0 ? Math.pow(0.5, n) : (2 - Math.pow(0.5, n))));
          brokenNext = 0;
        }
        if (tuplet) { dur = Math.round(dur * tuplet.factor); tuplet.remaining--; if (tuplet.remaining <= 0) tuplet = null; }
        const note = { tick, dur, midi: null, rest: false, tieStart: false, tied: false, lyric: null, chord: null };
        if (/[zxZ]/.test(letter)) {
          note.rest = true;
        } else {
          const upper = letter.toUpperCase();
          let octave = letter === upper ? 4 : 5;
          for (const c of octStr) octave += c === "'" ? 1 : -1;
          let acc;
          const key = upper + octave;
          if (accStr) {
            acc = 0;
            for (const c of accStr) acc += c === '^' ? 1 : c === '_' ? -1 : 0;
            if (accStr === '=') acc = 0;
            measureAcc[key] = acc;
          } else if (measureAcc[key] !== undefined) acc = measureAcc[key];
          else acc = tune.keySig.accidentals[upper] || 0;
          note.midi = (octave + 1) * 12 + LETTER_PC[upper] + acc;
          note.letter = upper; note.acc = acc; note.octave = octave;
          if (pendingTie && lastNote && lastNote.midi === note.midi) { note.tied = true; }
          pendingTie = false;
        }
        if (pendingChord) { measure.chords.push({ tick, symbol: pendingChord }); note.chord = pendingChord; pendingChord = null; }
        measure.notes.push(note);
        allNotes.push(note);
        lastNote = note;
        tick += dur;
      }
      flushMeasure();
      // lyrics: attach verse-1 syllables to non-rest, non-tied notes of this system
      if (sys.lyrics.length) {
        const targets = [];
        for (const m of system.measures) for (const n of m.notes) if (!n.rest && !n.tied) targets.push(n);
        sys.lyrics.forEach((lyr, vi) => {
          const toks = lyricTokens(lyr);
          let ti = 0;
          for (const tok of toks) {
            if (ti >= targets.length) break;
            if (tok.extend) { ti++; continue; }
            if (tok.skip) { ti++; continue; }
            if (vi === 0) targets[ti].lyric = tok.text;
            else { targets[ti].lyricVerses = targets[ti].lyricVerses || []; targets[ti].lyricVerses[vi] = tok.text; }
            ti++;
          }
        });
      }
      tune.systems.push(system);
    }
    // detect pickup: first measure shorter than full
    tune.pickupTicks = tune.measures.length && tune.measures[0].ticks < tune.ticksPerMeasure ? tune.measures[0].ticks : 0;
    let abs = 0;
    const ms = tune.measures;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      m.startTick = abs;
      // A pickup measure is aligned to the END of a full measure so beats line up.
      // Mid-tune pickups: a short measure that completes the previous short measure.
      m.offset = 0;
      if (i === 0 && tune.pickupTicks) m.offset = tune.ticksPerMeasure - m.ticks;
      else if (i > 0 && m.ticks < tune.ticksPerMeasure && ms[i - 1].ticks < tune.ticksPerMeasure && ms[i - 1].offset === 0 && ms[i - 1].ticks + m.ticks === tune.ticksPerMeasure) m.offset = ms[i - 1].ticks;
      abs += m.ticks;
    }
    tune.totalTicks = abs;
    return tune;
  }

  window.HG.ABC = { parse, keySignature, lyricTokens, TPQ, WHOLE };
})();
