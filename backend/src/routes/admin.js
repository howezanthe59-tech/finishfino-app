const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

router.get('/users', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const rows = await query(
      'SELECT id, full_name, email, phone, address, role, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load users.' });
  }
});

module.exports = router;
