/* Crew PWA: static hashed bundles only. No offline interception of AI, login, analytics or audio APIs. */
"use strict";
const STATIC_CACHE="crew-pwa-static-v1";
const OFFLINE_URL="/offline.html";
const MAX_BUNDLES=72;
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.add(OFFLINE_URL)));
 // Do not skipWaiting: an ongoing chat/game must keep its current worker.
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith("crew-pwa-static-")&&name!==STATIC_CACHE)
   .map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 // Never proxy or store authentication, usage, speech, websocket-adjacent URLs or version checks.
 if(/^\/(?:api\/|auth\/|usage(?:\/|$)|version\.json$|sw\.js$)/.test(url.pathname))return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).catch(async()=>{
   return (await caches.match(OFFLINE_URL))||Response.error();
  }));
  return;
 }
 // Vite content-hashed, immutable build assets are the only runtime cache.
 if(!/^\/assets\/build\/[^/]+\.(?:js|css|woff2?)$/.test(url.pathname)||url.search)return;
 event.respondWith((async()=>{
  const cache=await caches.open(STATIC_CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok&&response.type==="basic"){
   try{
    await cache.put(request,response.clone());
    const keys=await cache.keys();
    if(keys.length>MAX_BUNDLES){
     const removable=keys.find(item=>new URL(item.url).pathname!==OFFLINE_URL);
     if(removable)await cache.delete(removable);
    }
   }catch{/* Storage quotas must never break app loading. */}
  }
  return response;
 })());
});
