'use strict';
// Cache apenas do shell público da PWA. Nunca armazenar API, autenticação, mídia ou dados pessoais.
const VERSION='brasilcord-mobile-shell-v3';
const SHELL=['./','./index.html','./styles.css','./advanced.css','./app.js','./voice.js','./tools.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('brasilcord-mobile-shell-')&&key!==VERSION).map(key=>caches.delete(key)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode==='navigate'&&new URL(req.url).origin!==self.location.origin)return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.includes('/mobile/'))return;
  if(!SHELL.some(resource=>new URL(resource,self.registration.scope).pathname===url.pathname)){
    return; // Não armazenar respostas dinâmicas ou arquivos de outras páginas.
  }
  event.respondWith(fetch(req).then(res=>{
    if(res.ok){const clone=res.clone();void caches.open(VERSION).then(cache=>cache.put(req,clone));}
    return res;
  }).catch(()=>caches.match(req).then(hit=>hit||Response.error())));
});