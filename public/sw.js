/* --- START OF FILE sw.js --- */

const CACHE_NAME = 'IronxSlot-slot-cache-v2'; // Đổi tên version để trình duyệt cập nhật mới
const urlsToCache = [
  '/',
  '/index.html',
  '/css/global.css',
  '/css/login.css',
  '/assets/videos/promo.mp4',
  '/assets/images/favicon.png'
];

// 1. Cài đặt Service Worker và cache file tĩnh
self.addEventListener('install', event => {
  self.skipWaiting(); // Kích hoạt ngay lập tức
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Xóa cache cũ khi kích hoạt phiên bản mới
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Xử lý Fetch (Quan trọng: Bỏ qua API và POST request)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // KHÔNG BAO GIỜ cache các API hoặc method POST/PUT/DELETE
  if (requestUrl.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return; // Để mặc định cho trình duyệt xử lý mạng bình thường
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu có trong cache thì trả về
        if (response) {
          return response;
        }
        // Nếu không, tải từ mạng
        return fetch(event.request).catch(() => {
            // Nếu mất mạng hoàn toàn, có thể trả về trang offline (tùy chọn)
            // return caches.match('/offline.html');
        });
      }
    )
  );
});