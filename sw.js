// Service Worker — Agenda de Obrigações Fiscais
// Estratégia: rede primeiro, SEMPRE — o app sempre tenta buscar a versão mais nova quando tem
// internet, e só usa a cópia salva localmente se a rede falhar (para funcionar offline).
// (Antes era "cache primeiro" para o casco do app, mas isso causava a tela mostrar uma versão
// desatualizada até o usuário limpar o cache manualmente — rede primeiro evita esse problema.)

const CACHE_VERSION = 'agenda-fiscal-v2';
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
  // Ignora requisições que não são http/https (ex: chrome-extension://, de extensões do navegador) —
  // a Cache API não aceita esses esquemas, e essas requisições nem são do nosso app mesmo.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Rede primeiro, sempre — para o casco do app e para bibliotecas externas (Firebase, pdf.js, xlsx).
  // Só recorre à cópia salva se a rede falhar de verdade (sem internet, ou bloqueio de firewall).
  event.respondWith(
    fetch(req, {cache: 'no-store'}).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});

