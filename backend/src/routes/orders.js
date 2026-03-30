const express = require('express');
const { randomUUID } = require('crypto');
const { query } = require('../db');
const { requireAuth } = require('../auth');
const { orderSchema, validate } = require('../validate');

const router = express.Router();

router.post('/', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const parsed = validate(orderSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { items = [], totals = {}, customer = {} } = parsed.data;

  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty.' });
  if (!totals.total) return res.status(400).json({ error: 'Missing total.' });

  const id = randomUUID();
  try {
    await query(
      `INSERT INTO orders (id, user_id, items, total_cents, deposit_cents, balance_cents, status)
       VALUES (?,?,?,?,?,?,?)`,
      [
        id,
        user.id,
        JSON.stringify(items),
        Math.round(Number(totals.total) * 100),
        Math.round(Number(totals.deposit || 0) * 100),
        Math.round(Number(totals.balance || 0) * 100),
        'pending_payment'
      ]
    );
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
    return res.status(201).json({ orderId: id });
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

    let sql = 'SELECT * FROM orders';
    const params = [];
    if (isAdmin && userId) {
      sql += ' WHERE user_id = ?';
      params.push(userId);
    } else if (!isAdmin) {
      sql += ' WHERE user_id = ?';
      params.push(user.id);
    }

    const rows = await query(sql, params);
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load orders' });
  }
});

module.exports = router;
