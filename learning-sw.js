/* SpeedyLearning optional offline shell. Same-origin educational assets only. */
const CACHE = 'speedylearning-offline-v10';
const CORE = ['/', '/index.html', '/speedy-plus.js', '/maths-methods.js', '/maths-workspace.js', '/maths-workspace.css', '/manifest.webmanifest', '/assets/speedy-icon.svg', '/assets/speedy-world.css', '/assets/speedy-modules.css', '/assets/speedy-world.js', '/assets/speedy-pages.css', '/assets/mascot-dash.svg', '/assets/mascot-sum.svg', '/assets/mascot-story.svg', '/assets/mascot-scribble.svg', '/assets/mascot-scout.svg', '/assets/mascot-spark.svg', '/assets/speedy-island-map.svg', '/quests/', '/quests/index.html', '/quests/quests.js', '/quests/engine.js', '/learning-paths-data.js', '/games/', '/games/index.html', '/games/maths-data.js', '/games/arcade.js', '/games/arcade.css', '/games/expedition.js', '/games/expedition.css'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('speedylearning-offline-')&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/console/'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{
      if(res.ok && url.pathname==='/') caches.open(CACHE).then(c=>c.put('/',res.clone())).catch(()=>{});
      return res;
    }).catch(()=>caches.match(url.pathname)||caches.match('/')));
    return;
  }
  if(CORE.includes(url.pathname))event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});

/* v4 review engine cache verified in deployment check. */
