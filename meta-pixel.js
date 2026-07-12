/* VORTEX — Meta Pixel (Opção B: medição no carregamento)
   PageView e eventos de conversão disparam já no load, para a campanha
   não perder medição de quem não interage com o banner de cookies.
   O banner continua governando o Google/analytics e o remarketing;
   a medição básica do Meta roda por interesse legítimo.

   Pixel vinculado ao business PBC (campanha ativa): 1348559673368085.
   NOTA: se um dia o Pixel for para dentro do GTM, remova este arquivo
   e o <script src="/meta-pixel.js"> das páginas para não duplicar. */
(function () {
  'use strict';
  var PIXEL_ID = '1348559673368085';
  var pageViewed = false;

  function loadPixel() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
  }

  function start() {
    loadPixel();
    if (!pageViewed) { pageViewed = true; fbq('track', 'PageView'); }
  }

  function handle(ev) {
    if (!ev || !ev.event) return;
    start();
    switch (ev.event) {
      case 'generate_lead':
        fbq('track', 'Lead',
          { value: ev.value, currency: ev.currency || 'BRL' },
          { eventID: ev.event_id });     // dedup com a CAPI (Etapa 6)
        break;
      case 'contact_whatsapp':
      case 'contact_phone':
        fbq('track', 'Contact');
        break;
      case 'article_view':
        fbq('track', 'ViewContent', { content_name: ev.article_slug || undefined });
        break;
    }
  }

  // Opção B — dispara no carregamento, sem esperar consentimento
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Observa o dataLayer para os eventos de conversão/engajamento
  var dl = (window.dataLayer = window.dataLayer || []);
  try { dl.forEach(handle); } catch (e) {}
  var origPush = dl.push;
  dl.push = function () {
    for (var i = 0; i < arguments.length; i++) { try { handle(arguments[i]); } catch (e) {} }
    return origPush.apply(dl, arguments);
  };
})();
