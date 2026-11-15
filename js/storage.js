/* =====================================================================
   storage.js — progress + settings in localStorage
   Exposes window.HG.Store
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};
  const KEY = 'evening-hymns-v1';
  const DEFAULTS = {
    settings: { volume: 0.8, metronome: true, countIn: true, showFingers: true, showLyrics: true, showBeats: true, beatWidth: 44 },
    streak: { count: 0, lastDate: null, best: 0 },
    days: {},        // 'YYYY-MM-DD': { done: ['warmup','lesson','hymn','ear'], minutes }
    lessons: {},     // id: { complete: true, bestTempo, cleanRuns }
    hymns: {},       // id: { level, key, tempo, stars: {1,2,3}, bestTempo, lastPlayed }
    games: {},       // id: { best, played, correct }
    lastVisit: null
  };
  let data = null;

  function load() {
    if (data) return data;
    try {
      const raw = localStorage.getItem(KEY);
      data = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULTS));
    } catch (e) { data = JSON.parse(JSON.stringify(DEFAULTS)); }
    for (const k in DEFAULTS) if (data[k] === undefined) data[k] = JSON.parse(JSON.stringify(DEFAULTS[k]));
    for (const k in DEFAULTS.settings) if (data.settings[k] === undefined) data.settings[k] = DEFAULTS.settings[k];
    return data;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) { /* private mode */ } }

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayDiff(a, b) { // days between 'YYYY-MM-DD' strings
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    const da = Date.UTC(pa[0], pa[1] - 1, pa[2]), db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000);
  }

  function dayRecord(date) {
    const d = load();
    const key = date || today();
    if (!d.days[key]) d.days[key] = { done: [], minutes: 0 };
    return d.days[key];
  }

  /** Mark a task done tonight; updates streak when the evening is complete */
  function markDone(task, total) {
    const rec = dayRecord();
    if (!rec.done.includes(task)) rec.done.push(task);
    if (rec.done.length >= (total || 3)) touchStreak();
    save();
    return rec;
  }
  function touchStreak() {
    const d = load();
    const t = today();
    if (d.streak.lastDate === t) return d.streak;
    if (d.streak.lastDate && dayDiff(d.streak.lastDate, t) === 1) d.streak.count += 1;
    else d.streak.count = 1;
    d.streak.lastDate = t;
    d.streak.best = Math.max(d.streak.best || 0, d.streak.count);
    save();
    return d.streak;
  }
  function currentStreak() {
    const d = load();
    if (!d.streak.lastDate) return 0;
    const gap = dayDiff(d.streak.lastDate, today());
    return gap <= 1 ? d.streak.count : 0;
  }
  function eveningsPracticed() { return Object.keys(load().days).filter(k => load().days[k].done.length > 0).length; }

  function lesson(id) { const d = load(); if (!d.lessons[id]) d.lessons[id] = { complete: false, bestTempo: 0, cleanRuns: 0 }; return d.lessons[id]; }
  function hymn(id) { const d = load(); if (!d.hymns[id]) d.hymns[id] = { level: 1, key: null, tempo: null, stars: {}, bestTempo: 0, lastPlayed: null, plays: 0 }; return d.hymns[id]; }
  function game(id) { const d = load(); if (!d.games[id]) d.games[id] = { best: 0, played: 0, correct: 0 }; return d.games[id]; }
  function settings() { return load().settings; }
  function reset() { data = JSON.parse(JSON.stringify(DEFAULTS)); save(); }

  window.HG.Store = { load, save, today, dayRecord, markDone, touchStreak, currentStreak, eveningsPracticed, lesson, hymn, game, settings, reset, dayDiff };
})();
