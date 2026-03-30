const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { v4: uuid } = require('uuid');
const { query } = require('../db');
const { profileUpdateSchema, validate } = require('../validate');

const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads', 'avatars');

function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    address: row.address || '',
    profileImageUrl: row.profile_image_url || '',
    role: row.role || 'customer'
  };
}

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
}

function isUploadsAvatarPath(imageUrl) {
  return typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/avatars/');
}

function coerceOptionalString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
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

router.get('/me', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: publicUser(rows[0]) });
  } catch (_) {
    return res.status(500).json({ error: 'Server error' });
  }
});

function uploadSingleAvatar(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    const message = err && err.message ? err.message : 'Upload failed.';
    return res.status(400).json({ error: message });
  });
}

router.put('/me', uploadSingleAvatar, async (req, res) => {
  const uploaded = req.file || null;

  try {
    const userId = req.user?.id;
    if (!userId) {
      if (uploaded) fs.unlink(path.join(UPLOADS_ROOT, uploaded.filename)).catch(() => {});
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!rows.length) {
      if (uploaded) fs.unlink(path.join(UPLOADS_ROOT, uploaded.filename)).catch(() => {});
      return res.status(404).json({ error: 'User not found.' });
    }
    const existing = rows[0];

    const payload = {
      fullName: String(req.body.fullName || '').trim(),
      email: String(req.body.email || '').trim(),
      phone: coerceOptionalString(req.body.phone),
      address: coerceOptionalString(req.body.address)
    };

    const v = validate(profileUpdateSchema, payload);
    if (!v.ok) {
      if (uploaded) fs.unlink(path.join(UPLOADS_ROOT, uploaded.filename)).catch(() => {});
      return res.status(400).json({ error: v.error });
    }

    if (v.data.email !== existing.email) {
      const used = await query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [v.data.email, userId]);
      if (used.length) {
        if (uploaded) fs.unlink(path.join(UPLOADS_ROOT, uploaded.filename)).catch(() => {});
        return res.status(409).json({ error: 'Email already in use.' });
      }
    }

    const removeAvatar =
      String(req.body.removeAvatar || '').trim().toLowerCase() === 'true' ||
      String(req.body.removeAvatar || '').trim() === '1';

    let profileImageUrl = existing.profile_image_url || null;
    if (uploaded) profileImageUrl = `/uploads/avatars/${uploaded.filename}`;
    if (removeAvatar) profileImageUrl = null;

    await query(
      'UPDATE users SET full_name = ?, email = ?, phone = ?, address = ?, profile_image_url = ? WHERE id = ?',
      [v.data.fullName, v.data.email, v.data.phone || null, v.data.address || null, profileImageUrl, userId]
    );

    if ((uploaded || removeAvatar) && isUploadsAvatarPath(existing.profile_image_url)) {
      const toDelete = path.join(UPLOADS_ROOT, path.basename(existing.profile_image_url));
      fs.unlink(toDelete).catch(() => {});
    }

    const updatedRows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    return res.json({ user: publicUser(updatedRows[0] || existing) });
  } catch (e) {
    if (uploaded) fs.unlink(path.join(UPLOADS_ROOT, uploaded.filename)).catch(() => {});
    const msg = e && e.message ? e.message : 'Failed to update profile.';
    return res.status(400).json({ error: msg });
  }
});

module.exports = router;
