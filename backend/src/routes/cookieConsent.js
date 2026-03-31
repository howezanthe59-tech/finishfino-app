const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuthMiddleware } = require('../auth');

function normalizePreferences(raw) {
  if (!raw) return null;

  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      return null;
    }
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  return {
    essential: true,
    analytics: !!parsed.analytics,
    marketing: !!parsed.marketing,
    functional: !!parsed.functional
  };
}

// GET /api/cookie-consent - Get consent for the authenticated user
router.get('/', requireAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query('SELECT preferences FROM cookie_consents WHERE user_id = ?', [userId]);
    
    if (rows.length > 0) {
      return res.json({ preferences: normalizePreferences(rows[0].preferences) });
    } else {
      return res.json({ preferences: null });
    }
  } catch (error) {
    console.error('Error fetching cookie consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cookie-consent - Save/Update consent for the authenticated user
router.post('/', requireAuthMiddleware, async (req, res) => {
  const normalizedPreferences = normalizePreferences(req.body?.preferences);
  const userId = req.user.id;

  if (!normalizedPreferences) {
    return res.status(400).json({ error: 'Invalid preferences' });
  }

  try {
    // Upsert logic for MySQL
    await query(`
      INSERT INTO cookie_consents (user_id, preferences)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE preferences = VALUES(preferences)
    `, [userId, JSON.stringify(normalizedPreferences)]);

    res.json({ success: true, message: 'Preferences saved', preferences: normalizedPreferences });
  } catch (error) {
    console.error('Error saving cookie consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
