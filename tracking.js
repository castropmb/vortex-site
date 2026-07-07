/* VORTEX — Data Layer + eventos client-side
   Carrega em todas as páginas (após consent.js e gtm.js).
   Empurra contexto global + eventos de engajamento para o dataLayer,
   consumidos pelo GTM (GA4, Google Ads, Meta Pixel). */
(function () {
  'use strict';
  var dl = (window.dataLayer = window.dataLayer || []);
  function push(obj) { dl.push(obj); }

  /* ── UUID para event_id (deduplicação Pixel + CAPI na etapa 6) ── */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /* ── Contexto de página ── */
  var path = location.pathname.replace(/\/index\.html$/, '/');
  var CATEGORY_BY_SLUG = {
    'nr-36-nova-portaria-rfid': 'NR-36',
    'custo-acao-trabalhista-camara-fria': 'Jurídico',
    'rfid-passivo-camaras-frias': 'RFID',
    '12-minutos-custo-produtividade-frigorifico': 'Gestão'
  };
  var pageType = 'other', articleSlug = null, articleCategory = null;
  if (path === '/' ) pageType = 'landing';
  else if (path === '/blog' || path === '/blog/') pageType = 'blog_index';
  else if (path.indexOf('/blog/') === 0) {
    pageType = 'blog_article';
    articleSlug = path.replace('/blog/', '').replace(/\/$/, '');
    articleCategory = CATEGORY_BY_SLUG[articleSlug] || null;
  }

  /* ── Aquisição: capturada 1x por sessão (first-touch) ── */
  function getTraffic() {
    try {
      var saved = sessionStorage.getItem('vortex_traffic');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    var q = new URLSearchParams(location.search);
    var t = {
      utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'),
      utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'),
      utm_term: q.get('utm_term'),
      gclid: q.get('gclid'), fbclid: q.get('fbclid'),
      referrer: document.referrer || null,
      landing_page: path,
      first_visit: new Date().toISOString()
    };
    try { sessionStorage.setItem('vortex_traffic', JSON.stringify(t)); } catch (e) {}
    return t;
  }
  var traffic = getTraffic();

  function userStatus() {
    try { return localStorage.getItem('vortex_lead') === '1' ? 'lead' : 'anonymous'; }
    catch (e) { return 'anonymous'; }
  }

  /* Contexto global — sem 'event', vira variável lida pelas tags */
  push({
    page_type: pageType,
    article_slug: articleSlug,
    article_category: articleCategory,
    user_status: userStatus(),
    traffic: traffic
  });

  /* ── API pública para os scripts inline (submitForm, updateROI) ── */
  window.vtxTrack = {
    push: push,
    uuid: uuid,
    traffic: traffic,
    markLead: function () { try { localStorage.setItem('vortex_lead', '1'); } catch (e) {} },
    roiCalculate: function (res, n, preset) {
      push({
        event: 'roi_calculate',
        employees: n,
        monthly_fee_estimated: res.mensalidadeMensal,
        annual_net_benefit: res.netAnual,
        cost_benefit_ratio: res.ratio,
        preset_used: preset || 'custom'
      });
    }
  };

  /* ── Setup dependente do DOM ── */
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    /* section_view — cada seção 50% visível, 1x */
    var SECTIONS = ['inicio', 'video', 'como-funciona', 'funcionalidades', 'roi', 'resultados', 'blog', 'faq', 'demo'];
    if ('IntersectionObserver' in window) {
      var seen = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !seen[e.target.id]) {
            seen[e.target.id] = 1;
            push({ event: 'section_view', section_id: e.target.id });
          }
        });
      }, { threshold: 0.5 });
      SECTIONS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) io.observe(el);
      });
    }

    /* Delegação global de cliques */
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest('a, button');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var text = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      var cls = a.className || '';

      // WhatsApp
      if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp') !== -1) {
        push({ event: 'contact_whatsapp', page_section: currentSection() });
        return;
      }
      // Telefone / e-mail
      if (href.indexOf('tel:') === 0) { push({ event: 'contact_phone' }); return; }
      if (href.indexOf('mailto:') === 0) { push({ event: 'contact_email' }); return; }
      // FAQ
      if (a.classList && a.classList.contains('faq-q')) {
        push({ event: 'faq_open', faq_question: text.replace(/[+\-]$/, '').trim() });
        return;
      }
      // CTAs de conversão
      if (/\b(btn-primary|nav-cta|mob-cta|btn-ghost)\b/.test(cls)) {
        push({ event: 'cta_click', cta_id: ctaId(href, cls), cta_text: text });
        return;
      }
      // Blog: cards de curadoria externa / links externos em nova aba
      if (a.tagName === 'A' && a.target === '_blank' && /^https?:/.test(href) &&
          href.indexOf(location.host) === -1 && href.indexOf('wa.me') === -1) {
        var domain = href.replace(/^https?:\/\//, '').split('/')[0];
        push({ event: 'outbound_click', link_domain: domain, link_url: href });
      }
    }, true);

    function ctaId(href, cls) {
      if (cls.indexOf('nav-cta') !== -1) return 'nav';
      if (cls.indexOf('mob-cta') !== -1) return 'mob';
      if (href.indexOf('#video') !== -1) return 'hero-video';
      if (href.indexOf('/blog') !== -1) return 'blog-todos';
      if (href.indexOf('#demo') !== -1) return 'demo';
      return 'outro';
    }

    /* Seção visível atual (p/ contexto do WhatsApp) */
    function currentSection() {
      var best = null, bestTop = Infinity;
      ['demo', 'roi', 'resultados', 'funcionalidades', 'como-funciona', 'video', 'inicio'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (r.top <= window.innerHeight / 2 && r.bottom >= 0 && r.top < bestTop) { bestTop = r.top; best = id; }
      });
      return best || pageType;
    }
    window.__vtxCurrentSection = currentSection;

    /* form_start — primeiro foco em qualquer campo do formulário */
    var form = document.getElementById('leadForm');
    if (form) {
      var started = false;
      form.addEventListener('focusin', function () {
        if (started) return;
        started = true;
        push({ event: 'form_start', form_id: 'leadForm' });
      });
    }

    /* article_read — artigo lido de fato (scroll 75% + 45s) */
    if (pageType === 'blog_article') {
      push({ event: 'article_view', article_slug: articleSlug, article_category: articleCategory });
      var deepScroll = false, longEnough = false, fired = false, t0 = Date.now();
      function maybeRead() {
        if (fired || !deepScroll || !longEnough) return;
        fired = true;
        push({ event: 'article_read', article_slug: articleSlug, article_category: articleCategory });
      }
      window.addEventListener('scroll', function () {
        var h = document.documentElement;
        var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight;
        if (pct >= 0.75) { deepScroll = true; maybeRead(); }
      }, { passive: true });
      setTimeout(function () { longEnough = true; maybeRead(); }, 45000);
    }
  });
})();
