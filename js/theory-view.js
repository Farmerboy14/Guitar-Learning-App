/* =====================================================================
   theory-view.js — "Why it sounds good": interactive music theory + ear games
   ===================================================================== */
(function () {
  'use strict';
  const HG = window.HG;
  const { h, clear, fmtKey, fmtChord, toast } = HG.UI;
  HG.views = HG.views || {};
  const T = () => HG.Theory, A = () => HG.Audio, F = () => HG.Fretboard;
  const FRIENDLY = ['C', 'G', 'D', 'A', 'E', 'F'];

  /** A close chord voicing around C3–C5 for arbitrary pitch classes */
  function voicing(rootPc, tones) {
    let base = 48 + T().mod(rootPc, 12);
    if (base > 55) base -= 12;
    const out = tones.map(t => base + t);
    out.push(base + 12);
    return out;
  }
  function chordMidis(sym) {
    const shape = F().shapeFor(sym);
    if (shape && !shape.note) return F().shapeMidis(shape);
    const c = T().parseChord(sym);
    return c ? voicing(c.rootPc, T().QUALITIES[c.quality]) : [];
  }
  function strumChord(sym, when, vel) { A().ensure(); A().strum(chordMidis(sym), when, { velocity: vel || 0.8 }); }
  function playSeq(midis, gap, opts) {
    A().ensure();
    const t0 = A().now() + 0.05;
    midis.forEach((m, i) => A().pluck(m, t0 + i * gap, opts || { velocity: 0.9 }));
    return t0 + midis.length * gap;
  }
  function keySel(value, onChange, keys) {
    const sel = h('select');
    (keys || ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Am', 'Em', 'Dm']).forEach(k => sel.appendChild(h('option', { value: k, selected: k === value }, fmtKey(k))));
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }
  function fretboardNotes(opts) {
    const o = Object.assign({ frets: 12, scale: null, rootPc: null, naturalsOnly: false }, opts || {});
    const marks = [];
    for (let s = 6; s >= 1; s--) for (let f = 0; f <= o.frets; f++) {
      const midi = F().midiAt(s, f);
      const pc = T().mod(midi, 12);
      const name = T().noteName(midi, o.flats);
      if (o.naturalsOnly && /[#b]/.test(name)) continue;
      if (o.scale && !o.scale.includes(pc)) { if (o.dimOthers) marks.push({ string: s, fret: f, label: '', cls: 'dim', midi }); continue; }
      marks.push({ string: s, fret: f, label: name, cls: o.rootPc === pc ? 'root' : '', midi });
    }
    const svg = HG.Tab.fretboardSvg(marks, { frets: o.frets, width: 720 });
    svg.querySelectorAll('.fb-mark').forEach((el, i) => el.addEventListener('click', () => { A().ensure(); A().pluck(marks[i].midi, null, { velocity: 0.9 }); }));
    return h('div.fb-wrap', svg);
  }

  /* ------------------------------------------------------------ topics */
  const topics = [
    { id: 'notes', title: '1. Twelve notes, one fretboard', blurb: 'Every fret is a half step. Twelve of them and you are back where you started.', render(box) {
      box.appendChild(h('p', 'Western music uses <b>twelve</b> different notes, and then they repeat: the thirteenth note is the first one again, sounding higher. That repeat is called an <b>octave</b>, and two notes an octave apart blend so perfectly that we give them the same name.', { html: true }));
      box.lastChild.innerHTML = 'Western music uses <b>twelve</b> different notes, and then they repeat: the thirteenth note is the first one again, sounding higher. That repeat is called an <b>octave</b>, and two notes an octave apart blend so perfectly that we give them the same name.';
      box.appendChild(h('p', { html: 'On the guitar every fret is one step of the twelve, a <b>half step</b>. Move up twelve frets and you get the same note an octave higher. The seven letter names (A B C D E F G) are the white keys of a piano; the notes between them have a sharp (♯) or flat (♭) name. Notice there is no note between B and C, or between E and F.' }));
      box.appendChild(h('p.small.muted', 'Tap any note to hear it. Try one note, then the same note twelve frets higher.'));
      const nat = h('input', { type: 'checkbox' });
      const wrap = h('div');
      const draw = () => { clear(wrap); wrap.appendChild(fretboardNotes({ naturalsOnly: nat.checked })); };
      nat.addEventListener('change', draw); draw();
      box.appendChild(h('div.btn-row', h('label.toggle', nat, ' Show only the seven letter names')));
      box.appendChild(wrap);
      box.appendChild(h('p', { html: '<b>Why this matters for playing with others:</b> if a friend’s instrument is in a different key, every note simply shifts by the same number of half steps. A capo does exactly that shift for you.' }));
    } },
    { id: 'scale', title: '2. The major scale (do re mi)', blurb: 'Seven notes chosen from the twelve. The pattern of steps is what makes it sound "right".', render(box) {
      box.appendChild(h('p', { html: 'A <b>scale</b> is a chosen set of notes to build music from. The major scale takes seven of the twelve using this recipe of steps: <b>whole, whole, half, whole, whole, whole, half</b> (a whole step is two frets). Start on any note, follow the recipe, and you get the bright "do re mi fa sol la ti do" sound that most hymns use.' }));
      let key = 'G';
      const wrap = h('div'), names = h('div.big');
      const draw = () => {
        clear(wrap);
        const k = T().parseKey(key);
        const pcs = T().scalePcs(k.rootPc, 'major');
        names.textContent = T().scaleNames(key).map(fmtKey).join('  ');
        wrap.appendChild(fretboardNotes({ frets: 12, scale: pcs, rootPc: k.rootPc, flats: T().keyUsesFlats(k.root, false), dimOthers: true }));
      };
      const play = () => { const k = T().parseKey(key); let root = 40 + T().mod(k.rootPc - 4, 12); if (root < 43) root += 12; const seq = T().MAJOR.concat([12]).map(i => root + i); playSeq(seq, 0.4); };
      box.appendChild(h('div.btn-row', h('span', 'Key: '), keySel(key, v => { key = v; draw(); }, ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb']), h('button.btn.primary', { onClick: play }, '▶ Play the scale')));
      box.appendChild(names); box.appendChild(wrap);
      box.appendChild(h('p', { html: 'The red note is <b>do</b>, the home note (the "tonic"). Every hymn melody keeps coming back to it, and the last note of a hymn is almost always do. The note just below do (<b>ti</b>) is only a half step away, which is why it feels like it is leaning on the door, wanting to go home.' }));
      box.appendChild(h('p', { html: 'Minor keys use the same twelve notes with a different recipe (the half steps fall in other places), which is why they sound darker. <i>What Child Is This</i> is in a minor key; every other hymn here is major.' }));
    } },
    { id: 'intervals', title: '3. Why some pairs of notes sound sweet', blurb: 'The distance between two notes is an interval. Simple ratios blend; messy ratios clash.', render(box) {
      box.appendChild(h('p', { html: 'Play two notes together and you hear an <b>interval</b>. Some intervals sound calm and sweet, others tense. The reason is physics: a note is a vibration, and two vibrations whose speeds make a <b>simple ratio</b> (2:1, 3:2, 5:4) line up neatly, so the ear hears one smooth sound. Ratios like 16:15 never line up, so the two waves fight and "beat" against each other.' }));
      let semis = 7;
      const info = h('div'), canvas = h('canvas.wave-canvas', { width: 900, height: 120 });
      const sel = h('select');
      T().INTERVALS.forEach(iv => sel.appendChild(h('option', { value: iv.semis, selected: iv.semis === semis }, `${iv.name} (${iv.semis} half steps, ${iv.ratio})`)));
      sel.addEventListener('change', () => { semis = +sel.value; draw(); });
      const draw = () => {
        const iv = T().intervalInfo(semis);
        clear(info);
        info.appendChild(h('p', h('b', iv.name + ' · ratio ' + iv.ratio + ' · '), iv.feel));
        const ctx = canvas.getContext('2d');
        const w = canvas.width, hh = canvas.height;
        ctx.fillStyle = '#141721'; ctx.fillRect(0, 0, w, hh);
        const f1 = 1, f2 = Math.pow(2, semis / 12);
        const cycles = 6;
        const line = (fn, color, mid, amp) => { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; for (let x = 0; x < w; x++) { const t = x / w * cycles; const y = mid - amp * fn(t); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); };
        line(t => Math.sin(2 * Math.PI * f1 * t), '#9ad0ff', 30, 14);
        line(t => Math.sin(2 * Math.PI * f2 * t), '#ffd27a', 60, 14);
        line(t => 0.5 * (Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t)), '#f2ecdd', 96, 20);
        ctx.fillStyle = '#aaa79b'; ctx.font = '11px system-ui'; ctx.fillText('note 1', 6, 22); ctx.fillText('note 2', 6, 52); ctx.fillText('both together', 6, 84);
      };
      const root = 52; // E3
      box.appendChild(h('div.btn-row', h('span', 'Interval: '), sel, h('button.btn.primary', { onClick: () => { playSeq([root, root + semis], 0.5); setTimeout(() => A().strum([root, root + semis], null, { spread: 0.01 }), 1100); } }, '▶ Guitar'), h('button.btn', { onClick: () => { A().ensure(); A().toneChord([root, root + semis], null, 1.8, { type: 'organ', velocity: 0.25 }); } }, '▶ Organ (held)')));
      box.appendChild(info); box.appendChild(canvas); draw();
      box.appendChild(h('p', { html: 'The <b>octave</b> (2:1) and the <b>fifth</b> (3:2) are so stable that a bass note and a melody note a fifth apart sound like one big note; that is why fingerstyle bass lines love the root and the fifth. <b>Thirds</b> (5:4 and 6:5) are what give chords their sweetness, and whether that third is big (major) or small (minor) decides whether the chord smiles or sighs.' }));
      box.appendChild(h('p', { html: 'Tension is not bad: music needs it. A hymn without any tense intervals would be a lullaby with no story. Composers place a tense interval and then resolve it to a sweet one, and that release is what "sounds good".' }));
    } },
    { id: 'chords', title: '4. Chords: three notes that agree', blurb: 'Stack a third on a third and you get a chord. The middle note sets the mood.', render(box) {
      box.appendChild(h('p', { html: 'A <b>chord</b> is three or more notes played together. The basic chord (a <b>triad</b>) is built from a root, a note a third above it, and a note a fifth above it. The fifth is always the same, so the <b>third</b> is the note that decides the mood: four half steps above the root makes a <b>major</b> chord (bright), three makes a <b>minor</b> chord (tender, sad).' }));
      const demos = [['C', 'C major: C E G. Bright, open, at rest.'], ['Cm', 'C minor: C E♭ G. Only the middle note moved down a fret, and the mood changed.'], ['C7', 'C7: adds a fourth note (B♭) that makes the chord lean forward, wanting to move to F.'], ['Csus4', 'Csus4: the third is replaced by the fourth (F). Neither major nor minor; it hangs, then "resolves" back to C.']];
      demos.forEach(([sym, text]) => box.appendChild(h('div.demo', h('div.btn-row', h('button.btn.primary', { onClick: () => strumChord(sym) }, '▶ ' + fmtChord(sym)), h('span', text)))));
      box.appendChild(h('div.btn-row', h('button.btn', { onClick: () => { strumChord('C'); setTimeout(() => strumChord('Cm'), 1300); } }, '▶ Major then minor'), h('button.btn', { onClick: () => { strumChord('Csus4'); setTimeout(() => strumChord('C'), 1300); } }, '▶ Sus4 then major (resolve)'), h('button.btn', { onClick: () => { strumChord('C7'); setTimeout(() => strumChord('F'), 1300); } }, '▶ C7 then F (pull)')));
      box.appendChild(h('p', { html: 'In fingerstyle you rarely play all the notes of a chord at once. The thumb gives the root, the melody supplies one chord note on top, and one filler note in the middle is enough for the ear to "hear" the whole chord. That is why a hymn can sound full with only two or three strings ringing.' }));
    } },
    { id: 'key', title: '5. A key is a family of chords', blurb: 'Build a chord on each note of the scale and you get seven chords that belong together.', render(box) {
      box.appendChild(h('p', { html: 'Take the seven notes of a major scale and build a chord on each one, using only scale notes. You get seven chords that all sound like they belong to the same <b>key</b>. Musicians number them with Roman numerals (upper case = major, lower case = minor) so the pattern is the same in every key:' }));
      let key = 'G';
      const tbl = h('table.simple');
      const draw = () => {
        clear(tbl);
        tbl.appendChild(h('tr', h('th', 'Numeral'), h('th', 'Chord in ' + fmtKey(key)), h('th', 'Role')));
        const roles = ['home (tonic)', 'gentle step away', 'rarely used', 'the "Amen" chord (subdominant)', 'tension that pulls home (dominant)', 'the sad cousin (relative minor)', 'unstable, almost never in hymns'];
        T().diatonicChords(key).forEach((c, i) => {
          const tr = h('tr', { class: [0, 3, 4, 5].includes(i) ? 'hl' : '' }, h('td', h('b', c.roman)), h('td', h('button.btn.small', { onClick: () => strumChord(c.symbol) }, '▶ ' + fmtChord(c.symbol))), h('td.small', roles[i]));
          tbl.appendChild(tr);
        });
      };
      box.appendChild(h('div.btn-row', h('span', 'Key: '), keySel(key, v => { key = v; draw(); }, FRIENDLY.concat(['Bb', 'Eb'])), h('button.btn', { onClick: () => { const d = T().diatonicChords(key); [0, 3, 4, 0].forEach((i, n) => setTimeout(() => strumChord(d[i].symbol), n * 900)); } }, '▶ I – IV – V – I')));
      box.appendChild(tbl); draw();
      box.appendChild(h('p', { html: 'Hymns live on the highlighted four: <b>I, IV, V</b> and <b>vi</b>. Amazing Grace uses only I, IV and V. Once you know the numerals you can play any hymn in any key: "I IV V" in G is G C D, in C it is C F G, in D it is D G A. That is also why the capo works: the shapes stay the same, only the letter names change.' }));
    } },
    { id: 'cadence', title: '6. Tension and release', blurb: 'The V chord leans toward I. Hearing that lean, and its release, is the heart of harmony.', render(box) {
      box.appendChild(h('p', { html: 'Music moves by creating a little tension and then relaxing it. The strongest example: the <b>V chord</b> contains <b>ti</b>, the note a half step below home, and a V7 chord adds a note that clashes softly with it. Both want to move to the I chord. When they do, the phrase feels finished. That moment is called a <b>cadence</b>.' }));
      let key = 'G';
      const run = (degrees, gap) => { const d = T().diatonicChords(key); degrees.forEach((deg, n) => setTimeout(() => strumChord(typeof deg === 'string' ? deg : d[deg].symbol), n * (gap || 900))); };
      const v7 = () => T().diatonicChords(key)[4].symbol + '7';
      box.appendChild(h('div.btn-row', h('span', 'Key: '), keySel(key, v => { key = v; }, FRIENDLY)));
      [
        ['▶ V7 → I  (finished)', () => run([v7(), 0]), 'The "authentic" cadence. Nearly every hymn ends this way.'],
        ['▶ IV → I  (Amen)', () => run([3, 0]), 'The "plagal" cadence: the sound of "A-men" at the end of a hymn. Gentle, not dramatic.'],
        ['▶ I → V  (unfinished)', () => run([0, 4]), 'Ending on V leaves a question hanging. Halfway through a hymn this is normal; at the very end it would feel wrong.'],
        ['▶ I – vi – IV – V7 – I', () => run([0, 5, 3, v7(), 0]), 'Home, a sad cousin, the Amen chord, tension, home. Four chords that thousands of songs share.'],
        ['▶ I – IV – V7 – I', () => run([0, 3, v7(), 0]), 'The three-chord progression of countless hymns and folk songs.']
      ].forEach(([label, fn, text]) => box.appendChild(h('div.demo', h('div.btn-row', h('button.btn.primary', { onClick: fn }, label), h('span.small', text)))));
      box.appendChild(h('p', { html: 'Listen for it in the hymns: in Amazing Grace, "like me" sits on a D chord (V) for two measures and the return to G on "I once" is the release. When you play, lean into the V chord a little, and let the I chord settle.' }));
    } },
    { id: 'harmony', title: '7. Melody + bass = harmony (what fingerstyle does)', blurb: 'How this app turns a tune and chord names into a full arrangement.', render(box) {
      box.appendChild(h('p', { html: 'Fingerstyle hymn playing is two musicians in one hand. The <b>thumb is the bass player</b>: on the strong beat it plays the root of the current chord. The <b>fingers are the singer</b>: they play the melody on the top strings. Because the melody note is nearly always a note of the chord, bass + melody already outline the whole chord, and a soft filler note in between completes it.' }));
      box.appendChild(h('p', { html: 'Those are exactly the rules this app follows when it writes a tab: (1) put each melody note on the highest comfortable string in first position; (2) on beat one, find the chord’s root on a bass string below the melody; (3) on the next strong beat alternate to the chord’s fifth; (4) where the melody holds a long note, add a quiet chord tone on a middle string so the sound keeps moving. Level 1, 2 and 3 in the hymn player switch these rules on one at a time.' }));
      const hymn = HG.Hymns.byId('amazing-grace');
      const tune = HG.ABC.parse(hymn.abc);
      const wrap = h('div.tab-wrap');
      let ctl = null;
      const show = level => {
        const arr = HG.Arranger.arrange(tune, { level, semis: 0, octaveShift: -12 });
        // only the first line
        const firstSys = arr.systems[0];
        const sub = Object.assign({}, arr, { systems: [firstSys], events: arr.events.filter(e => firstSys.includes(e.measure)), measures: arr.measures.filter(m => firstSys.includes(m.index)) });
        clear(wrap); ctl = HG.Tab.render(sub, wrap, { showLyrics: true, showFingers: true, showBeats: true });
        HG.Player.load(sub, { tempo: 72 }); HG.Player.setLoopAll(false); HG.Player.setCountIn(false); HG.Player.setMetronome(false);
        HG.Player.onTick = t => ctl.setCursor(t == null || t < 0 ? null : t);
        HG.Player.onEvent = () => {};
        HG.Player.onEnd = () => {};
        HG.Audio.ensure(); HG.Player.play();
      };
      box.appendChild(h('div.btn-row', h('button.btn', { onClick: () => show(1) }, '▶ Level 1: melody'), h('button.btn', { onClick: () => show(2) }, '▶ Level 2: + bass'), h('button.btn.primary', { onClick: () => show(3) }, '▶ Level 3: + alternating bass and fills'), h('button.btn.small', { onClick: () => HG.Player.stop() }, '■')));
      box.appendChild(wrap);
      box.appendChild(h('p', { html: 'Fills are optional: they are printed in grey. If a fill is in the way, leave it out. The melody and the beat-one bass are the skeleton; everything else is decoration.' }));
    } },
    { id: 'rhythm', title: '8. Meter: where the thumb goes', blurb: '3/4, 4/4 and 6/8 are the three heartbeats of hymns.', render(box) {
      box.appendChild(h('p', { html: 'Beats come in groups, and the first beat of each group is the strongest. That grouping is the <b>meter</b>, written as a fraction at the start of the music. The thumb plays on the strong beats; that is how the listener feels the pulse even though you never strum.' }));
      const demo = (num, den, label, text) => {
        const play = () => {
          A().ensure();
          const mi = HG.Arranger.meterInfo({ num, den });
          const bpm = den === 8 ? 180 : 96;
          const spt = 60 / bpm / 48;
          const t0 = A().now() + 0.05;
          for (let bar = 0; bar < 2; bar++) mi.beats.forEach(b => A().click(t0 + (bar * mi.tpm + b.tick) * spt, b.weight >= 2));
        };
        return h('div.demo', h('div.btn-row', h('button.btn.primary', { onClick: play }, '▶ ' + label), h('span.small', text)));
      };
      box.appendChild(demo(4, 4, '4/4', 'Four beats: STRONG weak medium weak. Thumb on 1 and 3 (alternating bass). Joyful, Joyful; Come, Thou Fount; the Doxology.'));
      box.appendChild(demo(3, 4, '3/4', 'Three beats: STRONG weak weak. A waltz. Thumb on 1, fingers on 2 and 3. Amazing Grace; Praise to the Lord.'));
      box.appendChild(demo(6, 8, '6/8', 'Six quick beats in two groups: STRONG 2 3 medium 5 6. A rocking lullaby feel. Thumb on 1 and 4. Silent Night; What Child Is This.'));
      box.appendChild(h('p', { html: 'A <b>pickup</b> is a note (or two) before the first strong beat: "A-" in "A-mazing grace" is a pickup on beat three, and "-ma-" lands on the strong beat one with the bass. Most hymns start with a pickup, so the first measure in the tab is short.' }));
    } },
    { id: 'circle', title: '9. The circle of fifths (and why the capo works)', blurb: 'Keys arranged so that neighbours share almost all their notes.', render(box) {
      box.appendChild(h('p', { html: 'Arrange the twelve keys so that each step clockwise goes up a fifth (the most stable interval after the octave), and something lovely happens: neighbouring keys share six of their seven notes, and the chords I, IV and V of any key sit side by side on the circle. Inside the circle are the relative minor keys, which use the same notes as the major key outside them.' }));
      const wrap = h('div.circle-wrap');
      const info = h('div');
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 320 320'); svg.setAttribute('width', '100%');
      const keys = T().CIRCLE_OF_FIFTHS;
      let sel = 'G';
      const draw = () => {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        const k = T().parseKey(sel), dia = T().diatonicChords(sel);
        const rel = T().relativeKey(sel);
        keys.forEach((kk, i) => {
          const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x = 160 + Math.cos(ang) * 120, y = 160 + Math.sin(ang) * 120;
          const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 22);
          const isSel = kk === sel, isIV = T().pcOf(kk) === dia[3].rootPc, isV = T().pcOf(kk) === dia[4].rootPc;
          c.setAttribute('class', 'circle-key' + (isSel ? ' sel' : (isIV || isV) ? ' rel' : ''));
          c.addEventListener('click', () => { sel = kk; draw(); strumChord(kk); });
          svg.appendChild(c);
          const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y + 5); t.setAttribute('class', 'circle-txt'); t.textContent = fmtKey(kk); svg.appendChild(t);
          const minor = T().transposeKey(kk + 'm', -3);
          const mx = 160 + Math.cos(ang) * 72, my = 160 + Math.sin(ang) * 72;
          const t2 = document.createElementNS(NS, 'text'); t2.setAttribute('x', mx); t2.setAttribute('y', my + 4); t2.setAttribute('class', 'circle-txt minor'); t2.textContent = fmtKey(minor); svg.appendChild(t2);
        });
        const sig = HG.ABC.keySignature(sel).fifths;
        clear(info);
        info.appendChild(h('p', h('b', fmtKey(sel) + ' major: '), `${Math.abs(sig)} ${sig < 0 ? 'flat' : 'sharp'}${Math.abs(sig) === 1 ? '' : 's'}. I IV V = ${fmtChord(dia[0].symbol)} ${fmtChord(dia[3].symbol)} ${fmtChord(dia[4].symbol)} (the two highlighted neighbours). Relative minor: ${fmtKey(rel)}.`));
        info.appendChild(h('div.btn-row', h('button.btn.small', { onClick: () => [0, 3, 4, 0].forEach((d, n) => setTimeout(() => strumChord(dia[d].symbol), n * 800)) }, '▶ I IV V I in ' + fmtKey(sel))));
      };
      draw();
      wrap.appendChild(svg); box.appendChild(wrap); box.appendChild(info);
      box.appendChild(h('p', { html: 'The keys at the top (C, G, D, A, E and F) are the ones with open chords on the guitar. Hymnals prefer the flat keys on the left (F, B♭, E♭, A♭) because they suit voices and the piano. A capo lets you play the top-of-the-circle shapes while the sound lands anywhere on the circle: <a href="#/together">Play Together</a> works it out for you.' }));
    } },
    { id: 'game-interval', title: '🎮 Ear game: name that interval', blurb: 'Two notes, four choices. Hear the difference between a fifth and a third.', render(box) { earGameInterval(box); } },
    { id: 'game-major-minor', title: '🎮 Ear game: major or minor?', blurb: 'Bright or tender? Train the most useful ear skill there is.', render(box) { earGameMajorMinor(box); } },
    { id: 'game-next-chord', title: '🎮 Ear game: which chord comes next?', blurb: 'After the home chord, was that IV, V or vi?', render(box) { earGameNextChord(box); } }
  ];

  /* --------------------------------------------------------- ear games */
  function scoreboard(gameId) {
    const S = HG.Store; const g = S.game(gameId);
    let streak = 0;
    const el = h('div.score-line');
    const refresh = () => { el.textContent = `Streak ${streak} · best ${g.best} · ${g.correct} of ${g.played} lifetime`; };
    refresh();
    return { el, right() { streak++; g.played++; g.correct++; g.best = Math.max(g.best, streak); S.save(); refresh(); if (streak === 5) toast('Five in a row!'); }, wrong() { streak = 0; g.played++; S.save(); refresh(); }, done() { S.markDone('ear', 4); } };
  }
  function pick(arr, n) { const a = [...arr]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; }

  function earGameInterval(box) {
    const sb = scoreboard('game-interval');
    const SET = [12, 7, 5, 4, 3, 2, 9];
    let current = null, root = 52, answered = false, count = 0;
    const opts = h('div.quiz-opts'), feedback = h('div');
    box.appendChild(h('p', 'You will hear a low note, then a higher note, then both together. Which interval is it? Start with the easy ones (octave, fifth, thirds); the choices get wider as you go.'));
    const play = () => { if (!current) return; playSeq([root, root + current], 0.55); setTimeout(() => { A().strum([root, root + current], null, { spread: 0.01 }); }, 1200); };
    const next = () => {
      answered = false; clear(feedback);
      const pool = count < 6 ? SET.slice(0, 4) : SET;
      current = pool[Math.floor(Math.random() * pool.length)];
      root = 45 + Math.floor(Math.random() * 12);
      const choices = pick(pool.filter(x => x !== current), 3).concat([current]).sort((a, b) => a - b);
      clear(opts);
      choices.forEach(c => opts.appendChild(h('button.btn', { onClick: () => answer(c) }, T().intervalInfo(c).name)));
      play();
    };
    const answer = c => {
      if (answered) return; answered = true; count++;
      const iv = T().intervalInfo(current);
      if (c === current) { sb.right(); feedback.appendChild(h('p', h('b', { style: { color: 'var(--good)' } }, '✓ ' + iv.name + '. '), iv.feel)); }
      else { sb.wrong(); feedback.appendChild(h('p', h('b', { style: { color: 'var(--bad)' } }, `✗ It was the ${iv.name} (${iv.ratio}). `), iv.feel)); }
      feedback.appendChild(h('div.btn-row', h('button.btn.small', { onClick: play }, '▶ Hear it again'), h('button.btn.primary', { onClick: next }, 'Next →')));
      if (count % 8 === 0) sb.done();
    };
    box.appendChild(h('div.btn-row', h('button.btn.primary', { onClick: () => { A().ensure(); next(); } }, '▶ Start'), h('button.btn', { onClick: play }, '↻ Replay')));
    box.appendChild(opts); box.appendChild(feedback); box.appendChild(sb.el);
  }

  function earGameMajorMinor(box) {
    const sb = scoreboard('game-major-minor');
    let current = null, rootPc = 0, answered = false, count = 0;
    const feedback = h('div');
    box.appendChild(h('p', 'A chord is strummed. Is it major (bright, settled) or minor (tender, shaded)? Only the middle note differs by one fret.'));
    const midis = q => voicing(rootPc, q === 'major' ? [0, 4, 7] : [0, 3, 7]);
    const play = () => { if (!current) return; A().ensure(); A().strum(midis(current), null, { velocity: 0.8 }); };
    const next = () => { answered = false; clear(feedback); current = Math.random() < 0.5 ? 'major' : 'minor'; rootPc = Math.floor(Math.random() * 12); play(); };
    const answer = c => {
      if (answered) return; answered = true; count++;
      const name = T().noteName(rootPc) + (current === 'minor' ? 'm' : '');
      if (c === current) { sb.right(); feedback.appendChild(h('p', h('b', { style: { color: 'var(--good)' } }, `✓ ${current} (${fmtChord(name)}).`))); }
      else { sb.wrong(); feedback.appendChild(h('p', h('b', { style: { color: 'var(--bad)' } }, `✗ It was ${current} (${fmtChord(name)}).`))); }
      feedback.appendChild(h('div.btn-row', h('button.btn.small', { onClick: () => { A().strum(midis('major')); setTimeout(() => A().strum(midis('minor')), 1200); } }, '▶ Compare: major then minor'), h('button.btn.primary', { onClick: next }, 'Next →')));
      if (count % 8 === 0) sb.done();
    };
    box.appendChild(h('div.btn-row', h('button.btn.primary', { onClick: () => { A().ensure(); next(); } }, '▶ Start'), h('button.btn', { onClick: play }, '↻ Replay')));
    box.appendChild(h('div.quiz-opts', h('button.btn', { onClick: () => answer('major') }, 'Major 🙂'), h('button.btn', { onClick: () => answer('minor') }, 'Minor 🙁')));
    box.appendChild(feedback); box.appendChild(sb.el);
  }

  function earGameNextChord(box) {
    const sb = scoreboard('game-next-chord');
    let key = 'G', target = null, answered = false, count = 0;
    const feedback = h('div'), opts = h('div.quiz-opts');
    box.appendChild(h('p', 'You hear the home chord (I), then a second chord. Was the second chord IV (the Amen chord), V (tension, wants to go home) or vi (the sad cousin)? This is the skill that lets you play hymns by ear.'));
    const play = () => { if (!target) return; const d = T().diatonicChords(key); strumChord(d[0].symbol); setTimeout(() => strumChord(d[target].symbol), 1000); };
    const next = () => { answered = false; clear(feedback); key = FRIENDLY[Math.floor(Math.random() * 5)]; target = [3, 4, 5][Math.floor(Math.random() * 3)]; clear(opts); [3, 4, 5].forEach(i => opts.appendChild(h('button.btn', { onClick: () => answer(i) }, T().ROMAN_MAJOR[i] + ' (' + fmtChord(T().diatonicChords(key)[i].symbol) + ')'))); play(); };
    const answer = i => {
      if (answered) return; answered = true; count++;
      const d = T().diatonicChords(key);
      const text = { 3: 'IV feels like a gentle lift, the "A-men" sound.', 4: 'V feels tense; it wants to go back to I.', 5: 'vi is minor: the mood dims.' }[target];
      if (i === target) { sb.right(); feedback.appendChild(h('p', h('b', { style: { color: 'var(--good)' } }, `✓ ${T().ROMAN_MAJOR[target]} (${fmtChord(d[target].symbol)} in ${fmtKey(key)}). `), text)); }
      else { sb.wrong(); feedback.appendChild(h('p', h('b', { style: { color: 'var(--bad)' } }, `✗ It was ${T().ROMAN_MAJOR[target]} (${fmtChord(d[target].symbol)}). `), text)); }
      feedback.appendChild(h('div.btn-row', h('button.btn.small', { onClick: play }, '▶ Hear it again'), h('button.btn.primary', { onClick: next }, 'Next →')));
      if (count % 8 === 0) sb.done();
    };
    box.appendChild(h('div.btn-row', h('button.btn.primary', { onClick: () => { A().ensure(); next(); } }, '▶ Start'), h('button.btn', { onClick: play }, '↻ Replay')));
    box.appendChild(opts); box.appendChild(feedback); box.appendChild(sb.el);
  }

  /* ---------------------------------------------------------- view */
  HG.views.theory = function (view, id) {
    const topic = topics.find(t => t.id === id);
    if (!topic) {
      view.appendChild(h('h1', 'Why it sounds good'));
      view.appendChild(h('p.muted', 'Nine short, interactive pages that explain what your fingers are doing, plus three ear games. Everything here has a play button; theory you can hear is theory you remember.'));
      const list = h('div.topic-list');
      topics.forEach(t => list.appendChild(h('div.card', { onClick: () => HG.navigate('theory', t.id) }, h('h3', t.title), h('p.small.muted', t.blurb))));
      view.appendChild(list);
      return;
    }
    const idx = topics.indexOf(topic);
    view.appendChild(h('div.card-row', h('h1', topic.title), h('button.btn', { onClick: () => HG.navigate('theory') }, '← All topics')));
    const box = h('div.card');
    topic.render(box);
    view.appendChild(box);
    view.appendChild(h('div.btn-row', idx > 0 ? h('button.btn', { onClick: () => HG.navigate('theory', topics[idx - 1].id) }, '← ' + topics[idx - 1].title) : null, idx < topics.length - 1 ? h('button.btn', { onClick: () => HG.navigate('theory', topics[idx + 1].id) }, topics[idx + 1].title + ' →') : null));
  };
})();
