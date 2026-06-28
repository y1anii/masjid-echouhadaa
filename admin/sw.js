const CACHE_NAME = 'masjid-admin-v54';
const ASSETS = [
  'index.html',
  'lessons.html',
  'teacher.html',
  'login.html',
  'css/admin.css',
  'js/db.js',
  'js/auth.js',
  'js/students.js',
  'js/lessons.js',
  'js/teacher.js',
  'manifest.json',
  '../css/style.css',
  '../images/masjidlogo.png',
  '../images/parent-portal-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
