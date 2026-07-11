/*
 * Service worker mínimo (item K): cachea el "shell" de la app (el HTML) para que
 * abra aunque no haya internet. Los datos siguen viviendo solo en localStorage del
 * navegador — este SW no sincroniza nada, solo sirve archivos cacheados.
 *
 * IMPORTANTE — límites reales de esto:
 *  - No hay notificaciones push con la app cerrada: eso requiere un servidor de push
 *    (Firebase Cloud Messaging, Web Push con VAPID, etc.) que esta app no tiene por
 *    ser 100% del lado del cliente. Las notificaciones que sí implementa la app avisan
 *    mientras la pestaña/app está abierta (usando la Notification API directamente).
 *  - Debe servirse por HTTPS (o localhost) para poder registrarse; no funciona con
 *    file:// ni si el navegador bloquea Service Workers en ese contexto.
 */
var CACHE_NAME = 'bitacora-ciclo-v1';
var APP_SHELL = [
  './Payment_Analysis.html',
  './manifest.json'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(){ /* si algún recurso falla, no bloquea la instalación */ });
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Estrategia: red primero (para tener siempre la versión más nueva si hay internet),
// con respaldo en caché si no hay conexión.
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function(resp){
      var copy = resp.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      return resp;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){
        return cached || caches.match('./Payment_Analysis.html');
      });
    })
  );
});
