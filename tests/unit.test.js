// Unit tests for the pure-logic modules. Run: node tests/unit.test.js
const assert = require('assert');
const HG = require('./harness.js');
require('../js/hymns.js');
require('../js/lessons.js');
require('../js/pitch.js');
const T = HG.Theory, ABC = HG.ABC, Ar = HG.Arranger, C = HG.Capo, F = HG.Fretboard;
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { failed++; console.error('✗', name, '\n   ', e.message); } }

test('note names and midi', () => {
  assert.equal(T.parseNote('C4'), 60); assert.equal(T.parseNote('F#4'), 66); assert.equal(T.parseNote('Bb3'), 58); assert.equal(T.parseNote('A4'), 69);
  assert.equal(T.noteName(61, true), 'Db'); assert.equal(T.noteName(61, false), 'C#'); assert.equal(T.noteNameOct(64), 'E4');
  assert.ok(Math.abs(T.midiToFreq(69) - 440) < 1e-9); assert.ok(Math.abs(T.freqToMidi(880) - 81) < 1e-9);
});
test('keys, scales, chords', () => {
  assert.deepEqual(T.scaleNames('F'), ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
  assert.deepEqual(T.scaleNames('D'), ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
  assert.deepEqual(T.diatonicChords('G').map(c => c.symbol), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
  assert.deepEqual(T.diatonicChords('Am').map(c => c.symbol), ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  assert.equal(T.transposeChord('D/F#', -2, false), 'C/E'); assert.equal(T.transposeChord('G', 3, true), 'Bb');
  assert.equal(T.transposeKey('Em', 5), 'Am'); assert.equal(T.transposeKey('G', 1), 'Ab'); assert.equal(T.transposeKey('C', -1), 'B');
  assert.equal(T.romanFor('D7', 'G'), 'V7'); assert.equal(T.romanFor('Em', 'G'), 'vi'); assert.equal(T.romanFor('C', 'G'), 'IV');
  assert.equal(T.intervalInfo(7).name, 'Perfect 5th'); assert.equal(T.intervalInfo(12).name, 'Octave');
  assert.equal(T.relativeKey('G'), 'Em'); assert.equal(T.relativeKey('Am'), 'C');
  const c = T.parseChord('B7'); assert.deepEqual(c.tones, [11, 3, 6, 9]);
});
test('ABC key signatures', () => {
  assert.deepEqual(ABC.keySignature('Em').accidentals, { F: 1 });
  assert.deepEqual(ABC.keySignature('Bb').accidentals, { B: -1, E: -1 });
  assert.equal(ABC.keySignature('D').fifths, 2); assert.equal(ABC.keySignature('Ddor').fifths, 0); assert.equal(ABC.keySignature('Dm').fifths, -1);
});
test('ABC parse: Amazing Grace structure', () => {
  const t = ABC.parse(HG.Hymns.byId('amazing-grace').abc);
  assert.equal(t.meter.num, 3); assert.equal(t.ticksPerMeasure, 144); assert.equal(t.pickupTicks, 48);
  assert.equal(t.measures.length, 17); assert.equal(t.measures[0].offset, 96);
  const first = t.measures[0].notes[0]; assert.equal(first.midi, 62); assert.equal(first.lyric, 'A-'); assert.equal(first.chord, 'G');
  const m7 = t.measures[7]; assert.ok(m7.notes[0].tieStart); assert.ok(t.measures[8].notes[0].tied);
  assert.equal(t.tempo, 72); assert.equal(t.systems.length, 4);
});
test('ABC parse: naturals, broken rhythm, tuplets, mid-tune pickups', () => {
  const t = ABC.parse('M:4/4\nL:1/4\nK:G\n^c c =c | A>B (3ABc | A3 | B |\nB2 z2 |');
  const n = t.measures[0].notes; assert.equal(n[0].midi, 73); assert.equal(n[1].midi, 73); assert.equal(n[2].midi, 72);
  const m1 = t.measures[1].notes; assert.equal(m1[0].dur, 72); assert.equal(m1[1].dur, 24); assert.equal(m1[2].dur, 32);
  assert.equal(t.measures[3].offset, 144, 'mid-tune pickup aligned to beat 4');
  assert.equal(t.measures[4].notes[1].rest, true);
});
test('ABC lyrics: hyphens, extends, skips', () => {
  const toks = ABC.lyricTokens('A- ma- zing_ grace * how');
  assert.deepEqual(toks.map(x => x.text || (x.extend ? '_' : '*')), ['A-', 'ma-', 'zing', '_', 'grace', '*', 'how']);
});
test('every hymn parses with full measures and lyrics', () => {
  for (const hy of HG.Hymns.list) {
    const t = ABC.parse(hy.abc);
    t.measures.forEach((m, i) => {
      const ok = m.ticks === t.ticksPerMeasure || m.offset > 0 || (i + 1 < t.measures.length && t.measures[i + 1].offset > 0) || i === t.measures.length - 1;
      assert.ok(ok, `${hy.id} measure ${i + 1} has ${m.ticks} ticks`);
    });
    const missing = t.measures.flatMap(m => m.notes).filter(n => !n.rest && !n.tied && !n.lyric && !n.lyricVerses);
    // notes without a lyric are allowed only inside melismas (extends)
    assert.ok(missing.length < t.measures.flatMap(m => m.notes).length / 2, hy.id + ' too many notes without lyrics');
    assert.ok(hy.defaultKey && hy.hymnalKey && hy.verses.length, hy.id + ' metadata');
  }
});
test('arranger: playable arrangements for every hymn at every level', () => {
  for (const hy of HG.Hymns.list) {
    const t = ABC.parse(hy.abc);
    const ranked = Ar.evaluateKeys(t);
    assert.equal(ranked.length, 12);
    for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i].score >= ranked[i - 1].score);
    const d = ranked.find(k => k.key === hy.defaultKey); assert.ok(d, hy.id + ' default key present');
    for (const level of [1, 2, 3]) {
      const arr = Ar.arrange(t, { semis: d.semis, octaveShift: d.octaveShift, level });
      let prev = -1;
      for (const e of arr.events) {
        assert.ok(e.tick > prev, 'events sorted'); prev = e.tick;
        const strings = e.notes.map(n => n.string);
        assert.equal(new Set(strings).size, strings.length, `${hy.id} L${level} two notes on one string at tick ${e.tick}`);
        const mel = e.notes.filter(n => n.role === 'melody'), others = e.notes.filter(n => n.role !== 'melody');
        if (mel.length && others.length) for (const o of others) assert.ok(o.midi < Math.max(...mel.map(n => n.midi)), `${hy.id} L${level} accompaniment above melody at tick ${e.tick}`);
        for (const n of e.notes) { assert.ok(n.fret >= 0 && n.fret <= 5, `${hy.id} fret ${n.fret}`); assert.ok(/^[pima]$/.test(n.finger)); assert.ok(n.midi === F.midiAt(n.string, n.fret)); }
        if (level === 1) assert.ok(e.notes.every(n => n.role === 'melody'));
      }
      assert.equal(arr.missingBass, 0, hy.id + ' missing bass at L' + level);
      if (level >= 2) assert.ok(arr.events.some(e => e.notes.some(n => n.role === 'bass')));
    }
  }
});
test('arranger: melody note count matches the tune', () => {
  const t = ABC.parse(HG.Hymns.byId('doxology').abc);
  const arr = Ar.arrange(t, { level: 1 });
  assert.equal(arr.events.length, 32);
  assert.equal(arr.events[0].notes[0].midi, 67 - 12); // G4 dropped an octave -> G3 (string 3 open)
  assert.equal(arr.events[0].notes[0].string, 3); assert.equal(arr.events[0].notes[0].fret, 0);
});
test('lesson patterns: R and A resolve per chord', () => {
  const L = HG.Lessons;
  const g = L.bassStrings(F.shapeFor('G'), 'G'); assert.equal(g.root, 6); assert.equal(g.alt, 4);
  const d = L.bassStrings(F.shapeFor('D'), 'D'); assert.equal(d.root, 4); assert.equal(d.alt, 5);
  const c = L.bassStrings(F.shapeFor('C'), 'C'); assert.equal(c.root, 5);
  const arr = L.patternArrangement({ meter: { num: 4, den: 4 }, grid: 24, tokens: 'R 3 A 2 R 3 A 2'.split(' '), chords: ['G', 'D'] }, { repeats: 1 });
  assert.equal(arr.events.length, 16); assert.equal(arr.events[0].notes[0].string, 6); assert.equal(arr.events[0].notes[0].fret, 3);
  assert.equal(arr.events[8].notes[0].string, 4); assert.equal(arr.events[10].notes[0].string, 5);
  const pinch = L.patternArrangement({ meter: { num: 4, den: 4 }, grid: 48, tokens: ['R+1', '3+2+1'], chords: ['G'] });
  assert.equal(pinch.events[0].notes.length, 2); assert.equal(pinch.events[1].notes.length, 3);
  for (const l of L.list) for (const ex of [l.exercise, l.exercise2]) if (ex) assert.ok(L.patternArrangement(ex.pattern).events.length > 0, l.id);
});
test('capo and instruments', () => {
  const rows = C.capoTable('G');
  const by = Object.fromEntries(rows.map(r => [r.shapeKey, r.capo]));
  assert.deepEqual(by, { G: 0, E: 3, D: 5, C: 7, A: 10 });
  assert.equal(C.capoTable('Eb').find(r => r.shapeKey === 'D').capo, 1);
  assert.equal(C.capoTable('Em').find(r => r.shapeKey === 'Am').capo, 7);
  assert.equal(C.soundingKey('G', 3), 'Bb');
  const harp = C.harmonicaPositions('G'); assert.equal(harp.first.key, 'G'); assert.equal(harp.second.key, 'D'); assert.equal(harp.third.key, 'Am');
  assert.equal(C.harpForKey('D', 'second'), 'G'); assert.equal(C.harpForKey('G', 'first'), 'G');
  assert.equal(C.concertToWritten('C', 'Bb'), 'D'); assert.equal(C.writtenToConcert('D', 'Bb'), 'C'); assert.equal(C.writtenToConcert('C', 'Eb'), 'Eb'); assert.equal(C.concertToWritten('F', 'F'), 'C');
  assert.equal(C.ukeChordForGuitarShape('D'), 'G'); assert.equal(C.ukeChordForGuitarShape('C'), 'F'); assert.equal(C.guitarShapeForUkeChord('C'), 'G');
  assert.equal(C.shiftKey('Eb', -2), 'Db');
});
test('fretboard shapes are consistent with chord tones', () => {
  for (const sym of ['C', 'D', 'E', 'G', 'A', 'Am', 'Em', 'Dm', 'D7', 'G7', 'A7', 'E7', 'B7', 'F', 'Bm', 'Bb', 'C/G', 'D/F#']) {
    const shape = F.shapeFor(sym); const c = T.parseChord(sym);
    for (const m of F.shapeMidis(shape)) assert.ok(c.tones.includes(T.mod(m, 12)) || (c.bass && T.mod(m, 12) === c.bassPc), `${sym} has a non-chord tone`);
    const lowest = F.shapeMidis(shape)[0]; assert.equal(T.mod(lowest, 12), c.bassPc, `${sym} lowest note should be the bass`);
  }
});
test('pitch detection on synthetic tones', () => {
  const sr = 44100, n = 2048;
  const tone = f => { const b = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; b[i] = 0.5 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t); } return b; };
  for (const f of [82.41, 110, 146.83, 196, 246.94, 329.63, 440]) { const r = HG.Pitch.detect(tone(f), sr); assert.ok(r, 'detected ' + f); assert.ok(Math.abs(r.freq - f) / f < 0.01, `freq ${f} got ${r.freq}`); }
  assert.equal(HG.Pitch.detect(new Float32Array(n), sr), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
