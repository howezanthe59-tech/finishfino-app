require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const bookingRoutes = require('./routes/booking'); // legacy form
const bookingsApi   = require('./routes/bookings'); // new deposit-backed
const contactRoutes = require('./routes/contact');
const authRoutes    = require('./routes/auth');
const ordersRoutes  = require('./routes/orders');
const productsRoutes = require('./routes/products');
const productsAdminRoutes = require('./routes/productsAdmin');
const profileRoutes = require('./routes/profile');
const adminRoutes   = require('./routes/admin');
const cookieConsentRoutes = require('./routes/cookieConsent');
const { requireAdminMiddleware, requireAuthMiddleware } = require('./auth');
const { init }      = require('./db');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:4200',  // Angular dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api', apiLimiter);

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/bookings', bookingRoutes);
app.use('/api/v2/bookings', bookingsApi);
app.use('/api/contact',  contactRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/orders',   ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/products', requireAdminMiddleware, productsAdminRoutes);
app.use('/api/profile', requireAuthMiddleware, profileRoutes);
app.use('/api/cookie-consent', cookieConsentRoutes);
app.use('/api/admin',    requireAdminMiddleware, adminRoutes);

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
