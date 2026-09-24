/* Version the cache whenever releasing a changed app shell. */
importScripts("./offline-files.js");
const CACHE_PREFIX="rpg-todo-app:"+self.registration.scope+":";
const CACHE_NAME=CACHE_PREFIX+"20260924-planning-2";
const absolute=path=>new URL(path,self.registration.scope).href;
const known=new Set([...APP_SHELL,...GAME_ASSETS].map(absolute));
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL.map(path=>new Request(absolute(path),{cache:"reload"})))));
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    for(const name of await caches.keys())if(name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME)await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(self.clients.openWindow(new URL("./index.html#planning",self.registration.scope).href));
});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);url.search="";url.hash="";
  if(event.request.method!=="GET"||!known.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try{
      const response=await fetch(event.request);
      if(response.ok){await cache.put(url.href,response.clone()).catch(()=>{});return response;}
      return (await cache.match(url.href)) || response;
    }catch{
      return (await cache.match(url.href)) || Response.error();
    }
  })());
});
self.addEventListener("message",event=>{
  if(event.data?.type==="ACTIVATE"){self.skipWaiting();return;}
  if(event.data?.type!=="CACHE_ALL")return;
  event.waitUntil((async()=>{
    const port=event.ports?.[0],cache=await caches.open(CACHE_NAME);
    const files=[...new Set([...APP_SHELL,...GAME_ASSETS])];let completed=0;
    try{
      for(const path of files){
        const response=await fetch(absolute(path),{cache:"reload"});
        if(!response.ok)throw Error(path);
        await cache.put(absolute(path),response);
        completed++;port?.postMessage({type:"progress",completed,total:files.length});
      }
      port?.postMessage({type:"done",ok:true,completed});
    }catch{port?.postMessage({type:"done",ok:false,completed});}
  })());
});
