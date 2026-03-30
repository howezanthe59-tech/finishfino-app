const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { query } = require('../db');
const { signToken, requireAuth } = require('../auth');
const { signupSchema, loginSchema, validate } = require('../validate');

const router = express.Router();

const publicUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone || '',
  address: row.address || '',
  profileImageUrl: row.profile_image_url || '',
  role: row.role || 'customer'
});

router.post('/signup', async (req, res) => {
  const parsed = validate(signupSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { fullName, email, password, phone, address } = parsed.data;
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email, and password are required.' });
  }
  const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return res.status(409).json({ error: 'Account already exists.' });

  const hash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  await query(
    'INSERT INTO users (id, full_name, email, password_hash, phone, address, role) VALUES (?,?,?,?,?,?,?)',
    [id, fullName, email, hash, phone || null, address || null, 'customer']
  );
  const token = signToken({ id, email, role: 'customer' });
  return res.status(201).json({ user: publicUser({ id, full_name: fullName, email, phone, address, role: 'customer' }), token });
});

router.post('/login', async (req, res) => {
  const parsed = validate(loginSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { email, password } = parsed.data;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
  const token = signToken(user);
  return res.json({ user: publicUser(user), token });
});

router.get('/me', (req, res) => {
  requireAuth(req, res)
    .then((user) => {
      if (!user) return;
      return query('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id])
        .then((rows) => {
          if (!rows.length) return res.status(401).json({ error: 'Invalid token.' });
          return res.json({ user: publicUser(rows[0]) });
        });
    })
    .catch(() => res.status(500).json({ error: 'Server error' }));
});

module.exports = router;
