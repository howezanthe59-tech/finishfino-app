const express = require('express');
const { randomUUID } = require('crypto');
const { query } = require('../db');
const { requireAuth } = require('../auth');
const { orderSchema, validate } = require('../validate');

const router = express.Router();

function toPositiveInt(value, fallback = 1) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function normalizeString(value) {
  return String(value || '').trim();
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

async function resolveOrderStatusExpr() {
  const columns = await query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME IN ('payment_status', 'status')`
  );

  const names = new Set(columns.map((c) => c.COLUMN_NAME));
  if (names.has('payment_status') && names.has('status')) return 'COALESCE(o.payment_status, o.status)';
  if (names.has('payment_status')) return 'o.payment_status';
  if (names.has('status')) return 'o.status';
  return "'pending'";
}

async function resolveStatusColumns() {
  const columns = await query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME IN ('payment_status', 'status')`
  );
  const names = new Set(columns.map((c) => c.COLUMN_NAME));
  const orderStatusExpr = names.has('status')
    ? 'o.status'
    : names.has('payment_status')
      ? 'o.payment_status'
      : "'pending'";
  const paymentStatusExpr = names.has('payment_status')
    ? 'o.payment_status'
    : names.has('status')
      ? 'o.status'
      : "'pending'";
  return { orderStatusExpr, paymentStatusExpr };
}

router.post('/', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const parsed = validate(orderSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { items = [], payment = {} } = parsed.data;

  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty.' });

  const trusted = await buildTrustedItems(items);
  if (!trusted.ok) return res.status(400).json({ error: trusted.error });

  const trustedItems = trusted.items;
  const totalCents = trustedItems.reduce((sum, item) => sum + (item.unitPriceCents * item.quantity), 0);
  if (totalCents <= 0) return res.status(400).json({ error: 'Order total must be greater than zero.' });

  const id = randomUUID();
  try {
    const itemsForJson = trustedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number((item.unitPriceCents / 100).toFixed(2))
    }));

    await query(
      `INSERT INTO orders (id, user_id, items, total_cents, deposit_cents, balance_cents, payment_provider, status, payment_account_type, payment_account_last4, paypal_order_id, paypal_capture_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        user.id,
        JSON.stringify(itemsForJson),
        totalCents,
        0,
        0,
        'manual',
        'pending_payment',
        String(payment.accountType || '').trim().toLowerCase() || null,
        String(payment.accountLast4 || '').replace(/\D/g, '').slice(-4) || null,
        null,
        null
      ]
    );

    for (const item of trustedItems) {
      await insertOrderItem(id, item.name, item.quantity, item.unitPriceCents);
    }

    // Award 1 loyalty point per order
    try {
      await query(
        `INSERT INTO points (user_id, points)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE points = points + 1, last_updated = CURRENT_TIMESTAMP`,
        [user.id]
      );
    } catch (err) {
      console.error('Points update failed', err);
      // Do not block order creation on points failure
    }
    return res.status(201).json({
      orderId: id,
      totals: {
        total: Number((totalCents / 100).toFixed(2)),
        deposit: 0,
        balance: 0
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to save order' });
  }
});

router.get('/', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const isAdmin = user.role === 'admin';
    const { userId } = req.query;
    const statusExpr = await resolveOrderStatusExpr();

    let sql = `
      SELECT
        o.id,
        o.user_id,
        ${statusExpr} AS payment_status,
        ${statusExpr} AS status,
        o.created_at,
        o.total_cents,
        o.deposit_cents,
        o.balance_cents,
        o.payment_account_type,
        o.payment_account_last4,
        o.payment_provider,
        o.paypal_order_id,
        o.paypal_capture_id,
        o.items,
        COALESCE(SUM(oi.quantity), 0) AS total_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;

    const params = [];
    if (isAdmin && userId) {
      sql += ' AND o.user_id = ?';
      params.push(userId);
    } else if (!isAdmin) {
      sql += ' AND o.user_id = ?';
      params.push(user.id);
    }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const rows = await query(sql, params);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const orderId = String(req.params.id || '').trim();
    if (!orderId) return res.status(400).json({ error: 'Order id is required.' });

    const isAdmin = user.role === 'admin';
    const { orderStatusExpr, paymentStatusExpr } = await resolveStatusColumns();

    let sql = `
      SELECT
        o.id AS order_id,
        o.user_id,
        ${orderStatusExpr} AS order_status,
        ${paymentStatusExpr} AS payment_status,
        o.payment_account_type,
        o.payment_account_last4,
        o.payment_provider,
        o.paypal_order_id,
        o.paypal_capture_id,
        o.created_at,
        COALESCE(SUM(oi.quantity), 0) AS total_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
    `;
    const params = [orderId];

    if (!isAdmin) {
      sql += ' AND o.user_id = ?';
      params.push(user.id);
    }

    sql += ' GROUP BY o.id LIMIT 1';

    const rows = await query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load order.' });
  }
});

module.exports = router;
