// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// Replace with your config values
firebase.initializeApp({
  apiKey:            'AIzaSyCd0-RIFVenRLRkQFFDrug150d-pKteemU',
  authDomain:        'nexus-future.firebaseapp.com',
  projectId:         'nexus-future',
  storageBucket:     'nexus-future.firebasestorage.app',
  messagingSenderId: '33575268265',
  appId:             '1:33575268265:web:25302d7d0f88e2ce3edeb8',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'NEXUS';
  const notificationOptions = {
    body:    payload.notification?.body || '',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/icon-72x72.png',
    tag:     payload.data?.tag || 'nexus-notification',
    data:    payload.data,
    actions: [
      { action: 'open',    title: 'Open NEXUS' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') return;

  const url = data?.actionUrl || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
