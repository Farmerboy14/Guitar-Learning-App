/* Service worker: makes Evening Hymns installable and usable offline.
   Strategy: precache the app shell, then stale-while-revalidate so edits arrive on the next visit. */
const VERSION = '__BUILD__';
const CACHE = 'evening-hymns-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/theory.js', 'js/audio.js', 'js/pitch.js', 'js/abc.js', 'js/fretboard.js', 'js/arranger.js', 'js/tab.js',
  'js/player.js', 'js/capo.js', 'js/storage.js', 'js/hymns.js', 'js/lessons.js', 'js/ui.js',
  'js/theory-view.js', 'js/together-view.js', 'js/tuner-view.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { network.catch(() => {}); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('index.html');
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
