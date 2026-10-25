// Eyelink AI offline helper. It only keeps copies of this site's own pages and icons.
// Sign-in, the database and the AI are never cached, so they always use the live connection.
var VERSION = 'eyelink-v1';
var SHELL = ['./', 'index.html', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Pages: try the network first so people always get the newest version, fall back to the saved copy when offline.
  if (req.mode === 'navigate' || url.pathname.slice(-5) === '.html') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('index.html') || caches.match('./'); });
    }));
    return;
  }
  // Icons and other files: saved copy first, refreshed in the background.
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
