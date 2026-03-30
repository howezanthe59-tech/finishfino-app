const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth } = require('../auth');

// GET /api/cookie-consent - Get consent for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await query('SELECT preferences FROM cookie_consents WHERE user_id = ?', [userId]);
    
    if (rows.length > 0) {
      return res.json({ preferences: rows[0].preferences });
    } else {
      return res.json({ preferences: null });
    }
  } catch (error) {
    console.error('Error fetching cookie consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cookie-consent - Save/Update consent for the authenticated user
router.post('/', requireAuth, async (req, res) => {
  const { preferences } = req.body;
  const userId = req.user.id;

  if (!preferences || typeof preferences !== 'object') {
    return res.status(400).json({ error: 'Invalid preferences' });
  }

  try {
    // Upsert logic for MySQL
    await query(`
      INSERT INTO cookie_consents (user_id, preferences)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE preferences = VALUES(preferences)
    `, [userId, JSON.stringify(preferences)]);

    res.json({ success: true, message: 'Preferences saved' });
  } catch (error) {
    console.error('Error saving cookie consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
