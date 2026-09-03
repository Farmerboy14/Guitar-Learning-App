/* =====================================================================
   app.js — router + Tonight, Hymns, Lessons views
   ===================================================================== */
(function () {
  'use strict';
  const HG = window.HG;
  const { h, clear, fmtKey, fmtChord, toast } = HG.UI;
  const views = HG.views = HG.views || {};
  let teardown = null;

  function navigate(name, param) { location.hash = '#/' + name + (param != null ? '/' + encodeURIComponent(param) : ''); }
  HG.navigate = navigate;
  function parseHash() {
    const m = /^#\/([a-z-]+)(?:\/(.+))?/.exec(location.hash || '');
    return m ? { name: m[1], param: m[2] ? decodeURIComponent(m[2]) : null } : { name: 'tonight', param: null };
  }
  function route() {
    const { name, param } = parseHash();
    if (teardown) { try { teardown(); } catch (e) { /* ignore */ } teardown = null; }
    try { HG.Player.stop(); } catch (e) { /* no audio yet */ }
    HG.Pitch.stop();
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === name));
    const view = document.getElementById('view');
    clear(view); window.scrollTo(0, 0);
    const fn = views[name] || views.tonight;
    const r = fn(view, param);
    if (typeof r === 'function') teardown = r;
  }

  /* ---------------------------------------------------------------- helpers */
  const LEVEL_NAMES = { 1: 'Melody', 2: 'Bass + melody', 3: 'Full fingerstyle' };
  const LEVEL_DESC = {
    1: 'Just the tune. Learn where the notes live; use the finger letters.',
    2: 'Thumb plays the chord’s bass note on beat one; fingers play the tune.',
    3: 'Alternating bass and gentle fills under the melody. The complete arrangement.'
  };
  function stars(obj) {
    const s = h('span.stars');
    for (let l = 1; l <= 3; l++) s.appendChild(h('span', { class: obj && obj.stars && obj.stars[l] ? '' : 'off', title: LEVEL_NAMES[l] }, '★'));
    return s;
  }
  function dateStr() { return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); }
  function greeting() { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'; }
  function tabLegend() {
    return h('div.tab-legend', h('span', h('b.legend-melody', '3'), ' melody (fingers i m a)'), h('span', h('b.legend-bass', '3'), ' bass (thumb p)'), h('span', h('b.legend-fill', '3'), ' fill (optional, soft)'), h('span', 'Click a measure to loop it, click another to extend.'));
  }

  /* ------------------------------------------------------------- TONIGHT */
  function buildPlan() {
    const S = HG.Store, L = HG.Lessons.list;
    const lessonState = id => S.lesson(id);
    let current = L.find(l => !lessonState(l.id).complete) || L[L.length - 1];
    const idx = L.indexOf(current);
    const warm = idx > 0 ? L[idx - 1] : L[0];
    const warmEx = warm.exercise || L[0].exercise;
    const d = S.load();
    let hymnId = (current.hymn && current.hymn.id) || Object.keys(d.hymns).sort((a, b) => (d.hymns[b].lastPlayed || 0) - (d.hymns[a].lastPlayed || 0))[0] || 'amazing-grace';
    const hymn = HG.Hymns.byId(hymnId) || HG.Hymns.list[0];
    const hs = S.hymn(hymn.id);
    const level = (current.hymn && current.hymn.level) || hs.level || 1;
    const games = ['game-interval', 'game-major-minor', 'game-next-chord'];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const game = games[dayOfYear % games.length];
    const gameNames = { 'game-interval': 'Name that interval', 'game-major-minor': 'Major or minor?', 'game-next-chord': 'Which chord comes next?' };
    return {
      minutes: 4 + current.minutes + 8 + 3,
      items: [
        { id: 'warmup', icon: '🔥', title: 'Warm-up: ' + warmEx.title, desc: `4 minutes · from ${warm.title}. Start slow, keep it even.`, go: () => navigate('lessons', warm.id) },
        { id: 'lesson', icon: '📖', title: 'Lesson: ' + current.title, desc: `${current.minutes} minutes · ${current.goal}`, go: () => navigate('lessons', current.id) },
        { id: 'hymn', icon: '🎵', title: 'Hymn: ' + hymn.title, desc: `8 minutes · Level ${level} (${LEVEL_NAMES[level]}). Loop one line at a time.`, go: () => { S.hymn(hymn.id).level = level; S.save(); navigate('hymns', hymn.id); } },
        { id: 'ear', icon: '👂', title: 'Ear game: ' + gameNames[game], desc: '3 minutes · learn to hear what makes music sound good.', go: () => navigate('theory', game) }
      ]
    };
  }

  views.tonight = function (view) {
    const S = HG.Store;
    const rec = S.dayRecord();
    const plan = buildPlan();
    const streak = S.currentStreak();
    const allDone = plan.items.every(it => rec.done.includes(it.id));
    view.appendChild(h('div.card.hero',
      h('div', h('div.kicker', greeting() + ' · ' + dateStr()), h('h1', 'Tonight’s practice'), h('p.muted', `About ${plan.minutes} minutes. Four small things, every evening.`)),
      h('div', { style: { textAlign: 'center', minWidth: '120px' } }, h('div.streak', streak + ' 🔥'), h('div.muted.small', streak === 1 ? 'evening in a row' : 'evenings in a row'), h('div.muted.small', S.eveningsPracticed() + ' evenings total'))
    ));
    plan.items.forEach(it => {
      const done = rec.done.includes(it.id);
      const card = h('div.card.tonight-item' + (done ? '.done' : ''),
        h('div.check' + (done ? '.done' : ''), done ? '✓' : ''),
        h('div', h('h3', it.icon + ' ' + it.title), h('div.desc', it.desc)),
        h('div.btn-row', h('button.btn.primary', { onClick: it.go }, 'Open'), h('button.btn.small', { onClick: () => { S.markDone(it.id, 4); route(); } }, done ? 'Done ✓' : 'Mark done'))
      );
      view.appendChild(card);
    });
    if (allDone) view.appendChild(h('div.card.accent', h('h2', '🌙 Well done. Good night.'), h('p', 'Your streak is safe. Tomorrow evening the plan will move you one step further.')));
    else view.appendChild(h('p.muted.small', 'Tip: play for ten quiet minutes rather than skipping. Small, daily, and relaxed is how hands learn.'));

    // hymn progress
    const prog = h('div.card', h('h2', 'Your hymns'));
    const list = h('div.grid');
    HG.Hymns.list.forEach(hy => {
      const st = S.hymn(hy.id);
      list.appendChild(h('div.card', { style: { margin: 0, cursor: 'pointer' }, onClick: () => navigate('hymns', hy.id) }, h('div', h('b', hy.title)), h('div.small.muted', hy.tune), h('div', stars(st), st.bestTempo ? h('span.small.muted', ` · best ${st.bestTempo} BPM`) : null)));
    });
    prog.appendChild(list);
    view.appendChild(prog);

    // lessons progress
    const L = HG.Lessons.list, doneCount = L.filter(l => S.lesson(l.id).complete).length;
    view.appendChild(h('div.card', h('div.card-row', h('div', h('h2', 'Course progress'), h('div.muted.small', `${doneCount} of ${L.length} lessons complete`)), h('button.btn', { onClick: () => navigate('lessons') }, 'All lessons')), h('div.progress', { style: { marginTop: '8px' } }, h('div', { style: { width: (100 * doneCount / L.length) + '%' } }))));

    // settings
    const set = S.settings();
    const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(set.volume * 100) });
    vol.addEventListener('input', () => { set.volume = vol.value / 100; HG.Audio.setVolume(set.volume); S.save(); });
    view.appendChild(h('div.card', h('h2', 'Settings'), h('div.btn-row', h('label', 'Volume '), vol),
      h('div.btn-row', h('label.toggle', h('input', { type: 'checkbox', checked: set.showLyrics, onChange: e => { set.showLyrics = e.target.checked; S.save(); } }), ' Show lyrics under the tab'), h('label.toggle', h('input', { type: 'checkbox', checked: set.showFingers, onChange: e => { set.showFingers = e.target.checked; S.save(); } }), ' Show finger letters (p i m a)'), h('label.toggle', h('input', { type: 'checkbox', checked: set.showBeats, onChange: e => { set.showBeats = e.target.checked; S.save(); } }), ' Show beat numbers')),
      h('div.btn-row', h('button.btn.small', { onClick: () => { if (confirm('Reset all progress and streaks?')) { S.reset(); route(); } } }, 'Reset progress'))));
  };

  /* --------------------------------------------------------------- HYMNS */
  views.hymns = function (view, id) {
    if (id) return hymnDetail(view, id);
    const S = HG.Store;
    view.appendChild(h('h1', 'Hymns'));
    view.appendChild(h('p.muted', 'Every hymn can be played three ways: melody only, bass + melody, and the full arrangement. Pick a key that suits your guitar and your voice; the app re-writes the tab for you.'));
    const grid = h('div.grid');
    [...HG.Hymns.list].sort((a, b) => a.level - b.level).forEach(hy => {
      const st = S.hymn(hy.id);
      grid.appendChild(h('div.card', { style: { margin: 0 } },
        h('h3', hy.title), h('div.small.muted', hy.tune + ' · ' + fmtKey(hy.defaultKey) + ' · ' + hy.abc.match(/M:(\S+)/)[1]),
        h('div', hy.tags.map(t => h('span.tag', t))),
        h('p.small', hy.about),
        h('div.card-row', h('div', h('span.muted.small', 'Difficulty '), '●'.repeat(hy.level) + '○'.repeat(3 - hy.level), ' ', stars(st)), h('button.btn.primary', { onClick: () => navigate('hymns', hy.id) }, 'Open'))
      ));
    });
    view.appendChild(grid);
    view.appendChild(h('div.card', h('h3', 'Add your own hymn'), h('p.small.muted', 'Hymns are written in ABC notation in js/hymns.js. The README shows the format; any public-domain melody with chord symbols becomes a three-level fingerstyle arrangement automatically.')));
  };

  function hymnDetail(view, id) {
    const hymn = HG.Hymns.byId(id);
    if (!hymn) { view.appendChild(h('p', 'Unknown hymn.')); return; }
    const S = HG.Store, set = S.settings(), P = HG.Player;
    const st = S.hymn(id);
    const tune = HG.ABC.parse(hymn.abc);
    const ranked = HG.Arranger.evaluateKeys(tune);
    const state = { level: st.level || hymn.level && 1 || 1, key: st.key || hymn.defaultKey, tempo: st.tempo || tune.tempo, loop: null, pendingLoop: false, listen: false };
    if (!ranked.find(r => r.key === state.key)) state.key = ranked[0].key;
    let arr = null, tabCtl = null, listenCtl = null;

    view.appendChild(h('div.card-row', h('div', h('div.kicker', hymn.tune), h('h1', hymn.title), h('div.small.muted', hymn.credit)), h('button.btn', { onClick: () => navigate('hymns') }, '← All hymns')));
    view.appendChild(h('p', hymn.about));

    // level + key controls
    const seg = h('div.seg');
    const levelDesc = h('div.small.muted');
    const updateLevelBtns = () => { seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', +b.dataset.level === state.level)); levelDesc.textContent = LEVEL_DESC[state.level]; };
    [1, 2, 3].forEach(l => seg.appendChild(h('button', { 'data-level': l, onClick: () => { state.level = l; st.level = l; S.save(); build(); } }, `${l} · ${LEVEL_NAMES[l]}`)));
    const keySel = HG.UI.keyPicker({ ranked, value: state.key, refKey: hymn.hymnalKey, onChange: k => { state.key = k; st.key = k; S.save(); build(); } });
    const capoNote = h('div.small.muted');
    view.appendChild(h('div.card', h('div.btn-row', h('span.muted', 'Level: '), seg), levelDesc, h('div.btn-row', { style: { marginTop: '8px' } }, h('span.muted', 'Key: '), keySel), capoNote));

    // transport
    const tr = HG.UI.transport({ tempo: state.tempo, showRoles: true, onTempo: t => { state.tempo = t; st.tempo = t; S.save(); }, onLoopToggle: () => {}, onStop: () => tabCtl && tabCtl.setCursor(null) });
    view.appendChild(tr.el);
    const status = h('div.small.muted', { style: { minHeight: '1.4em' } });
    const loopInfo = h('div.btn-row');
    view.appendChild(loopInfo);
    view.appendChild(status);

    // listen mode
    const listenBox = h('div');
    const listenToggle = h('button.btn', '🎤 Listen mode: the app waits for you to play each melody note');
    listenToggle.addEventListener('click', () => { state.listen = !state.listen; listenToggle.classList.toggle('active', state.listen); renderListen(); });
    view.appendChild(h('div.btn-row', listenToggle));
    view.appendChild(listenBox);

    // tab
    const tabWrap = h('div.tab-wrap');
    view.appendChild(tabLegend());
    view.appendChild(tabWrap);
    const chordBox = h('div');
    view.appendChild(chordBox);

    // progress
    const progCard = h('div.card', h('h3', 'Your progress on this hymn'));
    const starRow = h('div.btn-row');
    const refreshStars = () => { clear(starRow); [1, 2, 3].forEach(l => starRow.appendChild(h('button.btn.small' + (st.stars[l] ? '.active' : ''), { onClick: () => { st.stars[l] = !st.stars[l]; S.save(); refreshStars(); } }, (st.stars[l] ? '★ ' : '☆ ') + 'Level ' + l))); starRow.appendChild(h('span.small.muted', st.bestTempo ? ` best ${st.bestTempo} BPM` : '')); };
    refreshStars();
    const cleanBtn = h('button.btn.good', { onClick: () => { st.bestTempo = Math.max(st.bestTempo || 0, tr.tempo); st.plays = (st.plays || 0) + 1; st.lastPlayed = Date.now(); S.markDone('hymn', 4); S.save(); refreshStars(); toast('Logged: clean at ' + tr.tempo + ' BPM'); } }, '✓ Played it cleanly at this tempo');
    progCard.appendChild(h('p.small.muted', 'Tick the levels you can play from start to finish. Log clean runs to track your tempo.'));
    progCard.appendChild(starRow); progCard.appendChild(h('div.btn-row', cleanBtn));
    view.appendChild(progCard);
    view.appendChild(h('div.card', h('h3', 'Words'), hymn.verses.map((v, i) => h('p.small', h('b.muted', (i + 1) + '. '), v))));

    function renderListen() {
      clear(listenBox);
      if (listenCtl) { listenCtl.stop(); listenCtl = null; }
      if (!state.listen || !arr) return;
      const targets = [];
      arr.events.forEach((e, idx) => { const mel = e.notes.filter(n => n.role === 'melody'); if (mel.length) { const top = mel[mel.length - 1]; targets.push({ idx, midi: top.midi, string: top.string, fret: top.fret }); } });
      listenCtl = HG.UI.listenController({ targets, keyStep: true, highlight: (i, c) => tabCtl.highlightEvent(i, c), unhighlight: (i, c) => tabCtl.unhighlightEvent(i, c), clear: () => tabCtl.clearHighlights(), onFinish: (hits, misses) => { toast(`Note Hunt done: ${hits} right, ${misses} slips`); if (misses <= 2 && hits > 8) { st.stars[state.level] = true; S.save(); refreshStars(); } } });
      listenBox.appendChild(h('div.card', h('p.small.muted', 'Note Hunt: the highlighted note is next. Play it on your guitar and the app moves on when it hears it (the octave does not matter). No microphone? Press Space to step through.'), listenCtl.el));
    }

    function loopLabel() {
      clear(loopInfo);
      if (state.loop) loopInfo.appendChild(h('span.small', `Looping measures ${state.loop.start + 1}–${state.loop.end + 1}${state.pendingLoop ? ' (click another measure to extend)' : ''} `));
      else loopInfo.appendChild(h('span.small.muted', 'Loop a line: '));
      if (arr) arr.systems.forEach((sys, i) => loopInfo.appendChild(h('button.btn.small', { onClick: () => setLoop(sys[0], sys[sys.length - 1]) }, 'Line ' + (i + 1))));
      if (state.loop) loopInfo.appendChild(h('button.btn.small', { onClick: () => setLoop(null) }, 'Clear loop'));
    }
    function setLoop(start, end) {
      state.loop = start == null ? null : { start, end: end == null ? start : end };
      state.pendingLoop = false;
      P.setLoop(start, end);
      if (tabCtl) tabCtl.setLoop(start, end);
      loopLabel();
    }
    function onMeasureClick(mi) {
      if (state.loop && state.pendingLoop && mi >= state.loop.start) { setLoop(state.loop.start, mi); return; }
      setLoop(mi, mi); state.pendingLoop = true; loopLabel();
    }

    function build() {
      const ki = ranked.find(r => r.key === state.key) || ranked[0];
      arr = HG.Arranger.arrange(tune, { semis: ki.semis, octaveShift: ki.octaveShift, level: state.level });
      updateLevelBtns();
      const T = HG.Theory;
      const capo = T.mod(T.parseKey(hymn.hymnalKey).rootPc - T.parseKey(state.key).rootPc, 12);
      capoNote.textContent = capo === 0 ? `Same key as most hymnals (${fmtKey(hymn.hymnalKey)}): you can play straight from the book.` : `Most hymnals print this in ${fmtKey(hymn.hymnalKey)}. To match a piano or the hymnal, put a capo on fret ${capo} and play these ${fmtKey(state.key)} shapes${capo > 7 ? ' (high; see Play Together for lower options)' : ''}.`;
      clear(tabWrap);
      tabCtl = HG.Tab.render(arr, tabWrap, { showLyrics: set.showLyrics, showFingers: set.showFingers, showBeats: set.showBeats, beatWidth: set.beatWidth, onMeasureClick });
      if (state.loop) { if (state.loop.end >= arr.measures.length) state.loop = null; tabCtl.setLoop(state.loop && state.loop.start, state.loop && state.loop.end); }
      P.load(arr, { tempo: state.tempo, loop: state.loop });
      P.onTick = t => { if (t == null) { tabCtl.setCursor(null); status.textContent = ''; return; } if (t < 0) { tabCtl.setCursor(null); status.textContent = 'Count-in…'; } else { status.textContent = ''; tabCtl.setCursor(t); } };
      P.onEvent = (idx) => { tabCtl.highlightEvent(idx, 'tab-hit'); setTimeout(() => tabCtl.unhighlightEvent(idx, 'tab-hit'), 160); };
      HG.Audio.warm(arr.events.flatMap(e => e.notes.map(n => n.midi)));
      clear(chordBox);
      chordBox.appendChild(h('div.card', h('h3', 'Chords in this key (' + fmtKey(arr.key) + ')'), h('p.small.muted', 'Tap a diagram to hear it. The tab uses single notes from these shapes: you rarely need to hold the whole chord.'), HG.UI.chordStrip(arr.chordsUsed)));
      loopLabel();
      renderListen();
      tr.setPlaying(false);
    }
    build();
    const keyHandler = e => { if (e.code === 'Space' && !state.listen && !/input|select|textarea|button/i.test(e.target.tagName)) { e.preventDefault(); tr.playBtn.click(); } };
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('keydown', keyHandler); if (listenCtl) listenCtl.stop(); };
  }

  /* ------------------------------------------------------------- LESSONS */
  views.lessons = function (view, id) {
    if (id) return lessonDetail(view, id);
    const S = HG.Store;
    view.appendChild(h('h1', 'Fingerpicking course'));
    view.appendChild(h('p.muted', 'Twelve short lessons, in order. Each one is built around a pattern you can loop with the metronome. When the pattern is clean three times in a row, the tempo goes up by five.'));
    let unit = null, box = null;
    HG.Lessons.list.forEach((l, i) => {
      if (l.unit !== unit) { unit = l.unit; box = h('div.card', h('div.kicker', unit)); view.appendChild(box); }
      const st = S.lesson(l.id);
      box.appendChild(h('div.tonight-item', { style: { padding: '8px 0', borderTop: '1px solid var(--line)' } }, h('div.check' + (st.complete ? '.done' : ''), st.complete ? '✓' : String(i + 1)), h('div', h('b', l.title), h('div.desc', l.goal + ' · ' + l.minutes + ' min' + (st.bestTempo ? ` · best ${st.bestTempo} BPM` : ''))), h('button.btn', { onClick: () => navigate('lessons', l.id) }, 'Open')));
    });
  };

  function lessonDetail(view, id) {
    const L = HG.Lessons.list, S = HG.Store;
    const lesson = HG.Lessons.byId(id);
    if (!lesson) { view.appendChild(h('p', 'Unknown lesson.')); return; }
    const idx = L.indexOf(lesson);
    const st = S.lesson(id);
    const set = S.settings();
    const cleanups = [];
    view.appendChild(h('div.card-row', h('div', h('div.kicker', lesson.unit + ' · Lesson ' + (idx + 1) + ' · ' + lesson.minutes + ' min'), h('h1', lesson.title), h('p', h('b', 'Goal: '), lesson.goal)), h('button.btn', { onClick: () => navigate('lessons') }, '← All lessons')));
    const body = h('div.card');
    lesson.body.forEach(p => body.appendChild(h('p', { html: p })));
    if (lesson.tips) body.appendChild(h('div', h('h3', 'Tips'), h('ul', lesson.tips.map(t => h('li', t)))));
    view.appendChild(body);

    const exercises = [lesson.exercise, lesson.exercise2].filter(Boolean);
    let activeEx = 0; // only one exercise loaded in the player at a time
    exercises.forEach((ex, exIdx) => {
      const card = h('div.card', h('h2', '🎯 ' + ex.title), h('p', ex.instructions));
      st.exercises = st.exercises || {};
      const exSt = st.exercises[exIdx] || (st.exercises[exIdx] = { tempo: ex.tempoStart, runs: 0 });
      const arr = HG.Lessons.patternArrangement(ex.pattern, { repeats: ex.pattern.chords && ex.pattern.chords.length ? 1 : 2 });
      const tabWrap = h('div.tab-wrap');
      const loadBtn = h('button.btn.small', 'Use this exercise in the player');
      let tabCtl = null, tr = null;
      const load = () => {
        activeEx = exIdx;
        HG.Player.load(arr, { tempo: exSt.tempo });
        HG.Player.setLoopAll(true);
        HG.Player.onTick = t => { if (tabCtl) tabCtl.setCursor(t == null || t < 0 ? null : t); };
        HG.Player.onEvent = (i) => { if (tabCtl) { tabCtl.highlightEvent(i, 'tab-hit'); setTimeout(() => tabCtl.unhighlightEvent(i, 'tab-hit'), 150); } };
        HG.Audio.warm(arr.events.flatMap(e => e.notes.map(n => n.midi)));
      };
      tr = HG.UI.transport({ tempo: exSt.tempo, minTempo: 30, maxTempo: 160, onTempo: t => { exSt.tempo = t; S.save(); }, onStop: () => tabCtl && tabCtl.setCursor(null) });
      tr.el.querySelector('.play-btn').addEventListener('click', () => { if (activeEx !== exIdx) { HG.Player.stop(); load(); HG.Player.setTempo(tr.tempo); HG.Player.play(); tr.setPlaying(true); } }, true);
      tr.el.querySelector('.btn[title]').classList.add('active'); // loop on by default
      const ladder = HG.UI.tempoLadder({ start: ex.tempoStart, goal: ex.tempoGoal, current: exSt.tempo, cleanRuns: exSt.runs, onTempo: t => { exSt.tempo = t; tr.setTempo(t); st.bestTempo = Math.max(st.bestTempo || 0, t); S.save(); }, onRuns: (r, t) => { exSt.runs = r; S.save(); } });
      card.appendChild(tr.el);
      card.appendChild(ladder.el);
      card.appendChild(tabWrap);
      tabCtl = HG.Tab.render(arr, tabWrap, { showLyrics: false, showFingers: true, showBeats: true, beatWidth: set.beatWidth });
      if (arr.chordsUsed.length) card.appendChild(HG.UI.chordStrip(arr.chordsUsed));
      view.appendChild(card);
      if (exIdx === 0) load();
    });

    if (lesson.game && lesson.game.type === 'strings') view.appendChild(stringCheckGame(cleanups));
    if (lesson.hymn) {
      const hy = HG.Hymns.byId(lesson.hymn.id);
      view.appendChild(h('div.card.accent', h('h2', '🎵 Now play: ' + hy.title), h('p', lesson.hymn.note), h('button.btn.primary', { onClick: () => { const hs = S.hymn(hy.id); hs.level = lesson.hymn.level; S.save(); navigate('hymns', hy.id); } }, 'Open ' + hy.title + ' at Level ' + lesson.hymn.level)));
    }
    if (lesson.tool) view.appendChild(h('div.card.accent', h('h2', '🧭 Try the tool'), h('p', lesson.tool.note), h('button.btn.primary', { onClick: () => navigate(lesson.tool.tab) }, 'Open Play Together')));

    const doneBtn = h('button.btn' + (st.complete ? '.active' : '.primary'), { onClick: () => { st.complete = !st.complete; S.save(); if (st.complete) { S.markDone('lesson', 4); toast('Lesson complete!'); } route(); } }, st.complete ? '✓ Completed (tap to undo)' : 'Mark lesson complete');
    const nav = h('div.btn-row', idx > 0 ? h('button.btn', { onClick: () => navigate('lessons', L[idx - 1].id) }, '← ' + L[idx - 1].title) : null, doneBtn, idx < L.length - 1 ? h('button.btn', { onClick: () => navigate('lessons', L[idx + 1].id) }, L[idx + 1].title + ' →') : null);
    view.appendChild(h('div.card', nav));
    return () => cleanups.forEach(f => f());
  }

  /** Microphone game: pluck the string the app names */
  function stringCheckGame(cleanups) {
    const F = HG.Fretboard, T = HG.Theory, A = HG.Audio, Pitch = HG.Pitch;
    const names = { 6: 'low E (6)', 5: 'A (5)', 4: 'D (4)', 3: 'G (3)', 2: 'B (2)', 1: 'high e (1)' };
    let target = 0, score = 0, tries = 0, active = false, lastMidi = null;
    const ask = h('div.big');
    const status = h('div.listen-status');
    const scoreEl = h('div.score-line');
    const next = () => { let n; do { n = 1 + Math.floor(Math.random() * 6); } while (n === target); target = n; ask.textContent = `Pluck string ${names[target]} with ${F.fingerFor(target)}`; lastMidi = null; };
    const btn = h('button.btn.primary', '🎤 Start String Check');
    btn.addEventListener('click', async () => {
      if (active) { active = false; Pitch.stop(); btn.textContent = '🎤 Start String Check'; return; }
      try {
        A.ensure();
        await Pitch.start(r => {
          if (!active) return;
          if (!r) { status.textContent = 'Listening…'; return; }
          status.textContent = 'Hearing ' + r.name;
          if (!r.stable || r.midi === lastMidi) return;
          lastMidi = r.midi;
          const want = F.midiAt(target, 0);
          tries++;
          if (r.midi === want || r.midi === want + 12) { score++; A.blip(true); status.textContent = 'Yes! ' + r.name; setTimeout(next, 500); }
          else { A.blip(false); const near = [6, 5, 4, 3, 2, 1].map(s => ({ s, d: Math.abs(F.midiAt(s, 0) - r.midi) })).sort((a, b) => a.d - b.d)[0]; status.textContent = `That sounded like ${T.noteNameOct(r.midi)}${near.d <= 1 ? ' (string ' + near.s + ')' : ''}. Try string ${target}.`; }
          scoreEl.textContent = `${score} of ${tries} right`;
        }, { minClarity: 0.7 });
        active = true; btn.textContent = '⏹ Stop'; next();
      } catch (e) { status.textContent = 'Microphone not available: ' + e.message; }
    });
    cleanups.push(() => { active = false; Pitch.stop(); });
    return h('div.card', h('h2', '🎮 String Check'), h('p', 'A quick game: the app names a string, you pluck it (open, no fretting), the microphone checks. Builds the string-to-finger reflex.'), h('div.btn-row', btn), ask, status, scoreEl);
  }

  /* ------------------------------------------------------------- start */
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', () => {
    HG.Audio.setVolume(HG.Store.settings().volume);
    if (!location.hash) location.hash = '#/tonight';
    route();
  });
})();
