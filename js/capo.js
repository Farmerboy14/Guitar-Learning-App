/* =====================================================================
   capo.js — "Play Together": capo math, harmonica positions,
   transposing instruments, ukulele, singer keys.
   Exposes window.HG.Capo
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const T = () => window.HG.Theory;

  // Chord-shape families you can play with open strings
  const MAJOR_SHAPES = ['C', 'G', 'D', 'A', 'E'];
  const MINOR_SHAPES = ['Am', 'Em', 'Dm'];

  /** Capo positions to sound in targetKey using each open shape family */
  function capoTable(targetKey) {
    const Th = T();
    const k = Th.parseKey(targetKey);
    if (!k) return [];
    const shapes = k.isMinor ? MINOR_SHAPES : MAJOR_SHAPES;
    const rows = shapes.map(shape => {
      const sk = Th.parseKey(shape);
      const capo = Th.mod(k.rootPc - sk.rootPc, 12);
      const dia = Th.diatonicChords(shape);
      const main = k.isMinor ? [dia[0], dia[3], dia[4], dia[5], dia[2]] : [dia[0], dia[3], dia[4], dia[5]];
      const sounding = main.map(c => Th.transposeChord(c.symbol, capo, Th.keyUsesFlats(k.root, k.isMinor)));
      return { shapeKey: shape, capo, shapes: main.map(c => c.symbol), romans: main.map(c => c.roman), sounding,
        comfort: capo === 0 ? 'no capo' : capo <= 4 ? 'easy' : capo <= 7 ? 'fine' : 'high (thin sound)' };
    });
    rows.sort((a, b) => a.capo - b.capo);
    return rows;
  }

  /** Given a shape key and capo fret, what key sounds? */
  function soundingKey(shapeKey, capo) { return T().transposeKey(shapeKey, capo); }

  // Harmonica (10-hole diatonic) positions
  function harmonicaPositions(harpKey) {
    const Th = T();
    const k = Th.parseKey(harpKey);
    if (!k) return null;
    return {
      harp: k.root,
      first: { key: Th.transposeKey(k.root, 0), name: '1st position (straight harp)', feel: 'Sweet, folk and hymn sound. Blow notes give the home chord. Best for melodies.' },
      second: { key: Th.transposeKey(k.root, 7), name: '2nd position (cross harp)', feel: 'Bluesy, soulful. Draw notes give the home chord. Great for playing along and bending.' },
      third: { key: Th.transposeKey(k.root + 'm', 2), name: '3rd position', feel: 'Minor, moody sound (Dorian). Draw holes 4-8.' },
      fourth: { key: Th.transposeKey(k.root + 'm', 9), name: '4th position', feel: 'Natural minor (relative minor of the harp key).' }
    };
  }
  /** Which harmonica plays in songKey for a given position? */
  function harpForKey(songKey, position) {
    const Th = T();
    const k = Th.parseKey(songKey); if (!k) return null;
    const off = position === 'second' ? -7 : position === 'third' ? -2 : position === 'fourth' ? -9 : 0;
    return Th.transposeKey(k.root, off);
  }

  // Transposing instruments: written pitch = concert pitch + offset (semitones)
  const INSTRUMENTS = [
    { id: 'concert', name: 'Piano, guitar, ukulele, violin, flute, organ, harmonica (any C instrument)', offset: 0 },
    { id: 'Bb', name: 'B♭ instruments: trumpet, clarinet, tenor sax, soprano sax', offset: 2 },
    { id: 'Eb', name: 'E♭ instruments: alto sax, baritone sax', offset: 9 },
    { id: 'F', name: 'F instruments: French horn, English horn', offset: 7 },
    { id: 'A', name: 'A clarinet', offset: 3 },
    { id: 'G', name: 'Alto flute (in G)', offset: 5 },
    { id: 'D', name: 'D trumpet / piccolo trumpet in D', offset: -2 },
    { id: 'bass', name: 'Bass guitar, double bass, guitar (sound an octave lower than written)', offset: 0, octave: -1 }
  ];
  function concertToWritten(concertKey, instId) {
    const inst = INSTRUMENTS.find(i => i.id === instId); if (!inst) return concertKey;
    return T().transposeKey(concertKey, inst.offset);
  }
  function writtenToConcert(writtenKey, instId) {
    const inst = INSTRUMENTS.find(i => i.id === instId); if (!inst) return writtenKey;
    return T().transposeKey(writtenKey, -inst.offset);
  }

  /** Ukulele (GCEA): a guitar shape on strings 4-1 sounds a 4th (5 semitones) higher */
  function ukeChordForGuitarShape(guitarShape) { return T().transposeChord(guitarShape, 5, false); }
  function guitarShapeForUkeChord(ukeChord) { return T().transposeChord(ukeChord, -5, false); }

  /** Common hymnal keys and how guitarists usually play them */
  const HYMNAL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  /** Suggest the best (lowest-capo, open-shape) ways to sound in a key */
  function bestWays(targetKey, max) {
    return capoTable(targetKey).slice(0, max || 3);
  }

  /** Shift a key by semis for a singer (negative = lower) */
  function shiftKey(key, semis) { return T().transposeKey(key, semis); }

  window.HG.Capo = { MAJOR_SHAPES, MINOR_SHAPES, INSTRUMENTS, HYMNAL_KEYS, capoTable, soundingKey, harmonicaPositions, harpForKey, concertToWritten, writtenToConcert, ukeChordForGuitarShape, guitarShapeForUkeChord, bestWays, shiftKey };
})();
