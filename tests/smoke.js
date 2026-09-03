// Browser smoke test: loads every view, exercises the main controls, saves screenshots.
// Run: npm run smoke   (starts nothing itself; expects a static server at BASE or serves via file://)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'screenshots');
const BASE = process.env.BASE || ('file://' + path.join(__dirname, '..', 'index.html'));

function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(root)) return null;
  for (const dir of fs.readdirSync(root)) {
    if (!dir.startsWith('chromium')) continue;
    for (const cand of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
      const p = path.join(root, dir, cand); if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const launch = { headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync', '--disable-features=Translate,OptimizationHints'] };
  let browser;
  try { browser = await chromium.launch(launch); }
  catch (e) { const exe = findChromium(); if (!exe) throw e; browser = await chromium.launch({ ...launch, executablePath: exe }); }
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(BASE);
  await page.waitForTimeout(400);
  const go = async (hash, shot, fn) => {
    const before = errors.length;
    await page.evaluate(h => { location.hash = '#/' + h; }, hash);
    await page.waitForTimeout(350);
    if (fn) await fn();
    if (shot) await page.screenshot({ path: path.join(SHOTS, shot + '.png'), fullPage: true });
    console.log((hash).padEnd(30), errors.length > before ? 'ERRORS: ' + errors.slice(before).join(' | ') : 'ok');
  };
  await go('tonight', '01-tonight');
  await go('lessons', '02-lessons');
  await go('lessons/l01', '03-lesson-01', async () => {
    await page.click('.play-btn'); await page.waitForTimeout(700);
    for (let i = 0; i < 3; i++) await page.click('text=I played it cleanly');
    await page.waitForTimeout(200);
    const t = await page.textContent('.tempo-val'); if (!/55 BPM/.test(t)) errors.push('ladder tempo expected 55, got ' + t);
    await page.click('text=Start String Check'); await page.waitForTimeout(600);
    await page.click('text=Mark lesson complete'); await page.waitForTimeout(200);
  });
  await go('lessons/l05', '04-lesson-05', async () => { await page.click('.play-btn'); await page.waitForTimeout(600); await page.click('text=■'); });
  await go('lessons/l07', null);
  await go('lessons/l09', null, async () => { await page.click('.play-btn'); await page.waitForTimeout(500); });
  await go('hymns', '05-hymns');
  await go('hymns/amazing-grace', '06-hymn-amazing-grace', async () => {
    const rows = await page.$$('.tab-row'); if (!rows.length) errors.push('no tab rows rendered');
    await page.click('.seg button:nth-child(3)'); await page.waitForTimeout(200);
    await page.click('text=Line 1'); await page.waitForTimeout(100);
    await page.click('.play-btn'); await page.waitForTimeout(3600);
    const cursorVisible = await page.$$eval('.tab-cursor', els => els.some(el => el.style.display !== 'none'));
    if (!cursorVisible) errors.push('playhead cursor not visible after count-in');
    await page.click('text=■');
    await page.selectOption('.key-select', 'C'); await page.waitForTimeout(300);
    await page.click('text=Listen mode'); await page.waitForTimeout(200);
    await page.click('text=Start listening'); await page.waitForTimeout(600);
    await page.keyboard.press('Space'); await page.waitForTimeout(100);
    await page.click('text=Played it cleanly'); await page.waitForTimeout(100);
  });
  for (const id of ['joyful-joyful', 'come-thou-fount', 'silent-night', 'what-child-is-this', 'doxology', 'praise-to-the-lord', 'o-sacred-head', 'all-glory-laud', 'now-thank-we']) {
    await go('hymns/' + id, id === 'silent-night' ? '07-hymn-silent-night' : null, async () => {
      const rows = await page.$$('.tab-row'); if (!rows.length) errors.push('no tab rows for ' + id);
      await page.click('.seg button:nth-child(3)'); await page.waitForTimeout(150);
      await page.click('.play-btn'); await page.waitForTimeout(400); await page.click('text=■');
    });
  }
  await go('theory', '08-theory');
  for (const t of ['notes', 'scale', 'intervals', 'chords', 'key', 'cadence', 'harmony', 'rhythm', 'circle']) {
    await go('theory/' + t, t === 'intervals' ? '09-theory-intervals' : t === 'circle' ? '10-theory-circle' : null, async () => {
      const btn = await page.$('.card button.btn.primary'); if (btn) { await btn.click(); await page.waitForTimeout(300); }
      if (t === 'harmony') { await page.click('text=Level 3'); await page.waitForTimeout(500); await page.click('text=■'); }
      if (t === 'scale') { await page.selectOption('.card select', 'D'); await page.waitForTimeout(100); }
    });
  }
  for (const g of ['game-interval', 'game-major-minor', 'game-next-chord']) {
    await go('theory/' + g, g === 'game-interval' ? '11-game-interval' : null, async () => {
      await page.click('text=Start'); await page.waitForTimeout(300);
      const opts = await page.$$('.quiz-opts button'); if (opts.length) { await opts[0].click(); await page.waitForTimeout(200); }
      const nxt = await page.$('text=Next →'); if (nxt) { await nxt.click(); await page.waitForTimeout(200); }
    });
  }
  await go('together', '12-together', async () => {
    await page.selectOption('.card select', 'Eb'); await page.waitForTimeout(150);
    const sels = await page.$$('select'); if (sels[1]) await sels[1].selectOption('C');
  });
  await go('tuner', '13-tuner', async () => { await page.click('text=Start tuner'); await page.waitForTimeout(800); await page.click('text=6: E2'); await page.waitForTimeout(200); });
  // back to tonight: mark items done
  await go('tonight', null, async () => { for (let i = 0; i < 4; i++) { const b = await page.$('text=Mark done'); if (!b) break; await b.click(); await page.waitForTimeout(150); } });
  await page.screenshot({ path: path.join(SHOTS, '14-tonight-done.png'), fullPage: true });

  // mobile viewport check
  const mob = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const mp = await mob.newPage();
  mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
  await mp.goto(BASE + '#/hymns/amazing-grace'); await mp.waitForTimeout(600);
  await mp.screenshot({ path: path.join(SHOTS, '15-mobile-hymn.png'), fullPage: true });
  const bodyWidth = await mp.evaluate(() => document.documentElement.scrollWidth);
  if (bodyWidth > 400) errors.push('mobile page scrolls horizontally: ' + bodyWidth);
  await mp.goto(BASE + '#/tonight'); await mp.waitForTimeout(400);
  await mp.screenshot({ path: path.join(SHOTS, '16-mobile-tonight.png'), fullPage: true });

  await browser.close();
  console.log('\nscreenshots in', SHOTS);
  if (errors.length) { console.log('\nERRORS:\n - ' + errors.join('\n - ')); process.exit(1); }
  console.log('smoke test passed with no errors');
})().catch(e => { console.error(e); process.exit(1); });
