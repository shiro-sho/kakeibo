const CACHE_NAME = 'kakeibo-v20261111_3';

self.addEventListener('install', (event) => {
  // 新しいService Workerを即座にアクティブ化
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 古いキャッシュをすべて削除
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ネットワーク優先＋キャッシュ自動更新（最新ファイルを確実に取得しつつオフライン・高速フォールバック対応）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
