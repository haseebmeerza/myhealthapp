// My Health App service worker. Network first, so changes on the website show up; cache is only for offline use.
const CACHE = 'medrec-v11';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET') return;
  if (u.hostname === 'cdnjs.cloudflare.com') {            // PDF viewer library: keep a copy for offline
    e.respondWith(caches.match(q).then(h => h || fetch(q).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(q, c)); } return r; })));
    return;
  }
  if (u.origin !== location.origin) return;
  if (q.mode === 'navigate') {
    e.respondWith(fetch(q.url, { cache: 'no-store' }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(fetch(q, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(q, c)); } return r; }).catch(() => caches.match(q)));
});
