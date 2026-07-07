/* VORTEX — Loader do Google Tag Manager
   ÚNICO lugar onde o ID do container vive. Ao criar o container em
   tagmanager.google.com, troque o valor de GTM_ID abaixo e faça o deploy.
   Com o placeholder, nada é carregado (site funciona normalmente). */
(function () {
  'use strict';
  var GTM_ID = 'GTM-XXXXXXX'; // ← trocar pelo ID real do container

  if (GTM_ID.indexOf('XXXX') !== -1) return; // placeholder: não carrega

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
  document.head.appendChild(s);
})();
