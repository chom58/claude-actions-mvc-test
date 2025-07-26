// 原宿クリエイティブコミュニティ PWA Service Worker
// Cache Version
const CACHE_NAME = 'harajuku-creative-v1';
const OFFLINE_CACHE = 'offline-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'images-v1';

// キャッシュするファイルリスト (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/offline.html',
  '/js/client-monitoring.js',
  '/js/image-upload.js',
  '/js/pwa-installer.js',
  '/js/advanced-search.js',
  '/components/search-filter-panel.html',
  '/manifest.json',
  // External resources (CDN)
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600;700;900&family=Noto+Sans+JP:wght@300;400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// キャッシュする画像の拡張子
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];

// Install Event - Service Worker インストール時
self.addEventListener('install', event => {
  console.log('🚀 Service Worker: インストール中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: 静的アセットをキャッシュ中...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: インストール完了');
        return self.skipWaiting(); // 新しいSWを即座にアクティブ化
      })
      .catch(error => {
        console.error('❌ Service Worker: インストール失敗', error);
      })
  );
});

// Activate Event - Service Worker アクティベート時
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: アクティベート中...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 古いキャッシュを削除
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('🗑️ Service Worker: 古いキャッシュを削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: アクティベート完了');
        return self.clients.claim(); // 既存のクライアントを制御
      })
  );
});

// Fetch Event - リクエスト処理
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Chrome Extension リクエストをスキップ
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // API リクエストの処理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // 画像リクエストの処理
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // 静的アセットの処理
  event.respondWith(handleStaticRequest(request));
});

// API リクエスト処理 (Network First Strategy)
async function handleApiRequest(request) {
  try {
    // ネットワークを優先
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 成功した場合はキャッシュに保存
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Service Worker: APIリクエストがオフライン、キャッシュから取得を試行');
    
    // ネットワークエラーの場合はキャッシュから取得
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // キャッシュにもない場合はオフライン用のレスポンスを返す
    return new Response(
      JSON.stringify({ 
        error: 'オフライン中です。後でもう一度お試しください。',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}

// 画像リクエスト処理 (Cache First Strategy)
async function handleImageRequest(request) {
  // キャッシュを優先
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // キャッシュにない場合はネットワークから取得
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 成功した場合はキャッシュに保存
      const responseClone = networkResponse.clone();
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🖼️ Service Worker: 画像がオフライン、プレースホルダーを表示');
    
    // オフライン時のプレースホルダー画像
    return new Response(
      `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="50%" y="50%" fill="#FF1493" font-family="Arial" font-size="16" text-anchor="middle" dy="4">
          オフライン中
        </text>
      </svg>`,
      { 
        headers: { 'Content-Type': 'image/svg+xml' },
        status: 200
      }
    );
  }
}

// 静的リクエスト処理 (Cache First with Network Fallback)
async function handleStaticRequest(request) {
  // キャッシュを優先
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // キャッシュにない場合はネットワークから取得
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 成功した場合はキャッシュに保存
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📄 Service Worker: ページがオフライン、オフラインページを表示');
    
    // HTMLページの場合はオフラインページを表示
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html');
      return offlineResponse || new Response('オフライン中です', { 
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    throw error;
  }
}

// 画像リクエストかどうかの判定
function isImageRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();
  
  return IMAGE_EXTENSIONS.some(ext => pathname.endsWith(`.${ext}`)) ||
         request.destination === 'image';
}

// プッシュ通知受信
self.addEventListener('push', event => {
  console.log('📬 Service Worker: プッシュ通知を受信');
  
  let notificationData = {
    title: '原宿クリエイティブコミュニティ',
    body: '新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'general',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: '表示',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: 通知がクリックされました');
  
  event.notification.close();
  
  if (event.action === 'view') {
    // 表示アクションの場合
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // 閉じるアクションの場合は何もしない
    return;
  } else {
    // デフォルトクリックの場合
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // 既存のウィンドウがある場合はフォーカス
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// バックグラウンド同期
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: バックグラウンド同期開始');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === 'sync-search-history') {
    event.waitUntil(syncSearchHistory());
  }
});

// バックグラウンド同期処理
async function doBackgroundSync() {
  try {
    // オフライン中に蓄積されたデータを同期
    console.log('📡 Service Worker: オフラインデータを同期中...');
    
    // 未送信の投稿データを送信
    await syncPendingPosts();
    
    console.log('✅ Service Worker: バックグラウンド同期完了');
  } catch (error) {
    console.error('❌ Service Worker: バックグラウンド同期エラー', error);
  }
}

// 未送信の投稿データを同期
async function syncPendingPosts() {
  // 実装例: IndexedDBから未送信データを取得して送信
  console.log('📝 Service Worker: 未送信の投稿を同期中...');
}

// 検索履歴の同期
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

// Service Worker更新通知
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🎌 原宿クリエイティブコミュニティ Service Worker 読み込み完了');