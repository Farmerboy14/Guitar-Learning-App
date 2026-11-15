/* =====================================================================
   arranger.js — turns a melody + chord symbols into a fingerstyle guitar
   arrangement in first position, at three levels:
     1 = melody only, 2 = thumb bass + melody, 3 = full (alternating bass + fills)
   Exposes window.HG.Arranger
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const TPQ = 48;
  const T = () => window.HG.Theory;
  const FB = () => window.HG.Fretboard;

  /** Beat structure for a meter, in ticks */
  function meterInfo(meter) {
    const num = meter.num, den = meter.den;
    const tpm = Math.round(num * (192 / den));
    if (den === 8 && num % 3 === 0) {
      const groups = num / 3, beats = [];
      for (let g = 0; g < groups; g++) {
        beats.push({ tick: g * 72, weight: g === 0 ? 3 : 2, label: String(g * 3 + 1) });
        beats.push({ tick: g * 72 + 24, weight: 1, label: String(g * 3 + 2) });
        beats.push({ tick: g * 72 + 48, weight: 1, label: String(g * 3 + 3) });
      }
      return { tpm, compound: true, beatTicks: 24, mainBeatTicks: 72, beats,
        bassBeats: beats.filter(b => b.weight >= 2).map(b => b.tick),
        fillBeats: beats.filter(b => b.weight === 1).map(b => b.tick), countBeats: beats.filter(b => b.weight >= 2).map(b => b.tick) };
    }
    const unit = den === 2 ? 48 : Math.round(192 / den); // count 2/2 in quarters
    const n = Math.round(tpm / unit);
    const beats = [];
    for (let i = 0; i < n; i++) {
      let w = 1;
      if (i === 0) w = 3; else if (n === 4 && i === 2) w = 2; else if (n === 2 && i === 1) w = 2;
      beats.push({ tick: i * unit, weight: w, label: String(i + 1) });
    }
    let bassBeats, fillBeats;
    if (n === 4) { bassBeats = [0, 2 * unit]; fillBeats = [unit, 3 * unit]; }
    else if (n === 3) { bassBeats = [0, 2 * unit]; fillBeats = [unit]; }
    else if (n === 2) { bassBeats = [0]; fillBeats = [unit]; }
    else { bassBeats = [0]; fillBeats = beats.slice(1).map(b => b.tick); }
    return { tpm, compound: false, beatTicks: unit, mainBeatTicks: unit, beats, bassBeats, fillBeats, countBeats: beats.map(b => b.tick) };
  }

  /** Viterbi assignment of melody notes to (string, fret) */
  function assignMelody(midis, opts) {
    const F = FB();
    const maxFret = opts.maxFret == null ? 5 : opts.maxFret;
    const cands = midis.map(m => {
      let c = F.positionsFor(m, maxFret);
      if (!c.length) c = F.positionsFor(m, 12);
      if (!c.length) c = [{ string: 1, fret: Math.max(0, m - 64), midi: m, outOfRange: true }];
      return c;
    });
    const stateCost = p => p.fret * 1.0 + (p.string === 4 ? 0.9 : p.string === 5 ? 3.5 : p.string === 6 ? 7 : 0) + (p.fret === 0 ? -0.5 : 0) + (p.fret > 4 ? (p.fret - 4) * 2.5 : 0);
    const trans = (a, b) => Math.abs(a.fret - b.fret) * 0.35 + Math.abs(a.string - b.string) * 0.12;
    let prev = cands[0].map(p => ({ cost: stateCost(p), back: -1 }));
    const backs = [prev];
    for (let i = 1; i < cands.length; i++) {
      const cur = cands[i].map(p => {
        let best = Infinity, bi = 0;
        cands[i - 1].forEach((q, qi) => { const c = prev[qi].cost + trans(q, p); if (c < best) { best = c; bi = qi; } });
        return { cost: best + stateCost(p), back: bi };
      });
      backs.push(cur); prev = cur;
    }
    const out = new Array(midis.length);
    if (!midis.length) return out;
    let bi = 0; prev.forEach((s, i) => { if (s.cost < prev[bi].cost) bi = i; });
    for (let i = midis.length - 1; i >= 0; i--) { out[i] = cands[i][bi]; bi = backs[i][bi].back; }
    return out;
  }

  /** Candidate bass positions for a pitch class on strings 6..4 */
  function bassCandidates(pc, maxFret) {
    const F = FB();
    const out = [];
    for (const s of [6, 5, 4]) {
      for (let f = 0; f <= maxFret; f++) {
        const m = F.midiAt(s, f);
        if (T().mod(m, 12) === pc) out.push({ string: s, fret: f, midi: m });
      }
    }
    return out;
  }

  function chooseBass(chord, prefer, ctx) {
    const c = chord;
    const pcs = prefer === 'fifth' ? [c.fifthPc, c.bassPc] : [c.bassPc, c.fifthPc];
    for (const pc of pcs) {
      let cands = bassCandidates(pc, ctx.maxBassFret);
      cands = cands.filter(p => p.string !== ctx.melodyString && (ctx.melodyMidi == null || p.midi < ctx.melodyMidi));
      if (ctx.avoidStrings) cands = cands.filter(p => !ctx.avoidStrings.has(p.string));
      if (!cands.length) continue;
      cands.sort((a, b) => (a.fret - b.fret) || (a.midi - b.midi));
      // prefer fret<=3 lowest fret, then the lowest pitch among fret-equal
      return cands[0];
    }
    return null;
  }

  function chooseFill(chord, ctx) {
    const F = FB();
    const tones = chord.tones;
    const lo = ctx.bassString ? ctx.bassString - 1 : 5;
    const hi = ctx.melodyString ? ctx.melodyString + 1 : 3;
    const cands = [];
    for (let s = hi; s <= Math.min(lo, 4); s++) {
      if (s < 1 || s > 6) continue;
      if (ctx.avoidStrings && ctx.avoidStrings.has(s)) continue;
      for (let f = 0; f <= ctx.maxFret; f++) {
        const m = F.midiAt(s, f);
        if (!tones.includes(T().mod(m, 12))) continue;
        if (ctx.melodyMidi != null && m >= ctx.melodyMidi) continue;
        if (ctx.bassMidi != null && m <= ctx.bassMidi) continue;
        cands.push({ string: s, fret: f, midi: m, score: f + (s === hi ? 0 : (s - hi) * 0.8) + (f === 0 ? -0.5 : 0) });
      }
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a.score - b.score);
    return cands[0];
  }

  /**
   * Arrange a parsed tune.
   * opts: { semis (transpose), level 1|2|3, octaveShift (-12 default: hymnal soprano -> guitar), maxFret }
   */
  function arrange(tune, opts) {
    const o = Object.assign({ semis: 0, level: 3, octaveShift: -12, maxFret: 5, maxBassFret: 4 }, opts || {});
    const Th = T(), F = FB();
    const mi = meterInfo(tune.meter);
    const keyName = Th.transposeKey(tune.key.replace(/\s.*$/, ''), o.semis);
    const keyObj = Th.parseKey(keyName) || { isMinor: false, root: 'C' };
    const useFlats = Th.keyUsesFlats(keyObj.root, keyObj.isMinor);

    // 1) Melody notes (attacks), sounding pitch on guitar
    const melodyNotes = [];
    for (const m of tune.measures) for (const n of m.notes) {
      if (n.rest || n.tied) continue;
      melodyNotes.push({ measure: m.index, tick: m.startTick + n.tick, tickInMeasure: n.tick + m.offset, dur: n.dur, midi: n.midi + o.semis + o.octaveShift, lyric: n.lyric, src: n });
    }
    // extend durations across ties
    for (const m of tune.measures) {
      let last = null;
      for (const n of m.notes) {
        if (n.tied && last) last.dur += n.dur;
        else if (!n.rest) { last = melodyNotes.find(x => x.src === n); }
      }
    }
    const positions = assignMelody(melodyNotes.map(n => n.midi), { maxFret: o.maxFret });
    melodyNotes.forEach((n, i) => { n.string = positions[i].string; n.fret = positions[i].fret; n.outOfRange = !!positions[i].outOfRange; });

    // 2) Chord timeline
    const chordEvents = [];
    for (const m of tune.measures) for (const c of m.chords) {
      const sym = Th.transposeChord(c.symbol, o.semis, useFlats);
      chordEvents.push({ tick: m.startTick + c.tick, symbol: sym, parsed: Th.parseChord(sym) });
    }
    chordEvents.sort((a, b) => a.tick - b.tick);
    const chordAt = tick => { let cur = null; for (const c of chordEvents) { if (c.tick <= tick) cur = c; else break; } return cur; };

    // 3) Build event map keyed by absolute tick
    const events = new Map();
    const ev = tick => { let e = events.get(tick); if (!e) { e = { tick, notes: [], chord: null, lyric: null }; events.set(tick, e); } return e; };
    for (const n of melodyNotes) {
      const e = ev(n.tick);
      e.notes.push({ string: n.string, fret: n.fret, midi: n.midi, role: 'melody', dur: n.dur, velocity: 1.0, outOfRange: n.outOfRange });
      if (n.lyric) e.lyric = n.lyric;
    }
    for (const c of chordEvents) ev(c.tick).chord = c.symbol;

    // melody state helpers: which melody note is sounding at a tick
    const melodyAt = tick => { let cur = null; for (const n of melodyNotes) { if (n.tick <= tick) cur = n; else break; } return cur; };
    const melodyAttackAt = tick => melodyNotes.find(n => n.tick === tick) || null;

    let missingBass = 0;
    if (o.level >= 2) {
      for (const m of tune.measures) {
        const measureStart = m.startTick;
        if (m.offset > 0) continue; // pickup measure: melody only, like most arrangements
        // positions of bass beats within this measure, taking pickup offset into account
        const beatsHere = (o.level >= 3 ? mi.bassBeats : [mi.bassBeats[0]]).map(b => b - m.offset).filter(b => b >= 0 && b < m.ticks);
        // also add bass at chord changes inside the measure
        const changeTicks = m.chords.map(c => c.tick).filter(t => !beatsHere.includes(t));
        const allBass = beatsHere.map(t => ({ t, prefer: 'root' })).concat(changeTicks.map(t => ({ t, prefer: 'root' })));
        allBass.sort((a, b) => a.t - b.t);
        let lastRootAt = -1;
        allBass.forEach((b, idx) => {
          const abs = measureStart + b.t;
          const chord = chordAt(abs);
          if (!chord || !chord.parsed) return;
          const chordChangedHere = chordEvents.some(c => c.tick === abs);
          // alternate: root on first bass beat of the measure or chord change, fifth on secondary beats (level 3)
          let prefer = 'root';
          if (o.level >= 3 && !chordChangedHere && b.t !== beatsHere[0] && lastRootAt >= 0 && !(chord.parsed.bass)) prefer = 'fifth';
          if (b.t === 0 || chordChangedHere) lastRootAt = abs;
          const mel = melodyAt(abs);
          const attack = melodyAttackAt(abs);
          const ctx = { maxBassFret: o.maxBassFret, melodyString: attack ? attack.string : (mel ? mel.string : null), melodyMidi: mel ? mel.midi : null };
          let pos = chooseBass(chord.parsed, prefer, ctx);
          if (pos && attack && attack.midi === pos.midi) pos = null; // same note as melody: melody already covers it
          if (!pos) { missingBass++; return; }
          const e = ev(abs);
          e.notes.push({ string: pos.string, fret: pos.fret, midi: pos.midi, role: 'bass', dur: mi.mainBeatTicks, velocity: 0.85 });
        });
      }
    }

    if (o.level >= 3) {
      const bassList = [...events.values()].filter(e => e.notes.some(n => n.role === 'bass')).sort((a, b) => a.tick - b.tick);
      const bassBefore = tick => { let cur = null; for (const e of bassList) { if (e.tick <= tick) cur = e.notes.find(n => n.role === 'bass'); else break; } return cur; };
      for (const m of tune.measures) {
        if (m.offset > 0) continue;
        const fills = mi.fillBeats.map(b => b - m.offset).filter(b => b >= 0 && b < m.ticks);
        for (const t of fills) {
          const abs = m.startTick + t;
          const e = events.get(abs);
          if (e && e.notes.length) continue; // something already plucked here
          const chord = chordAt(abs);
          if (!chord || !chord.parsed) continue;
          const mel = melodyAt(abs);
          if (!mel) continue;
          const bassNote = bassBefore(abs);
          const pos = chooseFill(chord.parsed, { maxFret: o.maxFret, melodyString: mel.string, melodyMidi: mel.midi, bassString: bassNote ? bassNote.string : 6, bassMidi: bassNote ? bassNote.midi : null });
          if (!pos) continue;
          ev(abs).notes.push({ string: pos.string, fret: pos.fret, midi: pos.midi, role: 'fill', dur: mi.beatTicks, velocity: 0.5 });
        }
      }
    }

    // 4) Finalize: sort, assign fingers, compute measure/tick info
    const list = [...events.values()].sort((a, b) => a.tick - b.tick);
    const measureOf = tick => { let cur = tune.measures[0]; for (const m of tune.measures) { if (m.startTick <= tick) cur = m; else break; } return cur; };
    for (const e of list) {
      e.notes.sort((a, b) => b.string - a.string); // low to high
      const hasBass = e.notes.some(n => n.role === 'bass');
      for (const n of e.notes) {
        n.finger = F.fingerFor(n.string);
        if (hasBass && n.role !== 'bass' && n.string === 4) n.finger = 'i';
      }
      // if two treble notes share a finger, spread them (i m a)
      const treble = e.notes.filter(n => n.role !== 'bass' && n.string <= 4);
      if (treble.length > 1) {
        const order = ['i', 'm', 'a'];
        treble.forEach((n, i) => { n.finger = order[Math.min(i, 2)]; });
      }
      const m = measureOf(e.tick);
      e.measure = m.index;
      e.tickInMeasure = e.tick - m.startTick + m.offset;
      e.isMelody = e.notes.some(n => n.role === 'melody');
    }

    const chordsUsed = [];
    for (const c of chordEvents) if (!chordsUsed.includes(c.symbol)) chordsUsed.push(c.symbol);
    const melodyMidis = melodyNotes.map(n => n.midi);
    const maxFretUsed = list.reduce((mx, e) => Math.max(mx, ...e.notes.map(n => n.fret)), 0);

    return {
      key: keyName, useFlats, level: o.level, semis: o.semis, octaveShift: o.octaveShift,
      meter: tune.meter, meterInfo: mi, ticksPerMeasure: tune.ticksPerMeasure, pickupTicks: tune.pickupTicks,
      measures: tune.measures.map(m => ({ index: m.index, startTick: m.startTick, ticks: m.ticks, offset: m.offset })),
      systems: tune.systems.map(s => s.measures.map(m => m.index)),
      totalTicks: tune.totalTicks, tempo: tune.tempo, events: list, chordsUsed, melodyMidis, missingBass, maxFretUsed,
      melodyRange: melodyMidis.length ? [Math.min(...melodyMidis), Math.max(...melodyMidis)] : null
    };
  }

  /** Score how comfortable an arrangement is (lower = better) */
  function scoreArrangement(arr) {
    const F = FB();
    let score = 0;
    for (const e of arr.events) for (const n of e.notes) {
      if (n.role === 'melody') {
        if (n.string >= 5) score += 3;
        else if (n.string === 4) score += 0.35;
        if (n.fret > 4) score += (n.fret - 4) * 2;
        if (n.fret === 0) score -= 0.15;
        if (n.outOfRange) score += 30;
      }
    }
    score += arr.missingBass * 1.5;
    for (const c of arr.chordsUsed) { if (!F.isOpenChord(c)) score += F.shapeFor(c) ? 1.5 : 3; }
    return score;
  }

  /** Evaluate all 12 keys (and octave placements) for a tune */
  function evaluateKeys(tune, opts) {
    const Th = T();
    const out = [];
    for (let semis = -6; semis <= 5; semis++) {
      let best = null;
      for (const oct of [-12, 0]) {
        const arr = arrange(tune, Object.assign({}, opts, { semis, level: 3, octaveShift: oct }));
        const s = scoreArrangement(arr);
        if (!best || s < best.score) best = { semis, octaveShift: oct, score: s, key: arr.key, chords: arr.chordsUsed, maxFret: arr.maxFretUsed };
      }
      out.push(best);
    }
    out.sort((a, b) => a.score - b.score || Math.abs(a.semis) - Math.abs(b.semis));
    return out;
  }

  window.HG.Arranger = { arrange, meterInfo, assignMelody, evaluateKeys, scoreArrangement, TPQ };
})();
