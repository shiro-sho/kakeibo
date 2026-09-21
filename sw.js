const CACHE_NAME = 'kakeibo-v2';

self.addEventListener('install', (event) => {
  // 新しいService Workerを即座にアクティブ化
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 古いキャッシュをすべて削除
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// 開発中は常にネットワーク優先（最新ファイルを確実に取得）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
