// Service Worker for PWA
const CACHE_NAME = 'hcc-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/offline.html',
  '/js/advanced-search.js',
  '/components/search-filter-panel.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600;700;900&family=Noto+Sans+JP:wght@300;400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// インストールイベント
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('キャッシュの追加に失敗:', error);
      })
  );
});

// アクティベートイベント
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// フェッチイベント
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエストは常にネットワークから取得
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // レスポンスのクローンを作成
          const responseToCache = response.clone();
          
          // 成功したAPIレスポンスをキャッシュ
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });
          }
          
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュから取得
          return caches.match(request);
        })
    );
    return;
  }

  // 静的リソースはキャッシュファーストで取得
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(request).then(response => {
          // 404エラーやリダイレクトはキャッシュしない
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // オフライン時のフォールバック
        if (request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
  );
});

// バックグラウンド同期
self.addEventListener('sync', event => {
  if (event.tag === 'sync-search-history') {
    event.waitUntil(syncSearchHistory());
  }
});

async function syncSearchHistory() {
  try {
    // IndexedDBから未同期の検索履歴を取得
    const db = await openDB();
    const tx = db.transaction('searchHistory', 'readonly');
    const store = tx.objectStore('searchHistory');
    const unsyncedSearches = await store.getAll();

    // サーバーに同期
    if (unsyncedSearches.length > 0) {
      await fetch('/api/search/sync-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ searches: unsyncedSearches })
      });

      // 同期済みフラグを更新
      const writeTx = db.transaction('searchHistory', 'readwrite');
      const writeStore = writeTx.objectStore('searchHistory');
      for (const search of unsyncedSearches) {
        search.synced = true;
        await writeStore.put(search);
      }
    }
  } catch (error) {
    console.error('検索履歴の同期に失敗:', error);
  }
}

// プッシュ通知
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '新しいお知らせがあります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '詳細を見る',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('原宿クリエイティブコミュニティ', options)
  );
});

// 通知クリック
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    clients.openWindow('/');
  }
});

// IndexedDBヘルパー関数
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hcc-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('searchHistory')) {
        db.createObjectStore('searchHistory', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}