const jwt = require('jsonwebtoken');
const { query } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role || 'customer', email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function requireAuth(req, res) {
  const token = req.headers['x-auth-token'];
  if (!token) {
    res.status(401).json({ error: 'Not authenticated.' });
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const rows = await query('SELECT id, role, email FROM users WHERE id = ? LIMIT 1', [payload.sub]);
    if (!rows.length) {
      res.status(401).json({ error: 'Invalid token.' });
      return null;
    }
    return rows[0];
  } catch (err) {
    res.status(401).json({ error: 'Invalid token.' });
    return null;
  }
}

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden.' });
    return null;
  }
  return user;
}

function requireAuthMiddleware(req, res, next) {
  requireAuth(req, res)
    .then((user) => {
      if (!user) return;
      req.user = user;
      next();
    })
    .catch(() => res.status(401).json({ error: 'Invalid token.' }));
}

function requireAdminMiddleware(req, res, next) {
  requireAdmin(req, res)
    .then((user) => {
      if (!user) return;
      req.user = user;
      next();
    })
    .catch(() => res.status(403).json({ error: 'Forbidden.' }));
}

module.exports = {
  signToken,
  requireAuth,
  requireAdmin,
  requireAuthMiddleware,
  requireAdminMiddleware
};
