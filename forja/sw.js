// Service worker do Forja. Escopo próprio (/forja/), separado do Dashboard 2026.
const CACHE = 'forja-cache-v2';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png',
  './fonts/barlow-condensed-latin-700-normal.woff2', './fonts/barlow-condensed-latin-800-normal.woff2', './fonts/barlow-condensed-latin-800-italic.woff2',
  './fonts/inter-latin-500-normal.woff2', './fonts/inter-latin-600-normal.woff2', './fonts/inter-latin-700-normal.woff2', './fonts/inter-latin-800-normal.woff2'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith('forja-')).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmoSite = url.origin === self.location.origin;
  if (!mesmoSite) return;

  // Páginas e código do app: rede primeiro (pega atualizações), cache como reserva offline.
  if (mesmoSite) {
    e.respondWith(
      fetch(req)
        .then((r) => { if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE).then((ch) => ch.put(req, c)); } return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
});
