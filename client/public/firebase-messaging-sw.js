// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.19.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.19.1/firebase-messaging-compat.js');

// Firebase configuration
// Note: In a real app, these values would be replaced with real Firebase project credentials
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || "DEFAULT_API_KEY",
  authDomain: self.FIREBASE_AUTH_DOMAIN || "DEFAULT_AUTH_DOMAIN",
  projectId: self.FIREBASE_PROJECT_ID || "DEFAULT_PROJECT_ID",
  storageBucket: self.FIREBASE_STORAGE_BUCKET || "DEFAULT_STORAGE_BUCKET",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "DEFAULT_MESSAGING_SENDER_ID",
  appId: self.FIREBASE_APP_ID || "DEFAULT_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Background push handler
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  // Customize notification here
  const notificationTitle = payload.notification.title || 'PTC Mining Notification';
  const notificationOptions = {
    body: payload.notification.body || 'New PTC mining update!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // This looks to see if the current window is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then((clientList) => {
      // If a window tab matching the targeted URL already exists, focus that
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Push subscription change handler (for token refresh)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  
  event.waitUntil(
    // Handle subscription changes (token refresh)
    // In a real app, you would update the token in your backend
    Promise.resolve()
  );
});

// Periodic background sync (for mining status checks)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mining-check') {
    event.waitUntil(checkMiningStatus());
  }
});

// Background sync for mining status
async function checkMiningStatus() {
  try {
    // Check if mining is complete and show notification if needed
    const response = await fetch('/api/mining/stats', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      const stats = await response.json();
      
      if (stats.miningActive && stats.miningUntil) {
        const miningUntil = new Date(stats.miningUntil);
        const now = new Date();
        
        // If mining has completed, show notification
        if (now >= miningUntil) {
          self.registration.showNotification('Mining Complete!', {
            body: 'Your mining session is complete. Claim your rewards now!',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            data: { url: '/home' }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking mining status:', error);
  }
}

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  return self.clients.claim();
});
