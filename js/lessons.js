/* =====================================================================
   lessons.js — the fingerpicking course + picking-pattern engine
   Pattern tokens (one per grid step):
     digits 1-6 = pluck that string; 'R' = chord's root bass string;
     'A' = chord's alternate bass string; '+' joins simultaneous strings
     (e.g. 'R+1' = pinch); '-' = rest/nothing on this step.
   Exposes window.HG.Lessons
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const TPQ = 48;

  /** Bass strings of a chord shape: root string and an alternate (prefers the 5th) */
  function bassStrings(shape, chordSym) {
    const T = window.HG.Theory, F = window.HG.Fretboard;
    const c = T.parseChord(chordSym);
    const played = [];
    shape.frets.forEach((f, i) => { if (f >= 0) played.push({ string: 6 - i, fret: f, midi: F.TUNING[i] + f }); });
    const bass = played.filter(p => p.string >= 4);
    // muted bass strings whose open note is a chord tone are fair game for the alternating thumb (e.g. open A under a D chord)
    const extra = [];
    shape.frets.forEach((f, i) => { const s = 6 - i; if (f < 0 && s >= 4 && c && c.tones.includes(T.mod(F.TUNING[i], 12))) extra.push({ string: s, fret: 0, midi: F.TUNING[i] }); });
    let root = bass.find(p => c && T.mod(p.midi, 12) === c.bassPc) || bass[0] || extra[0];
    const pool = bass.concat(extra).filter(p => p !== root);
    let alt = pool.find(p => c && T.mod(p.midi, 12) === c.fifthPc) || pool.find(p => p.string > root.string) || pool[0] || root;
    return { root: root.string, alt: alt.string };
  }

  /**
   * Build an arrangement-like object from a pattern so the tab renderer and player can use it.
   * pattern: { meter:{num,den}, grid: ticks per step (default eighth = 24), tokens: [...], chords: ['G','C',...] (one per repetition of tokens) }
   */
  function patternArrangement(pattern, opts) {
    const F = window.HG.Fretboard, Ar = window.HG.Arranger;
    const o = Object.assign({ repeats: 1 }, opts || {});
    const meter = pattern.meter || { num: 4, den: 4 };
    const mi = Ar.meterInfo(meter);
    const grid = pattern.grid || 24;
    const chords = (pattern.chords && pattern.chords.length) ? pattern.chords : [null];
    const events = [];
    const measures = [];
    let tick = 0;
    const systems = [];
    let sys = [];
    const stepsPerMeasure = mi.tpm / grid;
    let measureIndex = 0;
    for (let rep = 0; rep < o.repeats; rep++) {
      for (let ci = 0; ci < chords.length; ci++) {
        const sym = chords[ci];
        const shape = sym ? F.shapeFor(sym) : null;
        const bs = shape ? bassStrings(shape, sym) : { root: 6, alt: 5 };
        const fretOf = s => shape ? shape.frets[6 - s] : 0;
        for (let i = 0; i < pattern.tokens.length; i++) {
          const stepInMeasure = i % stepsPerMeasure;
          if (stepInMeasure === 0) {
            measures.push({ index: measureIndex, startTick: tick, ticks: mi.tpm, offset: 0 });
            sys.push(measureIndex);
            if (sys.length === (pattern.measuresPerLine || 4)) { systems.push(sys); sys = []; }
            measureIndex++;
          }
          const tok = pattern.tokens[i];
          if (tok !== '-' && tok !== '.') {
            const notes = [];
            for (const part of String(tok).split('+')) {
              let s = part === 'R' ? bs.root : part === 'A' ? bs.alt : parseInt(part, 10);
              if (!(s >= 1 && s <= 6)) continue;
              const fret = Math.max(0, fretOf(s));
              notes.push({ string: s, fret, midi: F.midiAt(s, fret), role: s >= 4 ? 'bass' : 'melody', finger: F.fingerFor(s), velocity: s >= 4 ? 0.9 : 0.95, dur: grid });
            }
            if (notes.length) {
              notes.sort((a, b) => b.string - a.string);
              events.push({ tick, notes, chord: (i === 0 && sym) ? sym : null, lyric: null, measure: measureIndex - 1, tickInMeasure: stepInMeasure * grid, isMelody: notes.some(n => n.role === 'melody') });
            }
          }
          tick += grid;
        }
      }
    }
    if (sys.length) systems.push(sys);
    return { key: chords[0] || 'open', useFlats: false, level: 0, meter, meterInfo: mi, ticksPerMeasure: mi.tpm, pickupTicks: 0, measures, systems, totalTicks: tick, tempo: pattern.tempo || 60, events, chordsUsed: chords.filter(Boolean), melodyMidis: events.filter(e => e.isMelody).map(e => e.notes[e.notes.length - 1].midi), missingBass: 0, maxFretUsed: 3 };
  }

  const P = (tokens, extra) => Object.assign({ meter: { num: 4, den: 4 }, grid: 24, tokens: tokens.split(/\s+/).filter(Boolean) }, extra || {});

  const lessons = [
    {
      id: 'l01', unit: 'Foundations', title: 'Meet your picking hand', minutes: 8,
      goal: 'Learn which finger plays which string, and pluck the open strings cleanly.',
      body: [
        'Classical guitarists name the picking-hand fingers with letters from Spanish: <b>p</b> (pulgar, thumb), <b>i</b> (índice, index), <b>m</b> (medio, middle) and <b>a</b> (anular, ring). You will see these letters under every note in this app.',
        'The rule that makes fingerpicking easy: <b>the thumb owns the three bass strings</b> (6, 5 and 4, the thick ones) and <b>i, m, a each own one treble string</b>: i plays string 3 (G), m plays string 2 (B), a plays string 1 (high E). Your fingers never have to hunt for a string.',
        'Sit up, rest the guitar on your right leg, and let your right forearm rest on the top edge of the guitar so the hand hangs over the soundhole. Curl the fingers gently, like holding a small apple. The thumb stays in front of the fingers (closer to the neck) so they don’t collide.',
        'Thumb strokes go <i>down</i> toward the floor. Finger strokes pull <i>in</i> toward your palm. Play with the flesh and a little nail. Aim for a round, singing tone rather than a click.'
      ],
      tips: ['Keep the wrist relaxed and slightly arched, not flat against the guitar.', 'Look at the strings at first; soon your fingers will find them by feel.', 'Quiet and clean beats loud and buzzy.'],
      exercise: { type: 'pattern', title: 'Open-string arpeggio: p i m a', pattern: P('6 3 2 1 6 3 2 1', { chords: [] }), tempoStart: 50, tempoGoal: 80, instructions: 'No fretting hand needed. Thumb on 6, then i on 3, m on 2, a on 1. Let every string ring.' },
      game: { type: 'strings', title: 'String Check (microphone)', instructions: 'Pluck the string the app asks for. It listens and tells you if you got it.' }
    },
    {
      id: 'l02', unit: 'Foundations', title: 'The thumb rules the bass', minutes: 8,
      goal: 'Give your thumb a steady, even pulse on strings 6, 5 and 4.',
      body: [
        'Almost every fingerstyle hymn has the same secret: the thumb keeps a slow, steady beat on the bass strings while the fingers play the tune above. If the thumb is steady, everything else falls into place.',
        'Play strings 6, 5, 4, 5 with the thumb only, one note per click of the metronome. Rest your i, m and a fingers lightly on strings 3, 2 and 1 so your hand has an anchor.',
        'Now hold an <b>E minor</b> chord (the easiest chord on the guitar: two fingers on the second fret of strings 5 and 4) and play the same thumb pattern. Hear how the bass notes now belong to a chord.'
      ],
      tips: ['Let the thumb fall through the string and come to rest on the next string (a rest stroke). It gives a fat, warm bass.', 'Count out loud: "one, two, three, four".'],
      exercise: { type: 'pattern', title: 'Thumb bass on E minor', pattern: P('6 5 4 5 6 5 4 5', { grid: 48, chords: ['Em'] }), tempoStart: 60, tempoGoal: 90, instructions: 'Thumb only, one bass note per beat. Keep it even.' }
    },
    {
      id: 'l03', unit: 'Foundations', title: 'Fingers i, m and a', minutes: 8,
      goal: 'Let each finger pluck its own string without moving the hand.',
      body: [
        'Plant your thumb on string 6 as an anchor. Now pluck string 3 with i, string 2 with m and string 1 with a. Then back: a, m, i. The hand should stay still; only the fingers move, closing toward the palm.',
        'Do it on a <b>G chord</b>. Strings 3 and 2 are open and string 1 is at the third fret, so the fingers have real notes to sing.',
        'Listen for evenness: all three notes the same volume. The ring finger (a) is the weak one; give it a little extra intention.'
      ],
      tips: ['Move from the big knuckle, not the fingertip joint.', 'If a finger keeps hitting the wrong string, slow down until it never misses, then speed up.'],
      exercise: { type: 'pattern', title: 'i m a m on G', pattern: P('3 2 1 2 3 2 1 2', { chords: ['G'] }), tempoStart: 50, tempoGoal: 90, instructions: 'Thumb rests on string 6. Fingers only: i (3), m (2), a (1), m (2).' }
    },
    {
      id: 'l04', unit: 'First patterns', title: 'Your first arpeggio: p i m a', minutes: 10,
      goal: 'Combine thumb and fingers into the classic rolling arpeggio, and change chords without stopping.',
      body: [
        'Arpeggio just means "play the chord one note at a time." Thumb plays the bass, then i, m, a climb up the treble strings. Two rolls per measure in 4/4.',
        'The thumb changes string with the chord: on G it plays string 6, on C string 5, on D string 4. That is why the tab shows <b>R</b> (root) in the pattern: the thumb finds the lowest note of the chord.',
        'Practise the chord change first: G to C to D and back, one strum each, until your left hand lands all fingers together. Then add the pattern.'
      ],
      tips: ['Start the chord change on the last note of the pattern; the open strings cover you.', 'Ring, don’t rush: let the four notes overlap like bells.'],
      exercise: { type: 'pattern', title: 'p i m a on G, C, D', pattern: P('R 3 2 1 R 3 2 1', { chords: ['G', 'C', 'D', 'G'] }), tempoStart: 50, tempoGoal: 100, instructions: 'One measure per chord. Root bass then i m a, twice.' }
    },
    {
      id: 'l05', unit: 'First patterns', title: 'Waltz picking (3/4) for Amazing Grace', minutes: 10,
      goal: 'Learn the bass–pluck–pluck feel that carries every hymn in 3/4.',
      body: [
        'Many hymns are waltzes: three beats per measure, with the first beat strongest. Say "ONE two three, ONE two three."',
        'The pattern: thumb plays the bass on beat one; on beats two and three the fingers pluck strings 3, 2 and 1 together (i, m, a at the same moment) like a soft chord.',
        'Then a gentler version: bass, then i, then m, one note per beat. This is exactly the texture used in Amazing Grace at Level 2 and 3.'
      ],
      tips: ['Beat one is a little louder than two and three.', 'Keep the fingers close to the strings between plucks.'],
      exercise: { type: 'pattern', title: 'Bass, pluck, pluck', pattern: P('R 3+2+1 3+2+1', { meter: { num: 3, den: 4 }, grid: 48, chords: ['G', 'C', 'G', 'D'] }), tempoStart: 60, tempoGoal: 100, instructions: 'Beat 1: thumb on the root. Beats 2 and 3: i m a together.' },
      exercise2: { type: 'pattern', title: 'Bass, i, m (rolling waltz)', pattern: P('R 3 2', { meter: { num: 3, den: 4 }, grid: 48, chords: ['G', 'C', 'G', 'D'] }), tempoStart: 60, tempoGoal: 110, instructions: 'One note per beat: p, i, m.' },
      hymn: { id: 'amazing-grace', level: 2, loop: [1, 4], note: 'Now try the first line of Amazing Grace at Level 2 (bass + melody). Loop it slowly.' }
    },
    {
      id: 'l06', unit: 'First patterns', title: 'The pinch', minutes: 8,
      goal: 'Pluck a bass note and a melody note at the same instant.',
      body: [
        'A pinch is the thumb and a finger plucking together, like picking up a coin. In hymns this happens on beat one: the bass and the melody note sound together, which is what makes it sound like two players.',
        'Practise: pinch strings 6 and 1 (p and a), then i, then m. Then pinch 6 and 2 (p and m). The thumb pushes down, the finger pulls up, at exactly the same moment.'
      ],
      tips: ['Think of the pinch as one motion, not two.', 'The melody note (finger) should be slightly louder than the bass.'],
      exercise: { type: 'pattern', title: 'Pinch then roll', pattern: P('R+1 3 2 3 R+1 3 2 3', { chords: ['G', 'Em', 'C', 'D'] }), tempoStart: 50, tempoGoal: 96, instructions: 'Beat 1 pinch p+a, then i m i.' }
    },
    {
      id: 'l07', unit: 'First patterns', title: 'Alternating bass', minutes: 10,
      goal: 'Let the thumb walk between two bass strings, the foundation of Travis picking.',
      body: [
        'Instead of the same bass note every beat, the thumb alternates: root, then the chord’s other bass string (usually the fifth). On G: string 6 then string 4. On C: string 5 then string 4. On D: string 4 then string 5.',
        'The fingers fill the "and" between thumb notes: R (3) A (2) R (3) A (2). Say "boom chick boom chick". Once this is automatic you can put any melody on top.',
        'In this app the pattern letters <b>R</b> and <b>A</b> always mean "the root string of this chord" and "its alternate bass string", so the same pattern works on every chord.'
      ],
      tips: ['Practise the thumb alone first (R A R A), then add one finger, then both.', 'Keep the thumb strokes even in volume: the alternate bass is not an accent.'],
      exercise: { type: 'pattern', title: 'Travis foundation', pattern: P('R 3 A 2 R 3 A 2', { chords: ['G', 'C', 'D', 'G'] }), tempoStart: 50, tempoGoal: 100, instructions: 'Thumb: root, alternate, root, alternate. Fingers i and m in between.' }
    },
    {
      id: 'l08', unit: 'Hymns', title: 'Melody on top of the bass', minutes: 12,
      goal: 'Play a hymn tune with the fingers while the thumb keeps the bass.',
      body: [
        'This is the moment it becomes music. In the hymn player, <b>Level 1</b> is the melody alone: learn where the tune lives. <b>Level 2</b> adds the thumb on beat one of every chord. <b>Level 3</b> adds the alternating bass and gentle fills.',
        'Work one line (one row of tab) at a time. Loop it. Play it three times cleanly before moving to the next line. Slow is not a failure; slow is the method.',
        'Read the finger letters: melody notes on strings 3, 2, 1 go to i, m, a. When the melody dips onto string 4 while the thumb is busy, the app hands that note to i.'
      ],
      tips: ['Sing the words while you play. It keeps the rhythm honest and the melody on top.', 'If a line is hard, play just the pinches (beat one of each measure) first.'],
      hymn: { id: 'amazing-grace', level: 2, loop: null, note: 'Amazing Grace, Level 2, whole hymn, slowly.' }
    },
    {
      id: 'l09', unit: 'Hymns', title: 'Lullaby picking in 6/8', minutes: 10,
      goal: 'Feel the rocking two-group pulse of 6/8 and play Silent Night.',
      body: [
        '6/8 has six quick beats grouped in two threes: "ONE two three FOUR five six". The thumb plays on one and four; the fingers roll on the other beats: p i m, p i m.',
        'Silent Night was written for guitar and this is its natural accompaniment. Play the pattern on C, then G7, then F. Then open the hymn at Level 3 and hear the same rocking motion under the melody.'
      ],
      tips: ['The second group (beats 4–6) is softer than the first.', 'Let the bass note ring through all three beats.'],
      exercise: { type: 'pattern', title: 'p i m, p i m', pattern: P('R 3 2 A 3 2', { meter: { num: 6, den: 8 }, chords: ['C', 'G7', 'F', 'C'] }), tempoStart: 60, tempoGoal: 110, instructions: 'Thumb on beats 1 and 4, i and m between.' },
      hymn: { id: 'silent-night', level: 3, loop: [0, 3], note: 'Silent Night, first line, Level 3.' }
    },
    {
      id: 'l10', unit: 'Hymns', title: 'The full arrangement', minutes: 12,
      goal: 'Put bass, melody and fills together at Level 3.',
      body: [
        'At Level 3 the app writes a complete arrangement: alternating bass, the melody on top, and "fills" (quiet chord notes) where the melody holds a long note so the sound never stops.',
        'Fills are printed smaller and are optional: leave any of them out. The melody and the beat-one bass are the skeleton; everything else is decoration.',
        'Try Joyful, Joyful: its stepwise melody and simple chords make Level 3 very approachable.'
      ],
      tips: ['Play fills softer than the melody: brush them, don’t dig.', 'Use "Play bass only" so the app plays the thumb part while you play the melody, then swap.'],
      hymn: { id: 'joyful-joyful', level: 3, loop: null, note: 'Joyful, Joyful at Level 3.' }
    },
    {
      id: 'l11', unit: 'Musicianship', title: 'Tone, dynamics and letting notes ring', minutes: 8,
      goal: 'Make the same notes sound beautiful.',
      body: [
        'Where you pluck changes the tone: over the soundhole is warm, near the bridge is bright, near the neck is dark and mellow. Hymns usually want warm.',
        'The melody should be a little louder than everything else. Play melody notes with a rest stroke (the finger comes to rest on the next string) and fills with free strokes.',
        'Let notes ring into each other. Fingerstyle is about overlapping sounds, like a small choir. Only lift a fretting finger when you must.'
      ],
      tips: ['Record yourself on your phone and listen for the melody. Can you hum it back from the recording?', 'Slow, soft and clean sounds better than fast and loud.'],
      hymn: { id: 'come-thou-fount', level: 2, loop: null, note: 'Come, Thou Fount at Level 2, focusing on tone.' }
    },
    {
      id: 'l12', unit: 'Musicianship', title: 'Playing with other people', minutes: 8,
      goal: 'Understand keys and the capo so you can join a singer, a piano or a harmonica.',
      body: [
        'Everyone playing together must be in the same <b>key</b>: the same home note. A G harmonica plays in G, so the guitar must sound in G. A hymnal that prints a hymn in E-flat needs the guitar to sound in E-flat.',
        'A capo moves your open chords up: each fret is one half step. Play G shapes with the capo on fret 1 and the guitar sounds in A-flat. The Play Together tab does this math for any key and any instrument.',
        'Singers care about this too: if a hymn is too high, move the capo down or pick a lower key.'
      ],
      tips: ['Tune with the tuner before playing with others: a capo exaggerates tuning problems.', 'Place the capo just behind the fret, not on it.'],
      tool: { tab: 'together', note: 'Open Play Together and try: "I have a G harmonica" and "the hymnal says E-flat".' }
    }
  ];

  function byId(id) { return lessons.find(l => l.id === id) || null; }

  window.HG.Lessons = { list: lessons, byId, patternArrangement, bassStrings };
})();
