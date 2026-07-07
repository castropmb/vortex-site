/* VORTEX — Meta Pixel (instalação direta, consent-gated)
   Dispara eventos do Meta a partir do dataLayer preenchido por tracking.js.
   Só inicializa/rastreia quando o usuário aceita "Publicidade" no banner LGPD.

   NOTA: se um dia o Pixel for configurado dentro do GTM (Etapa 5), REMOVA
   este arquivo e o <script src="/meta-pixel.js"> das páginas para não
   disparar os eventos em dobro. */
(function () {
  'use strict';
  var PIXEL_ID = '1035418772184441';
  var loaded = false, pageViewed = false;

  function adConsent() {
    try {
      var c = JSON.parse(localStorage.getItem('vortex_consent'));
      return !!(c && c.ads === true);
    } catch (e) { return false; }
  }

  function loadPixel() {
    if (loaded) return;
    loaded = true;
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

  function ensurePageView() {
    if (!adConsent()) return;
    loadPixel();
    if (!pageViewed) { pageViewed = true; fbq('track', 'PageView'); }
  }

  function handle(ev) {
    if (!ev || !ev.event) return;
    if (ev.event === 'consent_update') { if (ev.consent_ads) ensurePageView(); return; }
    if (!adConsent()) return;           // sem consentimento de publicidade, não rastreia
    ensurePageView();
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

  // PageView no load, se o consentimento já estiver dado
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensurePageView);
  else ensurePageView();

  // Observa o dataLayer: processa o que já existe e intercepta novos pushes
  var dl = (window.dataLayer = window.dataLayer || []);
  try { dl.forEach(handle); } catch (e) {}
  var origPush = dl.push;
  dl.push = function () {
    for (var i = 0; i < arguments.length; i++) { try { handle(arguments[i]); } catch (e) {} }
    return origPush.apply(dl, arguments);
  };
})();
