/* VORTEX — Banner de consentimento LGPD + Consent Mode v2
   O default 'denied' é definido inline no <head> de cada página, ANTES deste arquivo.
   Aqui: UI do banner, persistência, update do consent e evento p/ GTM. */
(function () {
  'use strict';

  var STORAGE_KEY = 'vortex_consent';
  var POLICY_VERSION = '1.0';           // sincronizar com a versão em /privacidade
  var MAX_AGE_DAYS = 365;               // renovar consentimento após 12 meses

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (c.version !== POLICY_VERSION) return null;
      if (Date.now() - c.ts > MAX_AGE_DAYS * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }

  function store(analytics, ads) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: POLICY_VERSION, ts: Date.now(), analytics: analytics, ads: ads
      }));
    } catch (e) {}
  }

  function applyConsent(analytics, ads, fireEvent) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: ads ? 'granted' : 'denied',
        ad_user_data: ads ? 'granted' : 'denied',
        ad_personalization: ads ? 'granted' : 'denied'
      });
    }
    if (fireEvent) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'consent_update',
        consent_analytics: analytics,
        consent_ads: ads
      });
    }
  }

  /* ── UI ── */
  var CSS = '#vtx-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;' +
    'max-width:520px;margin:0 auto;background:#1F2548;border:1px solid rgba(232,119,34,0.3);' +
    'border-radius:14px;padding:20px 22px;box-shadow:0 16px 48px rgba(0,0,0,0.5);' +
    'font-family:"Space Grotesk",sans-serif;color:#F0F4FF;font-size:0.85rem;line-height:1.55}' +
    '#vtx-consent p{margin:0 0 14px;color:rgba(240,244,255,0.85)}' +
    '#vtx-consent a{color:#E87722;text-decoration:underline}' +
    '.vtx-c-row{display:flex;gap:10px;flex-wrap:wrap}' +
    '.vtx-c-btn{font-family:inherit;font-size:0.78rem;font-weight:700;letter-spacing:0.05em;' +
    'padding:10px 18px;border-radius:8px;cursor:pointer;transition:opacity .15s}' +
    '.vtx-c-accept{background:#E87722;color:#111524;border:none}' +
    '.vtx-c-accept:hover{opacity:.88}' +
    '.vtx-c-essential{background:transparent;color:#F0F4FF;border:1px solid rgba(255,255,255,0.25)}' +
    '.vtx-c-essential:hover{border-color:#E87722;color:#E87722}' +
    '.vtx-c-prefs{background:none;border:none;color:#8FA0C0;text-decoration:underline;cursor:pointer;' +
    'font-family:inherit;font-size:0.75rem;padding:10px 4px}' +
    '#vtx-c-panel{display:none;border-top:1px solid rgba(255,255,255,0.1);margin-top:14px;padding-top:14px}' +
    '#vtx-c-panel.open{display:block}' +
    '.vtx-c-opt{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}' +
    '.vtx-c-opt input{margin-top:3px;accent-color:#E87722;width:16px;height:16px}' +
    '.vtx-c-opt b{display:block;font-size:0.8rem}' +
    '.vtx-c-opt span{font-size:0.72rem;color:#8FA0C0}' +
    '#vtx-consent:focus-visible,.vtx-c-btn:focus-visible{outline:2px solid #E87722;outline-offset:2px}' +
    '@media(max-width:600px){#vtx-consent{left:10px;right:10px;bottom:10px;padding:16px}}';

  function buildBanner() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.id = 'vtx-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Preferências de cookies');
    el.innerHTML =
      '<p>Usamos cookies para analisar o uso do site e medir nossas campanhas. ' +
      'Você escolhe: nada além do essencial roda sem a sua permissão. ' +
      '<a href="/privacidade">Política de Privacidade</a></p>' +
      '<div class="vtx-c-row">' +
        '<button type="button" class="vtx-c-btn vtx-c-accept" id="vtx-c-accept">ACEITAR TUDO</button>' +
        '<button type="button" class="vtx-c-btn vtx-c-essential" id="vtx-c-essential">SOMENTE ESSENCIAIS</button>' +
        '<button type="button" class="vtx-c-prefs" id="vtx-c-toggle">Preferências</button>' +
      '</div>' +
      '<div id="vtx-c-panel">' +
        '<label class="vtx-c-opt"><input type="checkbox" checked disabled />' +
          '<span><b>Essenciais</b><span>Funcionamento do site e registro desta escolha. Sempre ativos.</span></span></label>' +
        '<label class="vtx-c-opt"><input type="checkbox" id="vtx-c-analytics" />' +
          '<span><b>Análise</b><span>Google Analytics — páginas visitadas, origem da visita. Sem identificação pessoal.</span></span></label>' +
        '<label class="vtx-c-opt"><input type="checkbox" id="vtx-c-ads" />' +
          '<span><b>Publicidade</b><span>Google Ads e Meta — mede conversões e permite anúncios relevantes.</span></span></label>' +
        '<button type="button" class="vtx-c-btn vtx-c-accept" id="vtx-c-save">SALVAR PREFERÊNCIAS</button>' +
      '</div>';
    document.body.appendChild(el);

    function close() { el.remove(); }
    function decide(analytics, ads) {
      store(analytics, ads);
      applyConsent(analytics, ads, true);
      close();
    }

    document.getElementById('vtx-c-accept').addEventListener('click', function () { decide(true, true); });
    document.getElementById('vtx-c-essential').addEventListener('click', function () { decide(false, false); });
    document.getElementById('vtx-c-toggle').addEventListener('click', function () {
      document.getElementById('vtx-c-panel').classList.toggle('open');
    });
    document.getElementById('vtx-c-save').addEventListener('click', function () {
      decide(
        document.getElementById('vtx-c-analytics').checked,
        document.getElementById('vtx-c-ads').checked
      );
    });
    document.getElementById('vtx-c-accept').focus({ preventScroll: true });
  }

  /* Reabrir via link "Preferências de cookies" no footer */
  window.vortexConsent = {
    open: function () {
      var existing = document.getElementById('vtx-consent');
      if (existing) existing.remove();
      buildBanner();
      var s = readStored();
      if (s) {
        document.getElementById('vtx-c-panel').classList.add('open');
        document.getElementById('vtx-c-analytics').checked = !!s.analytics;
        document.getElementById('vtx-c-ads').checked = !!s.ads;
      }
    }
  };

  function init() {
    var stored = readStored();
    if (stored) {
      // Já decidiu: aplica silenciosamente (sem evento — o GTM lê o estado no load)
      applyConsent(!!stored.analytics, !!stored.ads, false);
    } else {
      buildBanner();
    }
    // Liga qualquer link/botão [data-consent-prefs] à reabertura
    document.querySelectorAll('[data-consent-prefs]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); window.vortexConsent.open(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
