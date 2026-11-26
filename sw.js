// ※ index.html / app.js の ?v= と揃えて更新してください（古いキャッシュは activate 時に自動削除）
const VERSION = '20261126_2';
const CACHE_NAME = `kakeibo-v${VERSION}`;

// 初回インストール時に先読みしておくアプリ本体（2回目以降の起動をネットワーク待ちゼロにする）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  `./css/style.css?v=${VERSION}`,
  `./js/app.js?v=${VERSION}`,
  `./js/store.js?v=${VERSION}`,
  `./js/charts.js?v=${VERSION}`,
  `./js/api.js?v=${VERSION}`,
  './icons/cow-titanium-128.png',
  './icons/cow-platinum-128.png'
];

// ローカル開発サーバーでは常に最新ファイルを取得（キャッシュ優先にしない）
const IS_LOCAL_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname);

// 内容が URL ごとに不変な外部リソース（バージョン固定のCDN・フォント本体）
const IMMUTABLE_HOSTS = ['cdn.jsdelivr.net', 'fonts.gstatic.com'];
// GAS API（常にネットワーク・SWは関与しない）
const BYPASS_HOSTS = ['script.google.com', 'script.googleusercontent.com'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (IS_LOCAL_DEV) return;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 1件の失敗でインストール全体が失敗しないよう個別に追加
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  // 古いキャッシュをすべて削除
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(response) {
  // 通常の200応答、または no-cors で読み込んだCDNスクリプト等（opaque）
  return response && (response.ok || response.type === 'opaque');
}

function putInCache(request, response) {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
}

// ネットワーク優先（HTML用）: 最新を取りに行き、遅い・オフライン時はキャッシュを返す
async function networkFirst(request, timeoutMs) {
  const network = fetch(request).then((res) => {
    putInCache(request, res);
    return res;
  });
  const cached = await caches.match(request, { ignoreSearch: true });
  if (!cached) return network;

  // キャッシュがある場合はタイムアウトを設け、回線が遅い時はキャッシュで即表示
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    const res = await Promise.race([network, timeout]);
    return res || cached;
  } catch (e) {
    return cached;
  }
}

// キャッシュ優先（?v= 付きのアプリ資産・バージョン固定CDN用）
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  putInCache(request, res);
  return res;
}

// キャッシュを即返しつつ裏で更新（アイコン・フォントCSSなど）
async function staleWhileRevalidate(request, event) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((res) => {
      putInCache(request, res);
      return res;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (BYPASS_HOSTS.includes(url.hostname)) return;

  const sameOrigin = url.origin === self.location.origin;

  // ローカル開発時は従来どおりネットワーク優先（オフライン時のみキャッシュ）
  if (IS_LOCAL_DEV) {
    if (!sameOrigin) return;
    event.respondWith(
      fetch(request)
        .then((res) => {
          putInCache(request, res);
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 3000));
    return;
  }

  if (sameOrigin) {
    if (url.searchParams.has('v')) {
      event.respondWith(cacheFirst(request));
    } else {
      event.respondWith(staleWhileRevalidate(request, event));
    }
    return;
  }

  if (IMMUTABLE_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, event));
  }
  // それ以外の外部リクエストは SW を介さずブラウザに任せる
});
