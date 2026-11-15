/* =====================================================================
   theory.js — music theory core for Evening Hymns
   Plain script (no build step). Exposes window.HG.Theory
   Conventions:
     - MIDI numbers: C4 (middle C) = 60, A4 = 69 = 440 Hz
     - "pc" = pitch class 0..11 (C=0)
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};

  const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const NAME_TO_PC = {
    'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10,
    'Bb': 10, 'B': 11, 'Cb': 11
  };
  // Major keys normally spelled with flats
  const FLAT_MAJOR_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
  const FLAT_MINOR_KEYS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb']); // Dm, Gm, Cm, Fm, Bbm, Ebm

  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10];
  const PENTA_MAJOR = [0, 2, 4, 7, 9];
  const PENTA_MINOR = [0, 3, 5, 7, 10];
  const BLUES = [0, 3, 5, 6, 7, 10];
  const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
  const DORIAN = [0, 2, 3, 5, 7, 9, 10];

  const QUALITIES = {
    '': [0, 4, 7], 'maj': [0, 4, 7], 'M': [0, 4, 7],
    'm': [0, 3, 7], 'min': [0, 3, 7], '-': [0, 3, 7],
    '7': [0, 4, 7, 10], 'dom7': [0, 4, 7, 10],
    'm7': [0, 3, 7, 10], 'min7': [0, 3, 7, 10],
    'maj7': [0, 4, 7, 11], 'M7': [0, 4, 7, 11],
    '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9],
    '9': [0, 4, 7, 10, 14], 'add9': [0, 4, 7, 14], 'add2': [0, 2, 4, 7],
    'dim': [0, 3, 6], 'o': [0, 3, 6], 'dim7': [0, 3, 6, 9], 'm7b5': [0, 3, 6, 10], 'ø': [0, 3, 6, 10],
    'aug': [0, 4, 8], '+': [0, 4, 8],
    'sus4': [0, 5, 7], 'sus': [0, 5, 7], 'sus2': [0, 2, 7], '7sus4': [0, 5, 7, 10],
    '5': [0, 7]
  };

  const INTERVALS = [
    { semis: 0, name: 'Unison', short: 'P1', ratio: '1:1', feel: 'The same note. Perfect blend.', consonance: 'perfect' },
    { semis: 1, name: 'Minor 2nd', short: 'm2', ratio: '16:15', feel: 'Very tense, "shark music". The two waves fight each other.', consonance: 'harsh' },
    { semis: 2, name: 'Major 2nd', short: 'M2', ratio: '9:8', feel: 'Mild tension, like the first two notes of a scale.', consonance: 'mild' },
    { semis: 3, name: 'Minor 3rd', short: 'm3', ratio: '6:5', feel: 'Sweet but a little sad. The heart of a minor chord.', consonance: 'sweet' },
    { semis: 4, name: 'Major 3rd', short: 'M3', ratio: '5:4', feel: 'Bright and warm. The heart of a major chord.', consonance: 'sweet' },
    { semis: 5, name: 'Perfect 4th', short: 'P4', ratio: '4:3', feel: 'Open and strong ("Here Comes the Bride").', consonance: 'open' },
    { semis: 6, name: 'Tritone', short: 'TT', ratio: '45:32', feel: 'Restless, wants to move somewhere. Used on purpose for tension.', consonance: 'harsh' },
    { semis: 7, name: 'Perfect 5th', short: 'P5', ratio: '3:2', feel: 'Very stable and powerful. The backbone of every chord.', consonance: 'perfect' },
    { semis: 8, name: 'Minor 6th', short: 'm6', ratio: '8:5', feel: 'Bittersweet and yearning.', consonance: 'sweet' },
    { semis: 9, name: 'Major 6th', short: 'M6', ratio: '5:3', feel: 'Gentle and sweet ("My Bonnie lies over the ocean").', consonance: 'sweet' },
    { semis: 10, name: 'Minor 7th', short: 'm7', ratio: '9:5', feel: 'Bluesy, leaning forward. Gives a V7 chord its pull.', consonance: 'mild' },
    { semis: 11, name: 'Major 7th', short: 'M7', ratio: '15:8', feel: 'Dreamy but tense, wants to rise to the octave.', consonance: 'mild' },
    { semis: 12, name: 'Octave', short: 'P8', ratio: '2:1', feel: 'So blended it sounds like the same note, higher.', consonance: 'perfect' }
  ];

  const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
  const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

  const mod = (n, m) => ((n % m) + m) % m;

  function normalizeName(name) {
    if (!name) return '';
    return String(name).trim().replace(/♯/g, '#').replace(/♭/g, 'b')
      .replace(/^([a-g])/, c => c.toUpperCase());
  }

  /** Note name ('F#', 'Bb', 'e') -> pitch class 0..11, or null */
  function pcOf(name) {
    const n = normalizeName(name);
    const v = NAME_TO_PC[n];
    return v === undefined ? null : v;
  }

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function freqToMidi(f) { return 69 + 12 * Math.log2(f / 440); }

  function noteName(midi, useFlats) { return (useFlats ? FLAT : SHARP)[mod(Math.round(midi), 12)]; }
  function octaveOf(midi) { return Math.floor(Math.round(midi) / 12) - 1; }
  function noteNameOct(midi, useFlats) { return noteName(midi, useFlats) + octaveOf(midi); }

  /** 'F#4' -> 66, 'Bb3' -> 58, 'C4' -> 60 */
  function parseNote(str) {
    const m = /^([A-Ga-g])([#b♯♭]*)(-?\d+)$/.exec(String(str).trim());
    if (!m) return null;
    const base = pcOf(m[1].toUpperCase());
    let acc = 0;
    for (const ch of m[2]) acc += (ch === '#' || ch === '♯') ? 1 : -1;
    return (parseInt(m[3], 10) + 1) * 12 + base + acc;
  }

  /** Spell a pitch class inside a key with musically sensible accidentals */
  function spellPc(pc, keyName, isMinor) {
    return noteName(pc, keyUsesFlats(keyName, isMinor));
  }

  function keyUsesFlats(keyRoot, isMinor) {
    const r = normalizeName(keyRoot).replace(/m$/, '');
    return isMinor ? FLAT_MINOR_KEYS.has(r) : FLAT_MAJOR_KEYS.has(r);
  }

  /** Parse a key like 'G', 'Em', 'Bb', 'F#m', 'Dmaj', 'Amin' */
  function parseKey(keyStr) {
    const s = normalizeName(keyStr).replace(/\s+/g, '');
    const m = /^([A-G][#b]?)(m|min|minor|maj|major|dor|mix|)$/i.exec(s);
    if (!m) return null;
    const root = m[1];
    const modeTok = (m[2] || '').toLowerCase();
    let mode = 'major';
    if (modeTok === 'm' || modeTok === 'min' || modeTok === 'minor') mode = 'minor';
    else if (modeTok === 'dor') mode = 'dorian';
    else if (modeTok === 'mix') mode = 'mixolydian';
    return { root, rootPc: pcOf(root), mode, isMinor: mode === 'minor' };
  }

  function scaleIntervals(mode) {
    switch (mode) {
      case 'minor': return NAT_MINOR;
      case 'dorian': return DORIAN;
      case 'mixolydian': return MIXOLYDIAN;
      case 'pentatonic': return PENTA_MAJOR;
      case 'minor-pentatonic': return PENTA_MINOR;
      case 'blues': return BLUES;
      default: return MAJOR;
    }
  }

  /** Scale as pitch classes */
  function scalePcs(rootPc, mode) {
    return scaleIntervals(mode).map(i => mod(rootPc + i, 12));
  }

  /** Scale as spelled note names */
  function scaleNames(keyStr) {
    const k = parseKey(keyStr);
    if (!k) return [];
    const flats = keyUsesFlats(k.root, k.isMinor);
    return scalePcs(k.rootPc, k.mode).map(pc => noteName(pc, flats));
  }

  /** Diatonic triads of a key: [{roman, symbol, quality, rootPc, degree}] */
  function diatonicChords(keyStr) {
    const k = parseKey(keyStr);
    if (!k) return [];
    const flats = keyUsesFlats(k.root, k.isMinor);
    const pcs = scalePcs(k.rootPc, k.isMinor ? 'minor' : 'major');
    const romans = k.isMinor ? ROMAN_MINOR : ROMAN_MAJOR;
    return pcs.map((pc, i) => {
      const third = mod(pcs[(i + 2) % 7] - pc, 12);
      const fifth = mod(pcs[(i + 4) % 7] - pc, 12);
      let quality = '';
      if (third === 4 && fifth === 7) quality = '';
      else if (third === 3 && fifth === 7) quality = 'm';
      else if (third === 3 && fifth === 6) quality = 'dim';
      else if (third === 4 && fifth === 8) quality = 'aug';
      return { degree: i + 1, roman: romans[i], rootPc: pc, quality, symbol: noteName(pc, flats) + quality };
    });
  }

  /** Parse a chord symbol: 'G', 'Em', 'D7', 'C/G', 'F#m7', 'Bb', 'Asus4' */
  function parseChord(sym) {
    if (!sym) return null;
    let s = normalizeName(sym).replace(/\s+/g, '');
    let bass = null;
    const slash = s.indexOf('/');
    if (slash > 0) { bass = s.slice(slash + 1); s = s.slice(0, slash); }
    const m = /^([A-G][#b]?)(.*)$/.exec(s);
    if (!m) return null;
    const root = m[1];
    let qual = m[2];
    if (!(qual in QUALITIES)) {
      // tolerate things like 'Maj7', 'MIN'
      const lower = qual.toLowerCase();
      if (lower in QUALITIES) qual = lower; else if (/^m(aj)?7$/i.test(qual)) qual = qual.startsWith('M') ? 'maj7' : 'm7'; else qual = qual.replace(/[()]/g, '');
      if (!(qual in QUALITIES)) return null;
    }
    const rootPc = pcOf(root);
    const tones = QUALITIES[qual].map(i => mod(rootPc + i, 12));
    const bassPc = bass ? pcOf(bass) : rootPc;
    return { symbol: sym, root, rootPc, quality: qual, tones, bass, bassPc,
      isMinor: /^(m|min|-|m7|min7|m6|m7b5|ø)$/.test(qual), isDim: /dim|o|ø|m7b5/.test(qual),
      fifthPc: mod(rootPc + (/(aug|\+)/.test(qual) ? 8 : /dim|o|ø|m7b5/.test(qual) ? 6 : 7), 12) };
  }

  function transposeNoteName(name, semis, useFlats) {
    const p = pcOf(name);
    if (p === null) return name;
    return noteName(p + semis, useFlats);
  }

  function transposeChord(sym, semis, useFlats) {
    const c = parseChord(sym);
    if (!c) return sym;
    const root = noteName(c.rootPc + semis, useFlats);
    const bass = c.bass ? '/' + noteName(c.bassPc + semis, useFlats) : '';
    return root + c.quality + bass;
  }

  function transposeKey(keyStr, semis) {
    const k = parseKey(keyStr);
    if (!k) return keyStr;
    const newPc = mod(k.rootPc + semis, 12);
    // choose spelling: prefer the conventional spelling for that key
    const candidates = [noteName(newPc, false), noteName(newPc, true)];
    let root = candidates[0];
    if (k.isMinor) {
      if (FLAT_MINOR_KEYS.has(candidates[1]) && candidates[1] !== candidates[0]) root = candidates[1];
      if (['A#', 'D#'].includes(root)) root = candidates[1];
    } else {
      if (FLAT_MAJOR_KEYS.has(candidates[1])) root = candidates[1];
    }
    return root + (k.isMinor ? 'm' : '');
  }

  /** Roman numeral for a chord in a key ('D7' in 'G' -> 'V7'), or '' */
  function romanFor(chordSym, keyStr) {
    const c = parseChord(chordSym); const k = parseKey(keyStr);
    if (!c || !k) return '';
    const pcs = scalePcs(k.rootPc, k.isMinor ? 'minor' : 'major');
    const romans = k.isMinor ? ROMAN_MINOR : ROMAN_MAJOR;
    const idx = pcs.indexOf(c.rootPc);
    const ext = c.quality.replace(/^m(?!aj)/, '').replace(/^dim$/, '');
    if (idx >= 0) {
      let base = romans[idx].replace('°', '');
      if (c.isMinor) base = base.toLowerCase(); else if (!c.isDim) base = base.toUpperCase();
      return base + (c.isDim ? '°' : '') + (ext === '' ? '' : ext);
    }
    // non-diatonic: show as flat/sharp degree
    const semisAbove = mod(c.rootPc - k.rootPc, 12);
    const names = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
    let r = names[semisAbove];
    if (c.isMinor) r = r.toLowerCase();
    return r + ext;
  }

  function intervalInfo(semis) {
    return INTERVALS[mod(semis, 12) === 0 && semis !== 0 ? 12 : mod(semis, 12)];
  }

  /** Relative minor/major */
  function relativeKey(keyStr) {
    const k = parseKey(keyStr);
    if (!k) return null;
    if (k.isMinor) return transposeKey(k.root, 3);
    return transposeKey(k.root + 'm', -3);
  }

  /** Human readable list of keys for menus */
  const ALL_MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const ALL_MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

  /** The classic "friendly on guitar" keys with open chords */
  const GUITAR_FRIENDLY_MAJOR = ['C', 'G', 'D', 'A', 'E'];
  const GUITAR_FRIENDLY_MINOR = ['Am', 'Em', 'Dm'];

  window.HG.Theory = {
    SHARP, FLAT, MAJOR, NAT_MINOR, PENTA_MAJOR, PENTA_MINOR, INTERVALS, QUALITIES,
    ROMAN_MAJOR, ROMAN_MINOR, CIRCLE_OF_FIFTHS, ALL_MAJOR_KEYS, ALL_MINOR_KEYS,
    GUITAR_FRIENDLY_MAJOR, GUITAR_FRIENDLY_MINOR,
    mod, pcOf, midiToFreq, freqToMidi, noteName, noteNameOct, octaveOf, parseNote,
    parseKey, keyUsesFlats, scalePcs, scaleNames, scaleIntervals, diatonicChords,
    parseChord, transposeNoteName, transposeChord, transposeKey, romanFor,
    intervalInfo, relativeKey, spellPc, normalizeName
  };
})();
