// Offline-Unterstützung: immer erst frisch aus dem Netz, bei Funkloch aus dem Cache
const CACHE = 'hantelhelden-36';
const FILES = ['./', './index.html', './style.css', './app.js', './sync.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // nur eigene Dateien und die Firebase-Bibliothek zwischenspeichern – nie die Datenbank selbst
  if (url.origin !== location.origin && url.hostname !== 'www.gstatic.com') return;
  // das Dorf-Archiv läuft ohne Zwischenspeicher
  if (url.pathname.includes('/dorf/')) return;
  e.respondWith(
    // cache: 'no-cache' = beim Server nachfragen, ob es eine neue Version gibt (sonst bleiben alte Dateien hängen)
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
