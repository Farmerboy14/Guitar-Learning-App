/* =====================================================================
   tab.js — SVG tablature renderer with playhead + highlights
   Exposes window.HG.Tab
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const NS = 'http://www.w3.org/2000/svg';
  const TPQ = 48;

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, cls, anchor) {
    const t = el('text', { x, y, class: cls || '', 'text-anchor': anchor || 'middle' }, parent);
    t.textContent = str;
    return t;
  }

  /**
   * Render an arrangement into container. Returns a controller:
   *  { setCursor(tick), highlightEvent(index, cls), clearHighlights(), rows, measureBoxes }
   * opts: { beatWidth (px per quarter), showLyrics, showFingers, showBeats, loop:{start,end} (measure indexes), onMeasureClick }
   */
  function render(arr, container, opts) {
    const o = Object.assign({ beatWidth: 44, showLyrics: true, showFingers: true, showBeats: true, showChords: true, showDurations: true }, opts || {});
    container.innerHTML = '';
    const tickPx = o.beatWidth / TPQ;
    const strSp = 13;               // string spacing
    const staffH = strSp * 5;
    const topPad = (o.showChords ? 22 : 6) + (o.showBeats ? 14 : 0);
    const fingerH = o.showFingers ? 30 : 0;
    const lyricH = o.showLyrics ? 20 : 0;
    const rowH = topPad + staffH + 10 + fingerH + lyricH + 10;
    const leftPad = 30, rightPad = 14;
    const availW = Math.max(240, container.clientWidth || 600);
    const measuresByIndex = new Map(arr.measures.map(m => [m.index, m]));
    const eventsByMeasure = new Map();
    for (const e of arr.events) { if (!eventsByMeasure.has(e.measure)) eventsByMeasure.set(e.measure, []); eventsByMeasure.get(e.measure).push(e); }

    // split systems into rows that fit
    const rows = [];
    for (const sys of arr.systems) {
      let cur = [], curW = 0;
      for (const mi of sys) {
        const m = measuresByIndex.get(mi);
        const w = Math.max(m.ticks, 1) * tickPx + 8;
        if (cur.length && leftPad + curW + w + rightPad > availW) { rows.push(cur); cur = []; curW = 0; }
        cur.push(mi); curW += w;
      }
      if (cur.length) rows.push(cur);
    }

    const rowInfos = [];
    const measureBoxes = new Map();
    const noteEls = new Map(); // eventIndex -> [elements]
    const eventIndex = new Map(arr.events.map((e, i) => [e, i]));

    rows.forEach((row, ri) => {
      const totalTicks = row.reduce((s, mi) => s + measuresByIndex.get(mi).ticks, 0);
      const width = leftPad + totalTicks * tickPx + row.length * 8 + rightPad;
      const svg = el('svg', { class: 'tab-row', width: '100%', viewBox: `0 0 ${Math.max(width, availW)} ${rowH}`, preserveAspectRatio: 'xMinYMid meet', height: rowH }, container);
      svg.style.display = 'block';
      const staffTop = topPad;
      // strings
      for (let s = 0; s < 6; s++) {
        const y = staffTop + s * strSp;
        el('line', { x1: leftPad, y1: y, x2: width - rightPad, y2: y, class: 'tab-string' }, svg);
      }
      // string names at left
      ['e', 'B', 'G', 'D', 'A', 'E'].forEach((n, i) => text(svg, leftPad - 12, staffTop + i * strSp + 4, n, 'tab-strname'));
      let x = leftPad;
      const info = { svg, row: ri, measures: [], x0: x, staffTop, width };
      row.forEach((mi, k) => {
        const m = measuresByIndex.get(mi);
        const mw = m.ticks * tickPx + 8;
        const mx0 = x;
        // bar line at start
        el('line', { x1: mx0, y1: staffTop, x2: mx0, y2: staffTop + staffH, class: 'tab-bar' }, svg);
        const g = el('g', { class: 'tab-measure', 'data-measure': mi }, svg);
        const bg = el('rect', { x: mx0, y: staffTop - 4, width: mw, height: staffH + 8, class: 'tab-measure-bg', fill: 'transparent' }, g);
        if (o.onMeasureClick) { bg.style.cursor = 'pointer'; bg.addEventListener('click', () => o.onMeasureClick(mi)); }
        // beat numbers
        if (o.showBeats) {
          for (const b of arr.meterInfo.beats) {
            const t = b.tick - m.offset;
            if (t < 0 || t >= m.ticks) continue;
            if (arr.meterInfo.compound && b.weight < 2) continue;
            text(svg, mx0 + 4 + t * tickPx, staffTop - 6, b.label, 'tab-beat');
          }
        }
        // measure number
        if (k === 0 || mi % 4 === 0) text(svg, mx0 + 2, staffTop + staffH + 9, String(mi + 1), 'tab-mnum', 'start');
        const evs = eventsByMeasure.get(mi) || [];
        for (const e of evs) {
          const ex = mx0 + 4 + (e.tick - m.startTick) * tickPx;
          const idx = eventIndex.get(e);
          const els = [];
          if (o.showChords && e.chord) text(svg, ex, staffTop - (o.showBeats ? 20 : 6), e.chord, 'tab-chord');
          for (const n of e.notes) {
            const y = staffTop + (6 - n.string) * strSp;
            const wbg = el('rect', { x: ex - 7, y: y - 6.5, width: 14, height: 13, rx: 3, class: 'tab-notebg' }, svg);
            const tx = text(svg, ex, y + 4.2, String(n.fret), 'tab-fret tab-' + n.role + (n.outOfRange ? ' tab-oor' : ''));
            els.push(wbg, tx);
            if (o.showDurations && n.role === 'melody' && n.dur > TPQ) {
              el('line', { x1: ex + 8, y1: y, x2: ex + Math.min(n.dur, m.ticks - (e.tick - m.startTick)) * tickPx - 3, y2: y, class: 'tab-hold' }, svg);
            }
          }
          if (o.showFingers) {
            const fy = staffTop + staffH + 22;
            const treble = e.notes.filter(n => n.finger !== 'p').map(n => n.finger);
            const thumb = e.notes.some(n => n.finger === 'p');
            if (treble.length) text(svg, ex, fy, treble.join(''), 'tab-finger');
            if (thumb) text(svg, ex, fy + 12, 'p', 'tab-finger tab-thumb');
          }
          if (o.showLyrics && e.lyric) text(svg, ex, staffTop + staffH + 10 + fingerH + 14, e.lyric, 'tab-lyric');
          noteEls.set(idx, els);
        }
        info.measures.push({ index: mi, x0: mx0, x1: mx0 + mw, startTick: m.startTick, ticks: m.ticks, tickPx });
        measureBoxes.set(mi, { row: ri, x0: mx0, x1: mx0 + mw, g });
        x += mw;
      });
      el('line', { x1: x, y1: staffTop, x2: x, y2: staffTop + staffH, class: 'tab-bar' }, svg);
      // cursor
      info.cursor = el('rect', { x: leftPad, y: staffTop - 8, width: 3, height: staffH + 16, rx: 1.5, class: 'tab-cursor' }, svg);
      info.cursor.style.display = 'none';
      rowInfos.push(info);
    });

    let lastRow = -1;
    function setCursor(tick) {
      if (tick == null) { rowInfos.forEach(r => r.cursor.style.display = 'none'); lastRow = -1; return; }
      for (const r of rowInfos) {
        for (const mm of r.measures) {
          if (tick >= mm.startTick && tick < mm.startTick + mm.ticks) {
            const x = mm.x0 + 4 + (tick - mm.startTick) * mm.tickPx - 1.5;
            r.cursor.setAttribute('x', x);
            r.cursor.style.display = '';
            if (lastRow !== r.row) {
              rowInfos.forEach(rr => { if (rr !== r) rr.cursor.style.display = 'none'; });
              lastRow = r.row;
              if (o.autoScroll !== false) r.svg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
            return;
          }
        }
      }
    }
    function highlightEvent(idx, cls) {
      const els = noteEls.get(idx); if (!els) return;
      for (const e of els) e.classList.add(cls || 'tab-hit');
    }
    function unhighlightEvent(idx, cls) {
      const els = noteEls.get(idx); if (!els) return;
      for (const e of els) e.classList.remove(cls || 'tab-hit');
    }
    function clearHighlights() {
      for (const els of noteEls.values()) for (const e of els) e.classList.remove('tab-hit', 'tab-target', 'tab-wrong', 'tab-good');
    }
    function setLoop(start, end) {
      for (const [mi, box] of measureBoxes) {
        const inLoop = start != null && end != null && mi >= start && mi <= end;
        box.g.classList.toggle('tab-loop', inLoop);
      }
    }
    return { setCursor, highlightEvent, unhighlightEvent, clearHighlights, setLoop, rows: rowInfos };
  }

  /** Small chord diagram SVG */
  function chordDiagram(shape, opts) {
    const o = Object.assign({ width: 64 }, opts || {});
    const w = o.width, h = w * 1.25;
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: 'chord-diagram' });
    const left = w * 0.16, right = w * 0.84, top = h * 0.25, bottom = h * 0.92;
    const sw = (right - left) / 5, fh = (bottom - top) / 4;
    const frets = shape.frets;
    const minFret = Math.min(...frets.filter(f => f > 0));
    const base = (minFret > 3) ? minFret : 1;
    text(svg, w / 2, h * 0.14, shape.symbol || '', 'cd-name');
    for (let i = 0; i < 6; i++) el('line', { x1: left + i * sw, y1: top, x2: left + i * sw, y2: bottom, class: 'cd-line' }, svg);
    for (let i = 0; i <= 4; i++) el('line', { x1: left, y1: top + i * fh, x2: right, y2: top + i * fh, class: 'cd-line' + (i === 0 && base === 1 ? ' cd-nut' : '') }, svg);
    if (base > 1) text(svg, left - w * 0.1, top + fh * 0.7, String(base), 'cd-base', 'end');
    frets.forEach((f, i) => {
      const x = left + i * sw;
      if (f < 0) text(svg, x, top - h * 0.03, '×', 'cd-mute');
      else if (f === 0) el('circle', { cx: x, cy: top - h * 0.05, r: w * 0.04, class: 'cd-open' }, svg);
      else {
        const y = top + (f - base + 0.5) * fh;
        el('circle', { cx: x, cy: y, r: w * 0.065, class: 'cd-dot' }, svg);
        if (shape.fingers && shape.fingers[i]) text(svg, x, y + w * 0.035, String(shape.fingers[i]), 'cd-fing');
      }
    });
    if (shape.barre) {
      const y = top + (shape.barre - base + 0.5) * fh;
      const first = frets.findIndex(f => f === shape.barre);
      el('rect', { x: left + first * sw - w * 0.05, y: y - w * 0.05, width: (5 - first) * sw + w * 0.1, height: w * 0.1, rx: w * 0.05, class: 'cd-barre' }, svg);
    }
    return svg;
  }

  /** Simple fretboard (first 5 frets) with highlighted positions [{string,fret,label,cls}] */
  function fretboardSvg(marks, opts) {
    const o = Object.assign({ frets: 5, width: 420 }, opts || {});
    const w = o.width, h = 120;
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', class: 'fb-svg' });
    const left = 34, right = w - 10, top = 16, bottom = h - 12;
    const fw = (right - left) / o.frets, ss = (bottom - top) / 5;
    for (let s = 0; s < 6; s++) {
      const y = top + s * ss;
      el('line', { x1: left, y1: y, x2: right, y2: y, class: 'fb-string', 'stroke-width': 1 + (s) * 0.35 }, svg);
      text(svg, left - 10, y + 4, ['e', 'B', 'G', 'D', 'A', 'E'][s], 'fb-strname');
    }
    for (let f = 0; f <= o.frets; f++) el('line', { x1: left + f * fw, y1: top, x2: left + f * fw, y2: bottom, class: f === 0 ? 'fb-nut' : 'fb-fret' }, svg);
    for (let f = 1; f <= o.frets; f++) text(svg, left + (f - 0.5) * fw, h - 1, String(f), 'fb-fnum');
    [3, 5, 7, 9].forEach(f => { if (f <= o.frets) el('circle', { cx: left + (f - 0.5) * fw, cy: (top + bottom) / 2, r: 4, class: 'fb-inlay' }, svg); });
    (marks || []).forEach(mk => {
      const y = top + (6 - mk.string) * ss;
      const x = mk.fret === 0 ? left - 22 : left + (mk.fret - 0.5) * fw;
      el('circle', { cx: x, cy: y, r: 9, class: 'fb-mark ' + (mk.cls || '') }, svg);
      if (mk.label) text(svg, x, y + 3.5, mk.label, 'fb-label');
    });
    return svg;
  }

  window.HG.Tab = { render, chordDiagram, fretboardSvg };
})();
