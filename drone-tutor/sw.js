/* Drone Tutor: offline copy.
   Keeps a copy of the page on the phone so it opens with no signal.
   It only covers this folder (drone-tutor), so the other tutors are not touched.
   The page opens from the saved copy first, then fetches the latest version in the background,
   so a newly published version shows up the next time you open the page. */
var CACHE = 'drone-tutor-v2';   // bumped for the Skills gym and lessons 13 to 23, so phones fetch the new page
var FILES = ['./', './index.html'];

self.addEventListener('install', function (e) {
  // cache: 'reload' makes sure the copy saved here is the newest one from the web, not an older one the browser was holding
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(new Request(f, { cache: 'reload' })).then(function (res) { if (!res.ok) throw new Error('bad response'); return c.put(f, res); });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('drone-tutor-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return null; });
      if (hit) { e.waitUntil(net); return hit; }
      return net.then(function (res) { return res || caches.match('./index.html'); });
    })
  );
});
