const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { query } = require('./db');

const AUTH_COOKIE_NAME = String(process.env.AUTH_COOKIE_NAME || 'finishfino_auth').trim() || 'finishfino_auth';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_MAX_AGE_MS = Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);

let JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const isProd = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
if (!JWT_SECRET || JWT_SECRET === 'dev_only_change_me') {
  if (isProd) {
    throw new Error('JWT_SECRET must be set to a strong value (min 32 chars) in production.');
  }
  JWT_SECRET = randomBytes(48).toString('hex');
  console.warn('[security] JWT_SECRET missing/default in development; using ephemeral secret for this process.');
} else if (JWT_SECRET.length < 32) {
  if (isProd) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  console.warn('[security] JWT_SECRET is shorter than 32 chars in development; set a stronger secret.');
}

function parseCookies(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || '');
  if (!raw) return out;

  raw.split(';').forEach((chunk) => {
    const part = String(chunk || '').trim();
    if (!part) return;
    const idx = part.indexOf('=');
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const valueRaw = part.slice(idx + 1).trim();
    if (!key) return;
    try {
      out[key] = decodeURIComponent(valueRaw);
    } catch (_) {
      out[key] = valueRaw;
    }
  });
  return out;
}

function getHeaderToken(req) {
  const tokenHeader = req.headers['x-auth-token'];
  if (Array.isArray(tokenHeader)) return String(tokenHeader[0] || '').trim();
  return String(tokenHeader || '').trim();
}

function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
  return authHeader.slice(7).trim();
}

function getCookieToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return String(cookies[AUTH_COOKIE_NAME] || '').trim();
}

function buildAuthCookieOptions() {
  const isProd = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const forceSecure = String(process.env.COOKIE_SECURE || '').trim().toLowerCase() === 'true';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd || forceSecure,
    path: '/',
    maxAge: Number.isFinite(AUTH_COOKIE_MAX_AGE_MS) && AUTH_COOKIE_MAX_AGE_MS > 0
      ? AUTH_COOKIE_MAX_AGE_MS
      : 7 * 24 * 60 * 60 * 1000
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role || 'customer', email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function requireAuth(req, res) {
  const candidates = [];
  const headerToken = getHeaderToken(req);
  const bearerToken = getBearerToken(req);
  const cookieToken = getCookieToken(req);
  if (headerToken) candidates.push(headerToken);
  if (bearerToken) candidates.push(bearerToken);
  if (cookieToken) candidates.push(cookieToken);

  if (!candidates.length) {
    res.status(401).json({ error: 'Not authenticated.' });
    return null;
  }

  for (const token of candidates) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const rows = await query('SELECT id, role, email FROM users WHERE id = ? LIMIT 1', [payload.sub]);
      if (!rows.length) continue;
      return rows[0];
    } catch (_) {
      // Try next token source (header, bearer, cookie).
    }
  }

  res.status(401).json({ error: 'Invalid token.' });
  return null;
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
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  signToken,
  requireAuth,
  requireAdmin,
  requireAuthMiddleware,
  requireAdminMiddleware
};
