// Vercel serverless function — recebe leads do site vortexid.com.br
// e encaminha para o Datacrazy CRM + Meta Conversions API (server-side).
// Env vars necessárias (Vercel dashboard → Settings → Environment Variables):
//   DATACRAZY_WEBHOOK — URL do webhook do CRM
//   META_CAPI_TOKEN   — Access token gerado no Events Manager
//   META_TEST_CODE    — (opcional) código de teste do Events Manager
'use strict';

const crypto = require('crypto');

const PIXEL_ID = '1348559673368085';
const SITE_URL = 'https://vortexid.com.br';

function sha256(str) {
  return crypto.createHash('sha256').update((str || '').trim().toLowerCase()).digest('hex');
}

function normalizePhone(phone) {
  const d = (phone || '').replace(/\D/g, '');
  return d.startsWith('55') ? d : '55' + d;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', SITE_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // Honeypot — bots preenchem este campo oculto
  if (body._hp) return res.status(200).json({ ok: true });

  // Campos obrigatórios
  const email = (body.email || '').trim();
  const phone = (body.telefone || body.whatsapp || '').trim();
  const nome  = (body.nome || '').trim();
  if (!nome || !email || !phone) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ua = req.headers['user-agent'] || '';

  const [, capiResult] = await Promise.allSettled([
    sendToDatacrazy(body),
    sendToCAPI({ nome, email, phone, body, ip, ua }),
  ]);

  if (capiResult.status === 'rejected') {
    console.error('[VORTEX CAPI]', capiResult.reason?.message || capiResult.reason);
  }

  return res.status(200).json({ ok: true });
};

async function sendToDatacrazy(data) {
  const url = process.env.DATACRAZY_WEBHOOK;
  if (!url) return;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) console.error('[VORTEX Datacrazy]', r.status, await r.text());
}

async function sendToCAPI({ nome, email, phone, body, ip, ua }) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;

  // fbc: cookie enviado pelo cliente ou derivado do fbclid
  const fbc = body.fbc || (body.fbclid
    ? `fb.1.${Math.floor(Date.now() / 1000)}.${body.fbclid}`
    : undefined);

  const userData = {
    em: [sha256(email)],
    ph: [sha256(normalizePhone(phone))],
    fn: [sha256(nome)],
    client_ip_address: ip || undefined,
    client_user_agent: ua || undefined,
    fbp: body.fbp || undefined,
    fbc: fbc || undefined,
  };

  // Remove campos undefined para não poluir o payload
  Object.keys(userData).forEach(k => userData[k] === undefined && delete userData[k]);

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id || undefined,
      event_source_url: body.pagina || SITE_URL,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        value: body.lead_value || 150,
        currency: 'BRL',
        lead_source: body.fonte || 'site',
      },
    }],
  };

  if (process.env.META_TEST_CODE) {
    payload.test_event_code = process.env.META_TEST_CODE;
  }

  const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${token}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) throw new Error(`CAPI ${r.status}: ${await r.text()}`);
  return r.json();
}
