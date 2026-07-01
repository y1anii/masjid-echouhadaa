const CACHE_NAME = 'masjid-portal-v48';
const ASSETS = [
  'parent-portal.html',
  'parent-daily.html',
  'parent-reports.html',
  'adult-portal.html',
  'index.html',
  'quran-course.html',
  'lessons.html',
  'ramadan.html',
  'location.html',
  'css/style.css',
  'js/main.js',
  'js/parent.js',
  'js/daily.js',
  'js/reports.js',
  'js/adult.js',
  'admin/js/db.js',
  'images/masjidlogo.png',
  'images/parent-portal-icon.png'
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
