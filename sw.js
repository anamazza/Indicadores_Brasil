/* Service worker dos Painéis de Indicadores · Maternidades Estratégicas (18/10/2026).
   Permite instalar o site como aplicativo (PWA) e guarda uma cópia das páginas já visitadas para abrir sem internet.
   Estratégia: rede primeiro (os painéis são atualizados com frequência); se a rede falhar, usa a cópia guardada.
   Só o próprio site é guardado; os mapas de fundo (CDN) sempre vêm da rede. */
const VERSAO = "2026-10-29";
const CACHE = "indicadores-brasil-" + VERSAO;
const BASE = "/Indicadores_Brasil/";
const PRECACHE = [BASE, BASE + "manifest.webmanifest", BASE + "icons/maos-192.png", BASE + "icons/maos-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("indicadores-brasil-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // CDN dos mapas: sempre rede
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match(BASE) : undefined)))
  );
});
