// Kitaplık çevrimdışı çalışsın diye uygulama dosyalarını telefonda saklar.
// Önce saklanan kopya gösterilir; internet varsa arka planda yenisi alınır (bir sonraki açılışta görünür).
const AD = 'kitaplik-v2';
const KAPAKLAR = 'kitaplik-kapaklar'; // bir kez görülen kapak görselleri; internetsizken de görünsün
const DOSYALAR = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(AD).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(adlar => Promise.all(adlar.filter(a => a !== AD && a !== KAPAKLAR).map(a => caches.delete(a)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const istek = e.request;
  if (istek.method !== 'GET') return;
  const ayniKaynak = new URL(istek.url).origin === location.origin;

  if (!ayniKaynak) {
    if (istek.destination !== 'image') return; // kapak araması vb. doğrudan ağa gider
    e.respondWith(caches.open(KAPAKLAR).then(async c => {
      const saklanan = await c.match(istek);
      if (saklanan) return saklanan;
      const y = await fetch(istek);
      if (y.ok || y.type === 'opaque') c.put(istek, y.clone());
      return y;
    }));
    return;
  }

  e.respondWith(caches.open(AD).then(async c => {
    const saklanan = await c.match(istek, { ignoreSearch: true });
    const agdan = fetch(istek).then(y => { if (y.ok) c.put(istek, y.clone()); return y; }).catch(() => null);
    return saklanan || (await agdan) || new Response('Çevrimdışı', { status: 503 });
  }));
});
