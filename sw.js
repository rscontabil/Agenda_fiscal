// Service Worker — Agenda de Obrigações Fiscais
// Estratégia: guarda uma cópia do "casco" do app (HTML/manifest/ícones) para abrir mesmo offline,
// e para os scripts externos (Firebase, pdf.js, xlsx) tenta a rede primeiro e usa a cópia salva
// só se a rede falhar — assim o app sempre tenta ficar atualizado, mas não trava sem internet.

const CACHE_VERSION = 'agenda-fiscal-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // Casco do app: cache primeiro (abre rápido e funciona offline), atualiza em segundo plano.
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  } else {
    // Bibliotecas externas (Firebase, pdf.js, xlsx, fontes): rede primeiro, cache como reserva
    // se a rede falhar (ex: sem internet, ou aquele bloqueio de firewall que já vimos antes).
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
