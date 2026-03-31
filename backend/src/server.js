const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const bookingRoutes = require('./routes/booking'); // legacy form
const bookingsApi   = require('./routes/bookings'); // new deposit-backed
const contactRoutes = require('./routes/contact');
const authRoutes    = require('./routes/auth');
const ordersRoutes  = require('./routes/orders');
const paypalRoutes  = require('./routes/paypal');
const productsRoutes = require('./routes/products');
const productsAdminRoutes = require('./routes/productsAdmin');
const profileRoutes = require('./routes/profile');
const adminRoutes   = require('./routes/admin');
const cookieConsentRoutes = require('./routes/cookieConsent');
const { requireAdminMiddleware, requireAuthMiddleware } = require('./auth');
const { init }      = require('./db');

const app  = express();
const PORT = process.env.PORT || 4000;
const isProd = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
const allowedOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProd && (req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https'))) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Serve uploaded assets (product images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '30d',
  immutable: true
}));

// Rate limiting (basic protection against brute force / abuse)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/bookings', bookingRoutes);
app.use('/api/v2/bookings', bookingsApi);
app.use('/api/contact',  contactRoutes);
app.use('/api/auth',     authRoutes);
app.use('/auth',         authRoutes);
app.use('/api/paypal',   paypalRoutes);
app.use('/api/orders',   ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/products', requireAdminMiddleware, productsAdminRoutes);
app.use('/api/profile', requireAuthMiddleware, profileRoutes);
app.use('/api/cookie-consent', cookieConsentRoutes);
app.use('/api/admin',    requireAdminMiddleware, adminRoutes);

app.use((err, _req, res, next) => {
  if (err && /CORS/i.test(String(err.message || ''))) {
    return res.status(403).json({ error: 'Origin not allowed by CORS policy.' });
  }
  return next(err);
});

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ── 404 handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`FinishFino API running on http://localhost:${PORT}`);
  init().then(() => console.log('Database initialized')).catch((err) => console.error('DB init error', err));
});
