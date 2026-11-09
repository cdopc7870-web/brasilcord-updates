'use strict';
// O Mobile antigo foi unificado com o BrasilCord Web. Nao interceptar a navegacao
// para que o redirecionamento da pagina /mobile/ funcione ate em instalacoes antigas.
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('brasilcord-mobile-shell-')).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response(
      '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BrasilCord</title><body style="font-family:system-ui;background:#101825;color:white;padding:30px"><h1>BrasilCord Mobile</h1><p>Conecte-se a internet para acessar o app.</p><a style="color:#7ef0ae" href="https://cdopc7870-web.github.io/brasilcord-web/?app=1">Abrir BrasilCord</a></body></html>',
      {headers:{'Content-Type':'text/html; charset=utf-8'}}
    )));
  }
});
