// 앱으로 설치할 수 있게 해 주는 파일. 항상 새 화면을 먼저 받아 오고, 인터넷이 끊겼을 때만 저장해 둔 화면을 보여 줍니다.
const CACHE='hyumu-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r)));
});
