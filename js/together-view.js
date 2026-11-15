/* together-view.js — Play Together: capo, harmonica, other instruments, ukulele, singers */
(function () {
  'use strict';
  const HG = window.HG;
  const { h, clear, fmtKey, fmtChord } = HG.UI;
  HG.views = HG.views || {};
  const C = () => HG.Capo, T = () => HG.Theory;
  const MAJ = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const MIN = ['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'];

  function keySelect(value, onChange, minor) {
    const sel = h('select');
    for (const k of (minor ? MIN : MAJ)) sel.appendChild(h('option', { value: k, selected: k === value }, fmtKey(k)));
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }
  function capoTableEl(targetKey) {
    const rows = C().capoTable(targetKey);
    const box = h('div');
    box.appendChild(h('p.small.muted', `To sound in ${fmtKey(targetKey)}, choose a set of open shapes and put the capo where the table says. The chords you finger are on the left; what the room hears is on the right.`));
    rows.forEach((r, i) => {
      box.appendChild(h('div.capo-row', h('div', h('div.capo-fret', r.capo === 0 ? 'no capo' : 'capo ' + r.capo), h('div', { class: r.capo <= 5 ? 'capo-easy' : 'capo-high' }, r.comfort)),
        h('div', h('div', h('b', fmtKey(r.shapeKey) + ' shapes'), h('span.muted.small', ' — finger these: '), h('span.capo-chords', r.shapes.map(fmtChord).join('  '))), h('div.small.muted', 'sounds as ' + r.sounding.map(fmtChord).join('  ') + '  (' + r.romans.join(' ') + ')'))));
    });
    return box;
  }

  HG.views.together = function (view) {
    const Th = T();
    view.appendChild(h('h1', 'Play together'));
    view.appendChild(h('p.muted', 'Everyone must be in the same key: the same "home" note. Guitars fix that with a capo. Each fret is one half step; a capo on fret 3 turns your open C shapes into E♭ sounds. Here are the questions people actually ask.'));

    // 1. match a key
    const c1 = h('div.card', h('h2', '1. "The song is in key ___. Where does my capo go?"'));
    let k1 = 'G';
    const out1 = h('div');
    const minorCb = h('input', { type: 'checkbox' });
    let sel1 = keySelect(k1, v => { k1 = v; clear(out1); out1.appendChild(capoTableEl(k1)); });
    const selWrap = h('span', sel1);
    minorCb.addEventListener('change', () => { k1 = minorCb.checked ? 'Am' : 'C'; const ns = keySelect(k1, v => { k1 = v; clear(out1); out1.appendChild(capoTableEl(k1)); }, minorCb.checked); clear(selWrap); selWrap.appendChild(ns); clear(out1); out1.appendChild(capoTableEl(k1)); });
    c1.appendChild(h('div.btn-row', h('span', 'Key: '), selWrap, h('label.toggle', minorCb, ' minor key')));
    out1.appendChild(capoTableEl(k1));
    c1.appendChild(out1);
    view.appendChild(c1);

    // 2. harmonica
    const c2 = h('div.card', h('h2', '2. "I have a ___ harmonica. What do I play?"'));
    let harp = 'G';
    const out2 = h('div');
    const renderHarp = () => {
      clear(out2);
      const pos = C().harmonicaPositions(harp);
      out2.appendChild(h('p', `A 10-hole diatonic harmonica in ${fmtKey(harp)} is built from the ${fmtKey(harp)} major scale. It can play in a few keys ("positions"), but two matter for hymns and folk songs:`));
      const tbl = h('table.simple', h('tr', h('th', 'Position'), h('th', 'Guitar plays in'), h('th', 'Sound')));
      [pos.first, pos.second, pos.third].forEach((p, i) => tbl.appendChild(h('tr', { class: i === 0 ? 'hl' : '' }, h('td', p.name), h('td', h('b', fmtKey(p.key))), h('td.small', p.feel))));
      out2.appendChild(tbl);
      out2.appendChild(h('h3', `So for a ${fmtKey(harp)} harmonica playing hymns (1st position), the guitar plays in ${fmtKey(pos.first.key)}:`));
      out2.appendChild(capoTableEl(pos.first.key));
      out2.appendChild(h('h3', `For the bluesy 2nd position, the guitar plays in ${fmtKey(pos.second.key)}:`));
      out2.appendChild(capoTableEl(pos.second.key));
      out2.appendChild(h('p.small.muted', 'Going the other way: if the hymn is in key X, a 1st-position harmonica is in X; a 2nd-position harmonica is a fourth below X (song in D → G harp; song in G → C harp; song in A → D harp).'));
    };
    c2.appendChild(h('div.btn-row', h('span', 'Harmonica key: '), keySelect(harp, v => { harp = v; renderHarp(); })));
    renderHarp();
    c2.appendChild(out2);
    view.appendChild(c2);

    // 3. transposing instruments
    const c3 = h('div.card', h('h2', '3. "My friend plays trumpet / clarinet / sax. Their music says one key and mine says another."'));
    c3.appendChild(h('p', 'Some instruments are "transposing": the note they read is not the note that comes out. A trumpet reading C sounds B♭. So everyone must agree on the concert key (what the room actually hears), then each player reads their own version.'));
    let inst = 'Bb', written = 'D', concert = 'C';
    const out3a = h('div'), out3b = h('div');
    const instSel = h('select');
    C().INSTRUMENTS.forEach(i => instSel.appendChild(h('option', { value: i.id, selected: i.id === inst }, i.name)));
    const wSel = keySelect(written, v => { written = v; render3(); });
    const cSel = keySelect(concert, v => { concert = v; render3(); });
    instSel.addEventListener('change', () => { inst = instSel.value; render3(); });
    function render3() {
      const conc = C().writtenToConcert(written, inst);
      const wr = C().concertToWritten(concert, inst);
      clear(out3a); clear(out3b);
      out3a.appendChild(h('p', `If their music says ${fmtKey(written)}, the room hears ${fmtKey(conc)}. The guitar plays in ${fmtKey(conc)}:`));
      out3a.appendChild(capoTableEl(conc));
      out3b.appendChild(h('p', `If the guitar is in ${fmtKey(concert)}, they should read music in ${fmtKey(wr)} (or transpose on the spot by ${C().INSTRUMENTS.find(i => i.id === inst).offset} half steps up).`));
    }
    c3.appendChild(h('div.btn-row', h('span', 'Instrument: '), instSel));
    c3.appendChild(h('div.btn-row', h('span', 'Their music is written in: '), wSel));
    c3.appendChild(out3a);
    c3.appendChild(h('div.btn-row', h('span', 'Or: the guitar plays in '), cSel));
    c3.appendChild(out3b);
    render3();
    view.appendChild(c3);

    // 4. ukulele
    const c4 = h('div.card', h('h2', '4. "How do I play with a ukulele?"'));
    c4.appendChild(h('p', 'A ukulele is tuned like the top four guitar strings with a capo on fret 5 (G C E A). So a ukulele player and a guitarist can play in the same key with no capo at all; only the chord shapes have different names. A shape that is "D" on the guitar’s top four strings is called "G" on the uke.'));
    const tbl4 = h('table.simple', h('tr', h('th', 'Guitar shape (top 4 strings)'), h('th', 'Same shape on ukulele is called')));
    ['C', 'D', 'E', 'G', 'A', 'Am', 'Em', 'Dm', 'D7', 'G7', 'A7', 'E7'].forEach(g => tbl4.appendChild(h('tr', h('td', fmtChord(g)), h('td', h('b', fmtChord(C().ukeChordForGuitarShape(g)))))));
    c4.appendChild(tbl4);
    c4.appendChild(h('p.small.muted', 'Practical rule: just agree on the key and let each person use their own chord names. If the uke player says "I only know C, F, G and Am", play in C.'));
    view.appendChild(c4);

    // 5. singers
    const c5 = h('div.card', h('h2', '5. "The hymnal key is too high (or low) for our voices."'));
    let hk = 'Eb', shift = -2;
    const out5 = h('div');
    const render5 = () => {
      clear(out5);
      const nk = C().shiftKey(hk, shift);
      out5.appendChild(h('p', `${fmtKey(hk)} moved ${shift > 0 ? 'up' : 'down'} ${Math.abs(shift)} half step${Math.abs(shift) === 1 ? '' : 's'} is ${fmtKey(nk)}. Ways to play it:`));
      out5.appendChild(capoTableEl(nk));
    };
    const shiftSel = h('select');
    for (let s = -6; s <= 6; s++) shiftSel.appendChild(h('option', { value: s, selected: s === shift }, s === 0 ? 'same' : (s > 0 ? '+' : '') + s + ' half steps'));
    shiftSel.addEventListener('change', () => { shift = +shiftSel.value; render5(); });
    c5.appendChild(h('div.btn-row', h('span', 'Hymnal key: '), keySelect(hk, v => { hk = v; render5(); }), h('span', ' move it '), shiftSel));
    render5();
    c5.appendChild(out5);
    view.appendChild(c5);

    // 6. hymnal flat keys
    const c6 = h('div.card', h('h2', '6. Quick reference: hymnal keys with flats'));
    c6.appendChild(h('p.small.muted', 'Hymnals love E♭, A♭, B♭ and F because they suit voices and pianos. Guitars love the open-string keys. The capo bridges the two.'));
    const tbl6 = h('table.simple', h('tr', h('th', 'Hymnal key'), h('th', 'Easiest options')));
    ['F', 'Bb', 'Eb', 'Ab', 'Db'].forEach(k => {
      const ways = C().bestWays(k, 3).filter(w => w.capo <= 7);
      tbl6.appendChild(h('tr', h('td', h('b', fmtKey(k))), h('td', ways.map(w => `${fmtKey(w.shapeKey)} shapes, capo ${w.capo}`).join(' · '))));
    });
    c6.appendChild(tbl6);
    view.appendChild(c6);
  };
})();
