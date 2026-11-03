/* Service worker tối thiểu: giúp trình duyệt coi app là PWA cài được (mở toàn màn hình, không thanh trình duyệt).
   Không cache dữ liệu / API — mọi yêu cầu đi thẳng mạng; chỉ khi mất mạng khi mở trang mới dùng bản vỏ đã lưu. */
const CACHE = 'oxy-shell-v1';
const SHELL = ['./', 'brand/logo-oxymecie.png', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  e.respondWith(fetch(req).catch(() => caches.match('./')));
});
