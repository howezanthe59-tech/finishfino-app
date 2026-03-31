const express = require('express');
const { randomUUID } = require('crypto');
const { query } = require('../db');
const { requireAuth } = require('../auth');
const { orderSchema, validate } = require('../validate');

const router = express.Router();

const PAYPAL_CLIENT_ID = String(process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
const PAYPAL_MODE = String(process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();
const PAYPAL_API_BASE = String(
  process.env.PAYPAL_API_BASE || (PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')
).trim().replace(/\/+$/, '');
const PAYPAL_WEBHOOK_ID = String(process.env.PAYPAL_WEBHOOK_ID || '').trim();
const PAYPAL_CURRENCY = String(process.env.PAYPAL_CURRENCY || 'USD').trim().toUpperCase() || 'USD';
const PAYPAL_FETCH_TIMEOUT_MS = parsePositiveInt(process.env.PAYPAL_FETCH_TIMEOUT_MS, 15000);
const PAYPAL_FETCH_RETRIES = parsePositiveInt(process.env.PAYPAL_FETCH_RETRIES, 2);
const PAYPAL_NETWORK_ERROR_MESSAGE = 'Unable to reach PayPal right now. Please try again.';
const RETRYABLE_NETWORK_CODES = new Set([
  'ABORT_ERR',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT'
]);

function ensurePayPalCredentials() {
  return !!PAYPAL_CLIENT_ID && !!PAYPAL_CLIENT_SECRET;
}

function parsePositiveInt(value, fallback = 1) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function toPositiveInt(value, fallback = 1) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function centsToPayPalValue(cents) {
  return (Math.max(0, Number(cents) || 0) / 100).toFixed(2);
}

function payPalValueToCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getNetworkErrorCode(err) {
  const directCode = String(err?.code || '').trim().toUpperCase();
  if (directCode) return directCode;
  const causeCode = String(err?.cause?.code || '').trim().toUpperCase();
  if (causeCode) return causeCode;
  if (String(err?.name || '') === 'AbortError') return 'ABORT_ERR';
  return '';
}

function isRetryableNetworkError(err) {
  const code = getNetworkErrorCode(err);
  if (code && RETRYABLE_NETWORK_CODES.has(code)) return true;

  const message = String(err?.message || '').toLowerCase();
  return message.includes('fetch failed') || message.includes('network');
}

function toNetworkError(err) {
  const wrapped = new Error(PAYPAL_NETWORK_ERROR_MESSAGE, { cause: err });
  wrapped.status = 503;
  wrapped.code = getNetworkErrorCode(err);
  wrapped.network = true;
  return wrapped;
}

async function fetchWithTimeoutAndRetry(url, options = {}) {
  const retries = parsePositiveInt(options.retries, PAYPAL_FETCH_RETRIES + 1) - 1;
  const timeoutMs = parsePositiveInt(options.timeoutMs, PAYPAL_FETCH_TIMEOUT_MS);
  const init = { ...options };
  delete init.retries;
  delete init.timeoutMs;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal
      });
    } catch (err) {
      const canRetry = attempt < retries && isRetryableNetworkError(err);
      if (!canRetry) {
        throw toNetworkError(err);
      }
      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw toNetworkError(new Error('PayPal request did not complete.'));
}

async function readJsonBody(res) {
  const text = await res.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetchWithTimeoutAndRetry(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const payload = await readJsonBody(res);
  if (!res.ok || !payload?.access_token) {
    const detail = payload?.error_description || payload?.error || 'Failed to authenticate with PayPal.';
    const err = new Error(detail);
    err.status = 502;
    throw err;
  }
  return payload.access_token;
}

async function paypalRequest(path, token, options = {}) {
  const { method = 'GET', body } = options;
  const res = await fetchWithTimeoutAndRetry(`${PAYPAL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await readJsonBody(res);
  if (!res.ok) {
    const detail = payload?.details?.[0]?.description
      || payload?.message
      || payload?.name
      || 'PayPal API request failed.';
    const err = new Error(detail);
    err.status = res.status >= 400 && res.status < 500 ? res.status : 502;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function loadProductCatalog(rawItems) {
  const ids = [...new Set(
    (rawItems || [])
      .map((item) => normalizeString(item?.id))
      .filter(Boolean)
  )];

  const names = [...new Set(
    (rawItems || [])
      .map((item) => normalizeString(item?.name).toLowerCase())
      .filter(Boolean)
  )];

  const clauses = [];
  const params = [];

  if (ids.length) {
    clauses.push(`id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }

  if (names.length) {
    clauses.push(`LOWER(name) IN (${names.map(() => '?').join(',')})`);
    params.push(...names);
  }

  if (!clauses.length) return [];

  return query(
    `SELECT id, name, price_cents, status
       FROM products
      WHERE ${clauses.join(' OR ')}`,
    params
  );
}

async function buildTrustedItems(rawItems) {
  const products = await loadProductCatalog(rawItems);
  const byId = new Map(products.map((p) => [String(p.id), p]));
  const byName = new Map(products.map((p) => [String(p.name || '').trim().toLowerCase(), p]));

  const trusted = [];
  for (const item of rawItems) {
    const requestedId = normalizeString(item?.id);
    const requestedName = normalizeString(item?.name).toLowerCase();
    const quantity = toPositiveInt(item?.quantity, 1);

    const product = (requestedId && byId.get(requestedId)) || (requestedName && byName.get(requestedName));
    if (!product) {
      return { ok: false, error: `Invalid product in cart: ${requestedId || requestedName || 'unknown'}` };
    }

    const status = String(product.status || '').trim().toLowerCase();
    if (status === 'out_of_stock') {
      return { ok: false, error: `Product out of stock: ${product.name}` };
    }

    const unitPriceCents = Math.max(0, Math.round(Number(product.price_cents) || 0));
    trusted.push({
      id: String(product.id),
      name: String(product.name || '').trim() || 'Unnamed Product',
      quantity,
      unitPriceCents
    });
  }

  return { ok: true, items: trusted };
}

async function insertOrderItem(orderId, productName, quantity, unitPriceCents) {
  const name = String(productName || '').trim() || 'Unnamed Product';
  const qty = Math.max(1, Number(quantity) || 1);
  const price = Math.max(0, Math.round(Number(unitPriceCents) || 0));

  const attempts = [
    {
      sql: `INSERT INTO order_items (order_id, product_name, quantity, price_cents)
            VALUES (?,?,?,?)`,
      params: [orderId, name, qty, price]
    },
    {
      sql: `INSERT INTO order_items (order_id, product_name, quantity, price)
            VALUES (?,?,?,?)`,
      params: [orderId, name, qty, price]
    },
    {
      sql: `INSERT INTO order_items (id, order_id, product_name, quantity, price_cents)
            VALUES (?,?,?,?,?)`,
      params: [randomUUID(), orderId, name, qty, price]
    },
    {
      sql: `INSERT INTO order_items (id, order_id, product_name, quantity, price)
            VALUES (?,?,?,?,?)`,
      params: [randomUUID(), orderId, name, qty, price]
    }
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      await query(attempt.sql, attempt.params);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Failed to insert order item');
}

function parseOrderPayload(rawPayload) {
  const augmented = {
    ...(rawPayload || {}),
    payment: { accountType: 'paypal', accountLast4: '0000' }
  };
  return validate(orderSchema, augmented);
}

router.get('/config', (_req, res) => {
  if (!ensurePayPalCredentials()) {
    return res.status(503).json({ error: 'PayPal is not configured on the server.' });
  }
  return res.json({
    clientId: PAYPAL_CLIENT_ID,
    currency: PAYPAL_CURRENCY,
    intent: 'CAPTURE'
  });
});

router.post('/orders', async (req, res) => {
  if (!ensurePayPalCredentials()) {
    return res.status(503).json({ error: 'PayPal is not configured on the server.' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const parsed = parseOrderPayload(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { items = [] } = parsed.data;

  const trusted = await buildTrustedItems(items);
  if (!trusted.ok) return res.status(400).json({ error: trusted.error });

  const trustedItems = trusted.items;
  const totalCents = trustedItems.reduce((sum, item) => sum + (item.unitPriceCents * item.quantity), 0);
  if (totalCents <= 0) return res.status(400).json({ error: 'Order total must be greater than zero.' });

  try {
    const accessToken = await getPayPalAccessToken();
    const paypalOrder = await paypalRequest('/v2/checkout/orders', accessToken, {
      method: 'POST',
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: PAYPAL_CURRENCY,
              value: centsToPayPalValue(totalCents)
            },
            custom_id: user.id
          }
        ]
      }
    });

    if (!paypalOrder?.id) {
      return res.status(502).json({ error: 'PayPal order creation failed.' });
    }

    return res.status(201).json({
      paypalOrderId: paypalOrder.id
    });
  } catch (err) {
    console.error('PayPal create order failed', {
      message: err?.message,
      status: err?.status,
      code: err?.code || err?.cause?.code,
      payload: err?.payload
    });
    const status = Number(err?.status) || 502;
    return res.status(status).json({ error: err?.message || 'Failed to create PayPal order.' });
  }
});

router.post('/orders/:paypalOrderId/capture', async (req, res) => {
  if (!ensurePayPalCredentials()) {
    return res.status(503).json({ error: 'PayPal is not configured on the server.' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const paypalOrderId = String(req.params.paypalOrderId || '').trim();
  if (!paypalOrderId) return res.status(400).json({ error: 'PayPal order id is required.' });

  const parsed = parseOrderPayload(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { items = [] } = parsed.data;

  const trusted = await buildTrustedItems(items);
  if (!trusted.ok) return res.status(400).json({ error: trusted.error });

  const trustedItems = trusted.items;
  const totalCents = trustedItems.reduce((sum, item) => sum + (item.unitPriceCents * item.quantity), 0);
  if (totalCents <= 0) return res.status(400).json({ error: 'Order total must be greater than zero.' });

  try {
    const accessToken = await getPayPalAccessToken();
    const capturePayload = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, accessToken, {
      method: 'POST',
      body: {}
    });

    const purchaseUnit = capturePayload?.purchase_units?.[0] || {};
    const capture = purchaseUnit?.payments?.captures?.[0] || {};
    const captureStatus = String(capture?.status || '').toUpperCase();
    const captureId = String(capture?.id || '').trim();
    const captureCurrency = String(capture?.amount?.currency_code || '').toUpperCase();
    const captureAmountCents = payPalValueToCents(capture?.amount?.value);

    if (captureStatus !== 'COMPLETED' || !captureId) {
      return res.status(400).json({ error: 'PayPal payment was not completed.' });
    }

    if (captureCurrency !== PAYPAL_CURRENCY || captureAmountCents == null || captureAmountCents !== totalCents) {
      return res.status(400).json({ error: 'Captured PayPal amount does not match the trusted cart total.' });
    }

    const existing = await query(
      `SELECT id
         FROM orders
        WHERE paypal_order_id = ?
           OR paypal_capture_id = ?
        LIMIT 1`,
      [paypalOrderId, captureId]
    );
    if (existing.length) {
      return res.json({
        orderId: existing[0].id,
        paypalOrderId,
        paypalCaptureId: captureId,
        alreadyCaptured: true
      });
    }

    const localOrderId = randomUUID();
    const itemsForJson = trustedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number((item.unitPriceCents / 100).toFixed(2))
    }));

    await query(
      `INSERT INTO orders (
         id, user_id, items, total_cents, deposit_cents, balance_cents,
         payment_provider, payment_account_type, payment_account_last4,
         paypal_order_id, paypal_capture_id, status
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localOrderId,
        user.id,
        JSON.stringify(itemsForJson),
        totalCents,
        0,
        0,
        'paypal',
        'paypal',
        null,
        paypalOrderId,
        captureId,
        'paid'
      ]
    );

    for (const item of trustedItems) {
      await insertOrderItem(localOrderId, item.name, item.quantity, item.unitPriceCents);
    }

    try {
      await query(
        `INSERT INTO points (user_id, points)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE points = points + 1, last_updated = CURRENT_TIMESTAMP`,
        [user.id]
      );
    } catch (pointsErr) {
      console.error('Points update failed after PayPal capture', pointsErr);
    }

    return res.status(201).json({
      orderId: localOrderId,
      paypalOrderId,
      paypalCaptureId: captureId,
      totals: {
        total: Number((totalCents / 100).toFixed(2)),
        deposit: 0,
        balance: 0
      }
    });
  } catch (err) {
    console.error('PayPal capture failed', {
      message: err?.message,
      status: err?.status,
      code: err?.code || err?.cause?.code,
      payload: err?.payload
    });
    const status = Number(err?.status) || 502;
    return res.status(status).json({ error: err?.message || 'Failed to capture PayPal order.' });
  }
});

router.post('/webhook', async (req, res) => {
  if (!ensurePayPalCredentials()) {
    return res.status(503).json({ error: 'PayPal is not configured on the server.' });
  }
  if (!PAYPAL_WEBHOOK_ID) {
    return res.status(503).json({ error: 'PAYPAL_WEBHOOK_ID is not configured.' });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyPayload = {
      auth_algo: req.get('paypal-auth-algo'),
      cert_url: req.get('paypal-cert-url'),
      transmission_id: req.get('paypal-transmission-id'),
      transmission_sig: req.get('paypal-transmission-sig'),
      transmission_time: req.get('paypal-transmission-time'),
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: req.body
    };

    const verification = await paypalRequest('/v1/notifications/verify-webhook-signature', accessToken, {
      method: 'POST',
      body: verifyPayload
    });

    if (String(verification?.verification_status || '').toUpperCase() !== 'SUCCESS') {
      return res.status(400).json({ error: 'Invalid PayPal webhook signature.' });
    }

    const eventType = String(req.body?.event_type || '').toUpperCase();
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const captureId = String(req.body?.resource?.id || '').trim();
      if (captureId) {
        await query('UPDATE orders SET status = ? WHERE paypal_capture_id = ?', ['paid', captureId]);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('PayPal webhook handling failed', {
      message: err?.message,
      status: err?.status,
      code: err?.code || err?.cause?.code,
      payload: err?.payload
    });
    return res.status(500).json({ error: 'Failed to process PayPal webhook.' });
  }
});

module.exports = router;
