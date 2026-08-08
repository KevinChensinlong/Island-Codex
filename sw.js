const CACHE_NAME = 'port-guide-v1';

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 啟動 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 攔截請求（基本網路優先策略）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});