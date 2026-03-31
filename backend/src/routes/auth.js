const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID, randomBytes, createHash } = require('crypto');
const sgMail = require('@sendgrid/mail');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { AUTH_COOKIE_NAME, buildAuthCookieOptions, signToken, requireAuth } = require('../auth');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validate
} = require('../validate');

const router = express.Router();
const RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 60);
const RESET_SEND_TIMEOUT_MS = Number(process.env.PASSWORD_RESET_SEND_TIMEOUT_MS || 20_000);
const FRONTEND_URL = String(process.env.FRONTEND_URL || 'http://localhost:4200').trim().replace(/\/+$/, '');
const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'finishfinocleaningpro@gmail.com';
const GENERIC_RESET_MESSAGE = 'If an account exists, a password reset link has been sent.';
const RESET_INVALID_MESSAGE = 'Invalid or expired reset token';
let sendGridConfigured = false;
const authCookieOptions = buildAuthCookieOptions();

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' }
});

function withTimeout(promise, ms, label) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return promise;
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
}

function configureSendGrid() {
  if (sendGridConfigured) return true;
  const apiKey = String(process.env.SENDGRID_API_KEY || '').trim();
  if (!apiKey) return false;
  sgMail.setApiKey(apiKey);
  sendGridConfigured = true;
  return true;
}

function hashResetToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function buildResetLink(token) {
  return `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

const publicUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone || '',
  address: row.address || '',
  profileImageUrl: row.profile_image_url || '',
  role: row.role || 'customer'
});

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}

function clearAuthCookie(res) {
  const clearOptions = {
    httpOnly: true,
    sameSite: authCookieOptions.sameSite,
    secure: authCookieOptions.secure,
    path: authCookieOptions.path
  };
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
}

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
  setAuthCookie(res, token);
  return res.status(201).json({ user: publicUser({ id, full_name: fullName, email, phone, address, role: 'customer' }) });
});

router.post('/login', async (req, res) => {
  const parsed = validate(loginSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { email, password } = parsed.data;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const rows = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [normalizedEmail]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
  const token = signToken(user);
  setAuthCookie(res, token);
  return res.json({ user: publicUser(user) });
});

router.post('/logout', async (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const parsed = validate(forgotPasswordSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const email = String(parsed.data.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const rows = await query('SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    const user = rows[0];

    // Never reveal whether a user exists for this address.
    if (!user) return res.json({ message: GENERIC_RESET_MESSAGE });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [tokenHash, expiresAt, user.id]
    );

    if (!configureSendGrid()) {
      console.error('Forgot password email skipped: missing SENDGRID_API_KEY');
      return res.json({ message: GENERIC_RESET_MESSAGE });
    }

    const emailPayload = {
      to: user.email,
      from: BUSINESS_EMAIL,
      subject: 'Reset Your Password',
      text: [
        'Hello,',
        '',
        'You requested a password reset.',
        '',
        'Click the link below to reset your password:',
        buildResetLink(rawToken),
        '',
        `This link expires in ${RESET_TOKEN_TTL_MINUTES === 60 ? '1 hour' : `${RESET_TOKEN_TTL_MINUTES} minutes`}.`,
        'If you did not request this, you can safely ignore this email.'
      ].join('\n'),
      html: `
        <p>Hello,</p>
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${buildResetLink(rawToken)}">${buildResetLink(rawToken)}</a></p>
        <p>This link expires in ${RESET_TOKEN_TTL_MINUTES === 60 ? '1 hour' : `${RESET_TOKEN_TTL_MINUTES} minutes`}.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `
    };

    try {
      await withTimeout(sgMail.send(emailPayload), RESET_SEND_TIMEOUT_MS, 'Password reset email send');
    } catch (mailErr) {
      console.error('Forgot password email send error', mailErr?.response?.body || mailErr);
    }

    return res.json({ message: GENERIC_RESET_MESSAGE });
  } catch (err) {
    console.error('Forgot password error', err?.response?.body || err);
    return res.json({ message: GENERIC_RESET_MESSAGE });
  }
});

router.post('/reset-password', async (req, res) => {
  const parsed = validate(resetPasswordSchema, req.body || {});
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const token = String(parsed.data.token || '').trim();
  const newPassword = String(parsed.data.new_password || parsed.data.password || '');
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new_password are required.' });

  try {
    const tokenHash = hashResetToken(token);
    const rows = await query(
      `SELECT id
       FROM users
       WHERE reset_token = ?
         AND reset_token_expiry IS NOT NULL
         AND reset_token_expiry > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: RESET_INVALID_MESSAGE });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [newHash, user.id]
    );

    return res.json({ message: 'Password has been successfully reset.' });
  } catch (err) {
    console.error('Reset password error', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
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
