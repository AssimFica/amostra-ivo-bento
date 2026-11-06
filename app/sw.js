// Guarda as páginas da app para abrirem depressa e sem rede (a deteção do corpo e as letras vêm sempre da rede).
const CACHE = 'ivo-bento-v2';
const PAGINAS = ['./', 'index.html', 'prova.html', 'prova.js', 'liga.html', 'liga.js', 'liga-dados.js', 'porta.html', 'entrar.html', 'painel.html', 'painel.js', 'painel.css', 'sessao.js', 'corridas-dados.js', 'comum.css', 'manifest.webmanifest', 'icone-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PAGINAS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
