const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../auth');
const { v4: uuid } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { productUpsertSchema, validate } = require('../validate');

const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads', 'products');

// Allowed product categories (plus "Uncategorized" for items not yet assigned).
const PRODUCT_CATEGORY_OPTIONS = [
  'Soap',
  'Bleach',
  'Bundle',
  'Spray',
  'Cloth',
  'Disinfectant',
  'Glass Cleaner'
];

const ALLOWED_PRODUCT_CATEGORIES = new Set([...PRODUCT_CATEGORY_OPTIONS, 'Uncategorized']);

function normalizeCategory(raw) {
  const trimmed = coerceString(raw).trim();
  if (!trimmed) return 'Uncategorized';

  const lower = trimmed.toLowerCase();
  if (lower === 'uncategorized') return 'Uncategorized';
  if (lower === 'bundles') return 'Bundle';

  const canonical = PRODUCT_CATEGORY_OPTIONS.find((c) => c.toLowerCase() === lower);
  return canonical || trimmed;
}

function normalizeExistingCategory(raw) {
  const normalized = normalizeCategory(raw);
  return ALLOWED_PRODUCT_CATEGORIES.has(normalized) ? normalized : 'Uncategorized';
}

function isUploadsProductPath(imageUrl) {
  return typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/products/');
}

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function parseFeatures(featuresRaw) {
  if (featuresRaw == null || featuresRaw === '') return [];
  if (Array.isArray(featuresRaw)) return featuresRaw.map(String).map((s) => s.trim()).filter(Boolean);

  const parsed = safeJsonParse(featuresRaw, null);
  if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);

  return String(featuresRaw)
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePriceCents(body) {
  if (!body) return null;

  if (body.price_cents != null && body.price_cents !== '') {
    const n = Number(body.price_cents);
    if (Number.isFinite(n)) return Math.round(n);
  }

  if (body.price != null && body.price !== '') {
    const n = Number(body.price);
    if (Number.isFinite(n)) return Math.round(n * 100);
  }

  return null;
}

function parseStockQuantity(body) {
  if (!body) return null;
  if (body.stock_quantity == null || body.stock_quantity === '') return null;
  const n = Number(body.stock_quantity);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

function normalizeStatus(statusRaw, stockQuantity) {
  const normalized = String(statusRaw || '')
    .trim()
    .toLowerCase();

  if (normalized === 'in_stock' || normalized === 'in stock') return 'in_stock';
  if (normalized === 'out_of_stock' || normalized === 'out of stock') return 'out_of_stock';

  if (typeof stockQuantity === 'number') {
    return stockQuantity > 0 ? 'in_stock' : 'out_of_stock';
  }
  return 'out_of_stock';
}

function coerceString(value) {
  if (value == null) return '';
  return String(value);
}

function coerceOptionalString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeAdditionalImages(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  const parsed = safeJsonParse(value, null);
  if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  return [];
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await ensureUploadsDir();
        cb(null, UPLOADS_ROOT);
      } catch (err) {
        cb(err);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${uuid()}${safeExt}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      cb(new Error('Invalid image type. Use JPG, PNG, or WebP.'));
      return;
    }
    cb(null, true);
  }
});

router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'additional_images', maxCount: 8 }
  ]),
  async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const priceCents = parsePriceCents(req.body);
      if (priceCents == null || !Number.isFinite(priceCents)) {
        return res.status(400).json({ error: 'Price is required.' });
      }

      const stockQuantity = parseStockQuantity(req.body);
      if (stockQuantity == null || !Number.isFinite(stockQuantity)) {
        return res.status(400).json({ error: 'Stock quantity is required.' });
      }

      const files = req.files || {};
      const imageFile = Array.isArray(files.image) ? files.image[0] : null;
      const additionalFiles = Array.isArray(files.additional_images) ? files.additional_images : [];

      const imageUrl = imageFile
        ? `/uploads/products/${imageFile.filename}`
        : coerceOptionalString(req.body.image_url);

      if (!imageUrl) {
        return res.status(400).json({ error: 'Product image is required.' });
      }

      const additionalImages = additionalFiles.map((f) => `/uploads/products/${f.filename}`);

      const payload = {
        name: coerceString(req.body.name).trim(),
        description: coerceString(req.body.description).trim(),
        price_cents: priceCents,
        category: normalizeCategory(req.body.category),
        stock_quantity: stockQuantity,
        status: normalizeStatus(req.body.status, stockQuantity),
        sku: coerceOptionalString(req.body.sku),
        image_url: imageUrl,
        additional_images: additionalImages,
        badge: coerceOptionalString(req.body.badge),
        features: parseFeatures(req.body.features)
      };

      const v = validate(productUpsertSchema, payload);
      if (!v.ok) return res.status(400).json({ error: v.error });

      const id = uuid();
      await query(
        `INSERT INTO products (id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          v.data.name,
          v.data.description,
          v.data.price_cents,
          v.data.category,
          v.data.stock_quantity,
          v.data.status,
          v.data.sku || null,
          v.data.image_url || null,
          JSON.stringify(v.data.additional_images || []),
          v.data.badge || null,
          JSON.stringify(v.data.features || [])
        ]
      );

      const rows = await query(
        `SELECT id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features, created_at
         FROM products WHERE id = ? LIMIT 1`,
        [id]
      );

      const created = rows[0] || null;
      if (created) {
        created.features = Array.isArray(created.features) ? created.features : (safeJsonParse(created.features, []) || []);
        created.additional_images = Array.isArray(created.additional_images)
          ? created.additional_images
          : (safeJsonParse(created.additional_images, []) || []);
      }

      return res.status(201).json(created || { id });
    } catch (e) {
      const msg = e && e.message ? e.message : 'Failed to create product.';
      return res.status(400).json({ error: msg });
    }
  }
);

router.put(
  '/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'additional_images', maxCount: 8 }
  ]),
  async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const id = req.params.id;
      const existingRows = await query(
        'SELECT id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features FROM products WHERE id = ? LIMIT 1',
        [id]
      );
      if (!existingRows.length) return res.status(404).json({ error: 'Product not found.' });
      const existing = existingRows[0];

      const existingPriceCents = Number.isFinite(Number(existing.price_cents)) ? Number(existing.price_cents) : 0;
      const parsedPriceCents = parsePriceCents(req.body);
      const priceCents = parsedPriceCents != null && Number.isFinite(parsedPriceCents) ? parsedPriceCents : existingPriceCents;

      const existingStockQuantity =
        existing.stock_quantity != null && Number.isFinite(Number(existing.stock_quantity))
          ? Math.max(0, Math.trunc(Number(existing.stock_quantity)))
          : 0;
      const parsedStockQuantity = parseStockQuantity(req.body);
      const stockQuantity =
        parsedStockQuantity != null && Number.isFinite(parsedStockQuantity) ? parsedStockQuantity : existingStockQuantity;

      const existingAdditionalImages = normalizeAdditionalImages(existing.additional_images);
      const keepAdditionalImages = req.body.additional_images_existing != null
        ? normalizeAdditionalImages(req.body.additional_images_existing)
        : existingAdditionalImages;

      const files = req.files || {};
      const imageFile = Array.isArray(files.image) ? files.image[0] : null;
      const additionalFiles = Array.isArray(files.additional_images) ? files.additional_images : [];

      let newImageUrl = existing.image_url || null;
      if (imageFile) {
        newImageUrl = `/uploads/products/${imageFile.filename}`;
      } else if (req.body.image_url != null) {
        newImageUrl = coerceOptionalString(req.body.image_url);
      }

      const newUploadAdditionalImages = additionalFiles.map((f) => `/uploads/products/${f.filename}`);
      const mergedAdditionalImages = [...keepAdditionalImages, ...newUploadAdditionalImages];

      const nextName = req.body.name != null ? coerceString(req.body.name).trim() : coerceString(existing.name).trim();
      const nextDescription = req.body.description != null
        ? coerceString(req.body.description).trim()
        : coerceString(existing.description).trim();
      const nextCategory = req.body.category != null ? normalizeCategory(req.body.category) : normalizeExistingCategory(existing.category);
      const nextSku = req.body.sku != null ? coerceOptionalString(req.body.sku) : coerceOptionalString(existing.sku);
      const nextBadge = req.body.badge != null ? coerceOptionalString(req.body.badge) : coerceOptionalString(existing.badge);
      const nextFeatures = req.body.features != null ? parseFeatures(req.body.features) : parseFeatures(existing.features);
      const statusRaw = req.body.status != null ? req.body.status : existing.status;

      const payload = {
        name: nextName,
        description: nextDescription,
        price_cents: priceCents,
        category: nextCategory,
        stock_quantity: stockQuantity,
        status: normalizeStatus(statusRaw, stockQuantity),
        sku: nextSku,
        image_url: newImageUrl,
        additional_images: mergedAdditionalImages,
        badge: nextBadge,
        features: nextFeatures
      };

      const v = validate(productUpsertSchema, payload);
      if (!v.ok) return res.status(400).json({ error: v.error });

      await query(
        `UPDATE products
         SET name = ?, description = ?, price_cents = ?, category = ?, stock_quantity = ?, status = ?, sku = ?, image_url = ?, additional_images = ?, badge = ?, features = ?
         WHERE id = ?`,
        [
          v.data.name,
          v.data.description,
          v.data.price_cents,
          v.data.category,
          v.data.stock_quantity,
          v.data.status,
          v.data.sku || null,
          v.data.image_url || null,
          JSON.stringify(v.data.additional_images || []),
          v.data.badge || null,
          JSON.stringify(v.data.features || []),
          id
        ]
      );

      // If a new upload replaced a previous upload, delete the old file (but never touch seed 'assets/*' images).
      if (imageFile && isUploadsProductPath(existing.image_url)) {
        const toDelete = path.join(UPLOADS_ROOT, path.basename(existing.image_url));
        fs.unlink(toDelete).catch(() => {});
      }

      // Delete removed additional uploads.
      const removedAdditionalUploads = existingAdditionalImages.filter(
        (url) => isUploadsProductPath(url) && !mergedAdditionalImages.includes(url)
      );
      removedAdditionalUploads.forEach((url) => {
        const toDelete = path.join(UPLOADS_ROOT, path.basename(url));
        fs.unlink(toDelete).catch(() => {});
      });

      const rows = await query(
        `SELECT id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features, created_at
         FROM products WHERE id = ? LIMIT 1`,
        [id]
      );

      const updated = rows[0] || null;
      if (updated) {
        updated.features = Array.isArray(updated.features) ? updated.features : (safeJsonParse(updated.features, []) || []);
        updated.additional_images = Array.isArray(updated.additional_images)
          ? updated.additional_images
          : (safeJsonParse(updated.additional_images, []) || []);
      }

      return res.json(updated || { id });
    } catch (e) {
      const msg = e && e.message ? e.message : 'Failed to update product.';
      return res.status(400).json({ error: msg });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = req.params.id;
    const existingRows = await query(
      'SELECT id, image_url, additional_images FROM products WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existingRows.length) return res.status(404).json({ error: 'Product not found.' });
    const existing = existingRows[0];

    await query('DELETE FROM products WHERE id = ?', [id]);

    if (isUploadsProductPath(existing.image_url)) {
      const toDelete = path.join(UPLOADS_ROOT, path.basename(existing.image_url));
      fs.unlink(toDelete).catch(() => {});
    }

    const additionalImages = normalizeAdditionalImages(existing.additional_images);
    additionalImages
      .filter(isUploadsProductPath)
      .forEach((url) => {
        const toDelete = path.join(UPLOADS_ROOT, path.basename(url));
        fs.unlink(toDelete).catch(() => {});
      });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
