const express = require('express');
const { query } = require('../db');

const router = express.Router();

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

// Public catalog endpoint used by the Products page.
router.get('/', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features, created_at
       FROM products
       ORDER BY created_at DESC`
    );

    const normalized = rows.map((r) => ({
      ...r,
      features: Array.isArray(r.features) ? r.features : (safeJsonParse(r.features, []) || []),
      additional_images: Array.isArray(r.additional_images) ? r.additional_images : (safeJsonParse(r.additional_images, []) || [])
    }));

    return res.json(normalized);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load products.' });
  }
});

module.exports = router;
