/* VORTEX — Meta Pixel: eventos de conversão adicionais
   A inicialização (init + PageView) está inline no <head> de cada página.
   Este arquivo apenas observa o dataLayer para disparar Lead/Contact/ViewContent. */
(function () {
  'use strict';

  function handle(ev) {
    if (!ev || !ev.event || typeof window.fbq !== 'function') return;
    switch (ev.event) {
      case 'generate_lead':
        fbq('track', 'Lead',
          { value: ev.value, currency: ev.currency || 'BRL' },
          { eventID: ev.event_id });
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

  var dl = (window.dataLayer = window.dataLayer || []);
  try { dl.forEach(handle); } catch (e) {}
  var origPush = dl.push;
  dl.push = function () {
    for (var i = 0; i < arguments.length; i++) { try { handle(arguments[i]); } catch (e) {} }
    return origPush.apply(dl, arguments);
  };
})();
