const express = require('express');
const { query } = require('../db');

const router = express.Router();
const LEGACY_IMAGE_MAP = {
  'soap.jpeg': 'assets/images/soap.webp',
  'bleach.jpeg': 'assets/images/bleach.webp',
  'cloth.jpeg': 'assets/images/cloth.webp',
  'multi surface.jpeg': 'assets/images/multi surface.webp',
  'citrus blast.jpeg': 'assets/images/citrus blast.webp',
  'home spray.jpeg': 'assets/images/home spray.webp',
  'lavender dreams.jpeg': 'assets/images/lavender dreams.webp',
  'glass cleaner.jpeg': 'assets/images/Glass cleaner.webp',
  'disinnfectant .jpeg': 'assets/images/disinfectant.webp',
  'home-bundle.jpeg': 'assets/images/home.webp',
  'commercial-bundle.jpeg': 'assets/images/commerc.webp',
  'fresh-space-bundle.jpeg': 'assets/images/resi.webp',
  'assets/images/soap.jpeg': 'assets/images/soap.webp',
  'assets/images/bleach.jpeg': 'assets/images/bleach.webp',
  'assets/images/cloth.jpeg': 'assets/images/cloth.webp',
  'assets/images/multi surface.jpeg': 'assets/images/multi surface.webp',
  'assets/images/citrus blast.jpeg': 'assets/images/citrus blast.webp',
  'assets/images/home spray.jpeg': 'assets/images/home spray.webp',
  'assets/images/lavender dreams.jpeg': 'assets/images/lavender dreams.webp',
  'assets/images/glass cleaner.jpeg': 'assets/images/Glass cleaner.webp',
  'assets/images/disinnfectant .jpeg': 'assets/images/disinfectant.webp',
  'assets/images/home-bundle.jpeg': 'assets/images/home.webp',
  'assets/images/commercial-bundle.jpeg': 'assets/images/commerc.webp',
  'assets/images/fresh-space-bundle.jpeg': 'assets/images/resi.webp',
  'assets/images/home-bundle.webp': 'assets/images/home.webp',
  'assets/images/commercial-bundle.webp': 'assets/images/commerc.webp',
  'assets/images/fresh-space-bundle.webp': 'assets/images/resi.webp'
};

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function normalizeImagePath(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return raw;

  const mapped = LEGACY_IMAGE_MAP[raw.toLowerCase()];
  if (mapped) return mapped;

  // Generic migration path: convert legacy jpg/jpeg extension to webp.
  return raw.replace(/\.jpe?g(\?.*)?$/i, '.webp$1');
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
      image_url: normalizeImagePath(r.image_url),
      features: Array.isArray(r.features) ? r.features : (safeJsonParse(r.features, []) || []),
      additional_images: (Array.isArray(r.additional_images) ? r.additional_images : (safeJsonParse(r.additional_images, []) || []))
        .map((url) => normalizeImagePath(url))
    }));

    return res.json(normalized);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load products.' });
  }
});

module.exports = router;
