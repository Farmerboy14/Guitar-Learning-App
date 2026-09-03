// Print an ASCII tab of an arrangement for eyeballing: node tests/show.js [hymnId] [level] [semis]
const HG = require('./harness.js');
const AG = `X:1
T:Amazing Grace
M:3/4
L:1/4
Q:1/4=72
K:G
"G"D | "G"G2 B/2 G/2 | B2 A | "C"G2 E | "G"D2 D |
w: A- ma- zing_ grace how sweet the sound that
"G"G2 B/2 G/2 | "G"B2 "D"A | "D"d3- | "D7"d2 d |
w: saved a_ wretch like me I
"G"B2 d/2 B/2 | B2 A | "C"G2 E | "G"D2 D |
w: once was_ lost but now am found was
"G"G2 B/2 G/2 | "G"B2 "D7"A | "G"G3- | G3 |]
w: blind but_ now I see`;
function ascii(arr) {
  const lines = [];
  for (const sysMeasures of arr.systems) {
    const rows = ['e|', 'B|', 'G|', 'D|', 'A|', 'E|'];
    let fing = 'f|', lyr = 'w|', chd = 'c|';
    for (const mi of sysMeasures) {
      const m = arr.measures[mi];
      const evs = arr.events.filter(e => e.measure === mi);
      const cols = Math.max(1, Math.round(m.ticks / 24));
      const grid = Array.from({ length: 6 }, () => Array(cols).fill('-'));
      const fgrid = Array(cols).fill(' '), lgrid = Array(cols).fill(' '), cgrid = Array(cols).fill(' ');
      for (const e of evs) {
        const c = Math.round((e.tick - m.startTick) / 24);
        for (const n of e.notes) grid[n.string - 1][c] = String(n.fret);
        fgrid[c] = e.notes.map(n => n.finger).join('');
        if (e.lyric) lgrid[c] = e.lyric;
        if (e.chord) cgrid[c] = e.chord;
      }
      const pad = (s, w) => (s + ' '.repeat(w)).slice(0, w);
      for (let s = 0; s < 6; s++) rows[s] += grid[s].map(x => pad(x, 4)).join('') + '|';
      fing += fgrid.map(x => pad(x, 4)).join('') + '|';
      lyr += lgrid.map(x => pad(x, 4)).join('') + '|';
      chd += cgrid.map(x => pad(x, 4)).join('') + '|';
    }
    lines.push(chd, ...rows, fing, lyr, '');
  }
  return lines.join('\n');
}
if (require.main === module) {
  const level = +(process.argv[3] || 3), semis = +(process.argv[4] || 0);
  let abc = AG;
  if (process.argv[2] && process.argv[2] !== 'ag') {
    require('../js/hymns.js');
    const h = HG.Hymns.byId(process.argv[2]);
    if (!h) { console.error('unknown hymn'); process.exit(1); }
    abc = h.abc;
  }
  const tune = HG.ABC.parse(abc);
  const arr = HG.Arranger.arrange(tune, { level, semis });
  console.log(`key ${arr.key} level ${level} semis ${semis} maxFret ${arr.maxFretUsed} missingBass ${arr.missingBass} chords ${arr.chordsUsed.join(' ')}`);
  console.log(ascii(arr));
  console.log('best keys:', HG.Arranger.evaluateKeys(tune).slice(0, 5).map(k => `${k.key}(${k.score.toFixed(1)}, oct ${k.octaveShift})`).join(', '));
}
module.exports = { ascii, AG };
