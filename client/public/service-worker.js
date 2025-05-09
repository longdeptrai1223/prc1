// PTC Mining App Service Worker
const CACHE_NAME = 'ptc-mining-app-v1';
const OFFLINE_FALLBACK = '/offline.html';
const API_CACHE_NAME = 'ptc-mining-api-cache-v1';

// Tất cả các tài nguyên cần cache cho hoạt động offline
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.ico',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/assets/index.css',
  '/assets/index.js',
];

// Các API endpoints cần xử lý offline
const API_URLS_TO_CACHE = [
  '/api/mining/status'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
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
    .then(() => self.clients.claim())
  );
});

// Fetch event - network first for API, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Xử lý cho các API endpoints
  if (url.pathname.startsWith('/api/')) {
    // Chỉ xử lý các API endpoints được chỉ định
    if (API_URLS_TO_CACHE.includes(url.pathname)) {
      event.respondWith(networkFirstWithBackgroundSync(event));
    }
    return;
  }

  // Xử lý cho các tài nguyên tĩnh
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Nếu có trong cache, trả về từ cache
          return cachedResponse;
        }

        // Nếu không có trong cache, thử lấy từ network
        return fetch(event.request)
          .then(response => {
            // Nếu response không hợp lệ, trả về lỗi
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache lại response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            // Nếu không thể fetch từ network (không có kết nối), trả về trang offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_FALLBACK);
            }
            
            throw error;
          });
      })
  );
});

// Network first with background sync for API endpoints
function networkFirstWithBackgroundSync(event) {
  return fetch(event.request.clone())
    .then(response => {
      // Cache lại response
      const responseToCache = response.clone();
      caches.open(API_CACHE_NAME)
        .then(cache => {
          cache.put(event.request, responseToCache);
        });
      
      return response;
    })
    .catch(error => {
      // Nếu network request thất bại, thử lấy từ cache
      return caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Đánh dấu để đồng bộ sau khi có kết nối
            event.waitUntil(
              self.registration.sync.register('mining-sync')
            );
            return cachedResponse;
          }
          
          // Nếu không có trong cache, trả về lỗi
          throw error;
        });
    });
}

// Background sync for mining operations
self.addEventListener('sync', event => {
  if (event.tag === 'mining-sync') {
    event.waitUntil(syncMiningData());
  }
});

// Xử lý đồng bộ dữ liệu khi có kết nối internet trở lại
async function syncMiningData() {
  try {
    // Đồng bộ trạng thái đào coin
    const miningCompleted = localStorage.getItem('mining_completed') === 'true';
    if (miningCompleted) {
      // Nếu đã hoàn thành đào coin khi offline, gửi thông báo
      showNotification('Mining Completed', 'Your mining session completed while you were offline. You can claim your rewards now!');
    }
    
    // Đồng bộ các pending operations từ IndexedDB
    const pendingOperations = await getPendingOperations();
    
    for (const operation of pendingOperations) {
      try {
        const response = await fetch('/api/mining/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(operation),
        });
        
        if (response.ok) {
          await deletePendingOperation(operation.id);
        }
      } catch (error) {
        console.error('Failed to sync operation:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Lưu operation vào IndexedDB để đồng bộ sau
async function savePendingOperation(operation) {
  const db = await openDatabase();
  const tx = db.transaction('miningOperations', 'readwrite');
  const store = tx.objectStore('miningOperations');
  await store.add(operation);
  await tx.complete;
}

// Lấy tất cả pending operations
async function getPendingOperations() {
  const db = await openDatabase();
  const tx = db.transaction('miningOperations', 'readonly');
  const store = tx.objectStore('miningOperations');
  return await store.getAll();
}

// Xóa pending operation sau khi đã đồng bộ
async function deletePendingOperation(id) {
  const db = await openDatabase();
  const tx = db.transaction('miningOperations', 'readwrite');
  const store = tx.objectStore('miningOperations');
  await store.delete(id);
  await tx.complete;
}

// Push notification handling
self.addEventListener('push', event => {
  let data = { 
    title: 'PTC Mining Update',
    body: 'You have a new notification',
    url: '/'
  };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Error parsing push notification data:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Show notification helper
function showNotification(title, body, url = '/') {
  return self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: { url }
  });
}

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        // If so, just focus it.
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Open IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ptcMiningApp', 1);
    
    request.onerror = event => {
      reject('Error opening database');
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('miningOperations')) {
        db.createObjectStore('miningOperations', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}