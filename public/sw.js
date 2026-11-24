// Basit servis çalışanı: yüklenebilirlik için; ağ isteklerine karışmaz
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
