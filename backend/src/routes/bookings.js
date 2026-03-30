const express = require('express');
const { randomUUID } = require('crypto');
const { query } = require('../db');
const { requireAuth } = require('../auth');
const { bookingSchema, validate } = require('../validate');

const router = express.Router();

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

router.post('/', async (req, res) => {
  const parsed = validate(bookingSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const payload = parsed.data;
  const user = await requireAuth(req, res);
  if (!user) return;
  const required = ['fullName', 'email', 'serviceType', 'date', 'total', 'deposit'];
  const missing = required.filter((k) => (
    payload[k] === undefined ||
    payload[k] === null ||
    (typeof payload[k] === 'string' && payload[k].trim() === '')
  ));
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

  const id = randomUUID();
  const orderId = randomUUID();
  try {
    console.log('[bookings] insert booking start', { id, email: payload.email });
    await withTimeout(
      query(
      `INSERT INTO bookings
      (id, user_id, full_name, email, phone, service_type, product_selection, cleaning_level, service_size, property_type, bedrooms, bathrooms, size_sqft, date, time, instructions, add_ons, total_cents, deposit_cents, balance_cents, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        user.id,
        payload.fullName,
        payload.email,
        payload.phone || null,
        payload.serviceType,
        JSON.stringify(payload.productSelection || []),
        payload.cleaningLevel || null,
        payload.serviceSize || null,
        payload.propertyType || null,
        payload.bedrooms || 0,
        payload.bathrooms || 0,
        payload.sizeSqft || null,
        payload.date,
        payload.time || null,
        payload.instructions || null,
        JSON.stringify(payload.addOns || []),
        Math.round(Number(payload.total) * 100),
        Math.round(Number(payload.deposit) * 100),
        Math.round(Number(payload.balance || 0) * 100),
        payload.status || 'pending_deposit'
      ]
      ),
      6000,
      'insert booking'
    );
    console.log('[bookings] insert booking ok', { id });

    // also record an order linked to this booking
    console.log('[bookings] insert order start', { orderId, bookingId: id });
    await withTimeout(
      query(
      `INSERT INTO orders (id, booking_id, user_id, items, total_cents, deposit_cents, balance_cents, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        orderId,
        id,
        payload.userId || null,
        JSON.stringify(payload.productSelection || []),
        Math.round(Number(payload.total) * 100),
        Math.round(Number(payload.deposit || 0) * 100),
        Math.round(Number(payload.balance || 0) * 100),
        'pending_payment'
      ]
      ),
      6000,
      'insert booking order'
    );
    console.log('[bookings] insert order ok', { orderId });
    return res.status(201).json({ bookingId: id });
  } catch (e) {
    console.error('[bookings] failed', e);
    if (String(e?.message || '').includes('Timeout')) {
      return res.status(504).json({ error: 'Booking timed out. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to save booking' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { email, userId } = req.query;
    const user = await requireAuth(req, res);
    if (!user) return;
    const isAdmin = user.role === 'admin';

    let sql = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (isAdmin) {
      if (email) { sql += ' AND email = ?'; params.push(email); }
      if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    } else {
      sql += ' AND user_id = ?';
      params.push(user.id);
    }

    const rows = await query(sql, params);
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load bookings' });
  }
});

module.exports = router;
