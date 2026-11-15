/* =====================================================================
   fretboard.js — guitar geometry + open chord shapes
   Exposes window.HG.Fretboard
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const T = () => window.HG.Theory;

  // Standard tuning, strings numbered 6 (low E) .. 1 (high E). Index 0 = string 6.
  const TUNING = [40, 45, 50, 55, 59, 64];
  const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

  function midiAt(string, fret) { return TUNING[6 - string] + fret; }

  /** All positions for a sounding MIDI note within maxFret */
  function positionsFor(midi, maxFret) {
    const out = [];
    for (let s = 6; s >= 1; s--) {
      const f = midi - TUNING[6 - s];
      if (f >= 0 && f <= (maxFret == null ? 12 : maxFret)) out.push({ string: s, fret: f, midi });
    }
    return out;
  }

  /** Right-hand finger by string: thumb for 6-5-4, i m a for 3-2-1 */
  function fingerFor(string) { return string >= 4 ? 'p' : string === 3 ? 'i' : string === 2 ? 'm' : 'a'; }

  // Open chord shapes: frets listed from string 6 to string 1; -1 = don't play; fingers 0 = open.
  const SHAPES = {
    'C':    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    'C7':   { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
    'Cmaj7':{ frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
    'C/G':  { frets: [3, 3, 2, 0, 1, 0], fingers: [3, 4, 2, 0, 1, 0] },
    'C/E':  { frets: [0, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    'D':    { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    'D7':   { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
    'Dm':   { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    'Dsus4':{ frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
    'D/F#': { frets: [2, -1, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
    'D/A':  { frets: [-1, 0, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    'E':    { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    'E7':   { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    'Em':   { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    'Em7':  { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 2, 3, 0, 4, 0] },
    'F':    { frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], note: 'small F (no barre)' },
    'Fmaj7':{ frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
    'F/C':  { frets: [-1, 3, 3, 2, 1, 1], fingers: [0, 3, 4, 2, 1, 1] },
    'G':    { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
    'G7':   { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    'G/B':  { frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 1, 0, 0, 0, 3] },
    'G/D':  { frets: [-1, -1, 0, 0, 0, 3], fingers: [0, 0, 0, 0, 0, 3] },
    'A':    { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    'A7':   { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
    'Am':   { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    'Am7':  { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    'Asus4':{ frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
    'Am/C': { frets: [-1, 3, 2, 2, 1, 0], fingers: [0, 4, 2, 3, 1, 0] },
    'B7':   { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
    'Bm':   { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: 2 },
    'Bm7':  { frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 1, 0, 2, 0, 3] },
    'Bb':   { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], barre: 1 },
    'F#m':  { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: 2 },
    'Bdim': { frets: [-1, 2, 3, 4, 3, -1], fingers: [0, 1, 2, 4, 3, 0] },
    'F#dim':{ frets: [-1, -1, 4, 5, 4, 5], fingers: [0, 0, 1, 3, 2, 4] },
    'Cadd9':{ frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
    'Gsus4':{ frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4] },
    'E/G#': { frets: [4, -1, 2, 1, 0, 0], fingers: [4, 0, 3, 1, 0, 0] },
    'Am/E': { frets: [0, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    'Em/B': { frets: [-1, 2, 2, 0, 0, 0], fingers: [0, 1, 2, 0, 0, 0] },
    'Em/G': { frets: [3, 2, 2, 0, 0, 0], fingers: [0, 0, 0, 0, 0, 0] },
    'D/C':  { frets: [-1, 3, 0, 2, 3, 2], fingers: [0, 2, 0, 1, 4, 3] },
    'A/C#': { frets: [-1, 4, 2, 2, 2, 0], fingers: [0, 4, 1, 2, 3, 0] },
    'A/E':  { frets: [0, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    'G/F#': { frets: [2, 2, 0, 0, 0, 3], fingers: [1, 2, 0, 0, 0, 4] },
    'Dm/F': { frets: [-1, -1, 3, 2, 3, 1], fingers: [0, 0, 3, 2, 4, 1] },
    'E7/G#':{ frets: [4, -1, 0, 1, 0, 0], fingers: [4, 0, 0, 1, 0, 0] },
    'Bb/D': { frets: [-1, -1, 0, 3, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    'Bbmaj7':{ frets: [-1, 1, 3, 2, 3, 1], fingers: [0, 1, 3, 2, 4, 1] },
    'Gm':   { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barre: 3 },
    'Cm':   { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], barre: 3 },
    'Fm':   { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], barre: 1 },
    'Eb':   { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3] },
    'Ab':   { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barre: 4 },
    'B':    { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], barre: 2 },
    'F#':   { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barre: 2 },
    'C#m':  { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], barre: 4 },
    'G#m':  { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], barre: 4 },
    'Db':   { frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1], barre: 4 },
    'Gb':   { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barre: 2 }
  };
  // aliases
  SHAPES['Ebm'] = { frets: [-1, -1, 1, 3, 4, 2], fingers: [0, 0, 1, 3, 4, 2] };
  SHAPES['Bbm'] = { frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1], barre: 1 };
  SHAPES['A#'] = SHAPES['Bb']; SHAPES['D#'] = SHAPES['Eb']; SHAPES['G#'] = SHAPES['Ab']; SHAPES['C#'] = SHAPES['Db'];
  SHAPES['A#m'] = SHAPES['Bbm']; SHAPES['D#m'] = SHAPES['Ebm'];

  /** Is this chord easy (open, no barre)? */
  function isOpenChord(sym) {
    const sh = SHAPES[sym];
    return !!sh && !sh.barre && sh.frets.every(f => f <= 3);
  }

  /** Find a shape for a chord symbol; falls back to root-only synth shape from theory */
  function shapeFor(sym) {
    const T_ = T();
    if (SHAPES[sym]) return { symbol: sym, ...SHAPES[sym] };
    // try enharmonic spelling
    const c = T_.parseChord(sym);
    if (!c) return null;
    const alt = T_.noteName(c.rootPc, !/b/.test(c.root)) + c.quality + (c.bass ? '/' + c.bass : '');
    if (SHAPES[alt]) return { symbol: sym, ...SHAPES[alt] };
    // slash chord: use plain chord shape
    if (c.bass) {
      const plain = c.root + c.quality;
      if (SHAPES[plain]) return { symbol: sym, ...SHAPES[plain], note: 'bass note ' + c.bass + ' shown in tab' };
    }
    // 7th → plain triad shape
    const triad = c.root + (c.isMinor ? 'm' : '');
    if (SHAPES[triad]) return { symbol: sym, ...SHAPES[triad], note: 'triad shape' };
    return null;
  }

  /** Sounding MIDI notes of a shape (low to high) */
  function shapeMidis(shape) {
    const out = [];
    shape.frets.forEach((f, i) => { if (f >= 0) out.push(TUNING[i] + f); });
    return out;
  }

  window.HG.Fretboard = { TUNING, STRING_NAMES, midiAt, positionsFor, fingerFor, SHAPES, shapeFor, shapeMidis, isOpenChord };
})();
