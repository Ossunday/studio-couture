/// <reference types="@sveltejs/kit" />
import { version, build } from '$service-worker';
import { brandCacheName } from './lib/brand';

const CACHE = brandCacheName(version);
const ASSETS = [...build];

// Hors-ligne : uniquement les ressources statiques de l'app.
// JAMAIS de photos clientes, de pages clientes ni d'API dans ce cache.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/photos-clientes') || url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request)));
});
