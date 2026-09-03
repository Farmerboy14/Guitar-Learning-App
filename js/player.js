/* =====================================================================
   player.js — transport: schedules an arrangement with Web Audio,
   drives the tab cursor, supports loop, count-in, metronome, tempo.
   Exposes window.HG.Player (a singleton)
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const TPQ = 48;
  const A = () => window.HG.Audio;

  const state = {
    arr: null, tempo: 72, playing: false, loop: null, metronome: true, countIn: true,
    mutedRoles: new Set(), anchorTick: 0, anchorTime: 0, nextIdx: 0, timer: 0, raf: 0,
    onTick: null, onEvent: null, onEnd: null, onBeat: null, countInTicks: 0, nextBeatTick: 0, volumeByRole: { melody: 1, bass: 0.9, fill: 0.55 },
    scheduledUntilTick: -Infinity
  };
  const LOOKAHEAD = 0.15, INTERVAL = 25;

  function secPerTick() { return 60 / state.tempo / TPQ; }
  function tickAt(time) { return state.anchorTick + (time - state.anchorTime) / secPerTick(); }
  function timeAt(tick) { return state.anchorTime + (tick - state.anchorTick) * secPerTick(); }

  function load(arr, opts) {
    stop();
    state.arr = arr;
    const o = opts || {};
    if (o.tempo) state.tempo = o.tempo;
    state.loop = o.loop || null;
    state.anchorTick = loopStartTick();
  }
  function loopStartTick() { if (state.loop && state.arr) { const m = state.arr.measures[state.loop.start]; return m ? m.startTick : 0; } return 0; }
  function loopEndTick() { if (state.loop && state.arr) { const m = state.arr.measures[state.loop.end]; return m ? m.startTick + m.ticks : state.arr.totalTicks; } return state.arr ? state.arr.totalTicks : 0; }

  function setLoop(startMeasure, endMeasure) {
    state.loop = (startMeasure == null) ? null : { start: startMeasure, end: endMeasure == null ? startMeasure : endMeasure };
    if (!state.playing) state.anchorTick = loopStartTick();
  }
  function setTempo(bpm) {
    const c = A().ensure();
    const now = c.currentTime;
    if (state.playing) { state.anchorTick = tickAt(now); state.anchorTime = now; }
    state.tempo = Math.max(20, Math.min(240, bpm));
  }
  function setMetronome(on) { state.metronome = !!on; }
  function setCountIn(on) { state.countIn = !!on; }
  function muteRole(role, muted) { if (muted) state.mutedRoles.add(role); else state.mutedRoles.delete(role); }

  function play(fromTick) {
    if (!state.arr) return;
    const c = A().ensure();
    if (state.playing) return;
    const resuming = fromTick == null && state.pausedAt != null;
    const start = resuming ? state.pausedAt : (fromTick == null ? loopStartTick() : fromTick);
    state.pausedAt = null;
    const cin = (state.countIn && !resuming) ? state.arr.ticksPerMeasure : 0;
    state.countInTicks = cin;
    state.anchorTick = start - cin;
    state.anchorTime = c.currentTime + 0.08;
    state.playing = true;
    // find first event at or after start
    state.nextIdx = state.arr.events.findIndex(e => e.tick >= start);
    if (state.nextIdx < 0) state.nextIdx = state.arr.events.length;
    state.nextBeatTick = alignBeat(start - cin);
    state.timer = setInterval(schedule, INTERVAL);
    schedule();
    tickLoop();
  }

  // beats for the metronome: measure-relative beat ticks
  function alignBeat(tick) {
    const arr = state.arr;
    const beats = arr.meterInfo.countBeats;
    // find measure containing tick (count-in uses virtual measure before start)
    if (tick < 0) { return Math.floor(tick / arr.ticksPerMeasure) * arr.ticksPerMeasure; }
    const m = measureAt(tick);
    if (!m) return tick;
    const rel = tick - m.startTick + m.offset;
    for (const b of beats) if (b >= rel) return m.startTick - m.offset + b;
    return m.startTick - m.offset + arr.ticksPerMeasure;
  }
  function measureAt(tick) { let cur = null; for (const m of state.arr.measures) { if (m.startTick <= tick) cur = m; else break; } return cur; }

  function schedule() {
    const c = A().context; if (!c || !state.playing) return;
    const now = c.currentTime;
    const horizon = tickAt(now + LOOKAHEAD);
    const arr = state.arr;
    const endTick = loopEndTick();
    // metronome / count-in clicks
    while (state.nextBeatTick <= horizon) {
      const bt = state.nextBeatTick;
      if (bt >= endTick) break;
      const startTick = loopStartTick();
      const inCountIn = bt < startTick;
      let accent = false;
      if (inCountIn) accent = (((bt - startTick) % arr.ticksPerMeasure) + arr.ticksPerMeasure) % arr.ticksPerMeasure === 0;
      else { const m = measureAt(bt); accent = m ? (bt - m.startTick + m.offset) === 0 : false; }
      if (state.metronome || inCountIn) A().click(timeAt(bt), accent);
      if (state.onBeat) { const t = timeAt(bt); setTimeout(() => state.onBeat(bt, accent), Math.max(0, (t - c.currentTime) * 1000)); }
      if (inCountIn) {
        const beats = arr.meterInfo.countBeats;
        const base = Math.floor((bt - startTick) / arr.ticksPerMeasure) * arr.ticksPerMeasure + startTick;
        const rel = bt - base;
        let nxt = null; for (const b of beats) if (b > rel) { nxt = base + b; break; }
        state.nextBeatTick = nxt == null ? base + arr.ticksPerMeasure : nxt;
        if (state.nextBeatTick >= startTick) state.nextBeatTick = alignBeat(startTick);
      } else state.nextBeatTick = alignBeat(bt + 1);
    }
    // note events
    while (state.nextIdx < arr.events.length) {
      const e = arr.events[state.nextIdx];
      if (e.tick >= endTick) break;
      if (e.tick > horizon) break;
      const t = timeAt(e.tick);
      for (const n of e.notes) {
        if (state.mutedRoles.has(n.role)) continue;
        const vol = (state.volumeByRole[n.role] || 1) * (n.velocity || 1);
        A().pluck(n.midi, t, { velocity: vol, tone: n.role === 'bass' ? 'warm' : 'warm' });
      }
      if (state.onEvent) { const idx = state.nextIdx; setTimeout(() => { if (state.playing) state.onEvent(idx, e); }, Math.max(0, (t - now) * 1000)); }
      state.nextIdx++;
    }
    // loop / end
    if (horizon >= endTick && (state.nextIdx >= arr.events.length || arr.events[state.nextIdx].tick >= endTick)) {
      const endTime = timeAt(endTick);
      if (state.loop || state.loopAll) {
        // re-anchor at loop start when the end is reached
        const startTick = loopStartTick();
        state.anchorTime = endTime; state.anchorTick = startTick;
        state.nextIdx = arr.events.findIndex(e => e.tick >= startTick); if (state.nextIdx < 0) state.nextIdx = arr.events.length;
        state.nextBeatTick = alignBeat(startTick);
      } else {
        // stop after the last note rings
        const delay = Math.max(0, (endTime - now) * 1000) + 600;
        clearInterval(state.timer); state.timer = 0;
        state.endTimer = setTimeout(() => { if (state.playing) { stop(); if (state.onEnd) state.onEnd(); } }, delay);
      }
    }
  }

  function tickLoop() {
    if (!state.playing) return;
    const c = A().context;
    const t = tickAt(c.currentTime);
    if (state.onTick) state.onTick(t);
    state.raf = requestAnimationFrame(tickLoop);
  }

  function pause() {
    if (!state.playing) return;
    const c = A().context;
    state.anchorTick = Math.max(loopStartTick(), tickAt(c.currentTime));
    state.pausedAt = state.anchorTick;
    state.playing = false;
    clearInterval(state.timer); state.timer = 0;
    if (state.endTimer) clearTimeout(state.endTimer);
    cancelAnimationFrame(state.raf);
    A().stopAll();
  }
  function stop() {
    state.playing = false;
    clearInterval(state.timer); state.timer = 0;
    if (state.endTimer) clearTimeout(state.endTimer);
    cancelAnimationFrame(state.raf);
    if (A().context) A().stopAll();
    state.anchorTick = loopStartTick();
    state.pausedAt = null;
    if (state.onTick) state.onTick(null);
  }
  function currentTick() { if (!state.playing || !A().context) return state.anchorTick; return tickAt(A().context.currentTime); }
  function setLoopAll(on) { state.loopAll = !!on; }

  window.HG.Player = {
    load, play, pause, stop, setLoop, setLoopAll, setTempo, setMetronome, setCountIn, muteRole, currentTick,
    get playing() { return state.playing; }, get tempo() { return state.tempo; }, get loop() { return state.loop; },
    set onTick(f) { state.onTick = f; }, set onEvent(f) { state.onEvent = f; }, set onEnd(f) { state.onEnd = f; }, set onBeat(f) { state.onBeat = f; },
    get metronome() { return state.metronome; }, get countIn() { return state.countIn; }, get mutedRoles() { return state.mutedRoles; }
  };
})();
