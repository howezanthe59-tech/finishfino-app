// Load environment variables for any script that imports this module (server, seeds, tests)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASS = '',
  DB_NAME = 'finishfino',
  DB_PORT = 3306
} = process.env;

const ADMIN_BOOTSTRAP_EMAIL = String(process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
const ADMIN_BOOTSTRAP_PASSWORD = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');
const ADMIN_BOOTSTRAP_NAME = String(process.env.ADMIN_BOOTSTRAP_NAME || 'System Admin').trim() || 'System Admin';

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: DB_PORT,
  connectionLimit: 10
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      reset_token VARCHAR(255) NULL,
      reset_token_expiry DATETIME NULL,
      phone VARCHAR(50),
      address TEXT,
      profile_image_url TEXT,
      role VARCHAR(20) DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS cookie_consents (
      user_id CHAR(36) PRIMARY KEY,
      preferences JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      price_cents INT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Uncategorized',
      stock_quantity INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'out_of_stock',
      sku VARCHAR(80),
      image_url TEXT,
      additional_images JSON,
      badge VARCHAR(50),
      features JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36),
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      service_type VARCHAR(50) NOT NULL,
      product_selection JSON,
      cleaning_level VARCHAR(20),
      service_size VARCHAR(20),
      property_type VARCHAR(50),
      bedrooms INT,
      bathrooms INT,
      size_sqft INT,
      date DATE NOT NULL,
      time VARCHAR(50),
      instructions TEXT,
      add_ons JSON,
      total_cents INT NOT NULL,
      deposit_cents INT NOT NULL,
      balance_cents INT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending_deposit',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id CHAR(36) PRIMARY KEY,
      booking_id CHAR(36),
      user_id CHAR(36),
      items JSON NOT NULL,
      total_cents INT NOT NULL,
      deposit_cents INT DEFAULT 0,
      balance_cents INT DEFAULT 0,
      payment_provider VARCHAR(30) NULL,
      payment_account_type VARCHAR(50) NULL,
      payment_account_last4 CHAR(4) NULL,
      paypal_order_id VARCHAR(64) NULL,
      paypal_capture_id VARCHAR(64) NULL,
      status VARCHAR(50) DEFAULT 'pending_payment',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id CHAR(36) PRIMARY KEY,
      order_id CHAR(36) NOT NULL,
      product_name VARCHAR(150) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price_cents INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS points (
      user_id CHAR(36) PRIMARY KEY,
      points INT NOT NULL DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Ensure new columns exist; ignore errors if they already exist (for MySQL versions without IF NOT EXISTS)
  try { await query(`ALTER TABLE bookings ADD COLUMN product_selection JSON`); } catch (_) {}
  try { await query(`ALTER TABLE bookings ADD COLUMN cleaning_level VARCHAR(20)`); } catch (_) {}
  try { await query(`ALTER TABLE bookings ADD COLUMN service_size VARCHAR(20)`); } catch (_) {}
  try { await query(`ALTER TABLE bookings ADD COLUMN health_acknowledged BOOLEAN DEFAULT FALSE`); } catch (_) {}
  try { await query(`ALTER TABLE bookings ADD COLUMN health_notes TEXT`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN booking_id CHAR(36)`); } catch (_) {}
  try { await query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer'`); } catch (_) {}
  try { await query(`ALTER TABLE users ADD COLUMN profile_image_url TEXT`); } catch (_) {}
  try { await query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL`); } catch (_) {}
  try { await query(`ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME NULL`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN image_url TEXT`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN category VARCHAR(80) NOT NULL DEFAULT 'Uncategorized'`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'out_of_stock'`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN sku VARCHAR(80)`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN additional_images JSON`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN badge VARCHAR(50)`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN features JSON`); } catch (_) {}
  try { await query(`ALTER TABLE cookie_consents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`); } catch (_) {}
  try { await query(`ALTER TABLE order_items ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`); } catch (_) {}
  try { await query(`ALTER TABLE order_items ADD COLUMN price_cents INT NOT NULL DEFAULT 0`); } catch (_) {}
  try { await query(`ALTER TABLE order_items ADD COLUMN price INT NOT NULL DEFAULT 0`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN payment_provider VARCHAR(30) NULL`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN payment_account_type VARCHAR(50) NULL`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN payment_account_last4 CHAR(4) NULL`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN paypal_order_id VARCHAR(64) NULL`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN paypal_capture_id VARCHAR(64) NULL`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD UNIQUE INDEX uq_orders_paypal_order_id (paypal_order_id)`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD UNIQUE INDEX uq_orders_paypal_capture_id (paypal_capture_id)`); } catch (_) {}
  try { await query(`ALTER TABLE points ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`); } catch (_) {}

  // Optional one-time bootstrap admin (disabled unless explicit env vars are set).
  if (ADMIN_BOOTSTRAP_EMAIL && ADMIN_BOOTSTRAP_PASSWORD) {
    const adminRows = await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [ADMIN_BOOTSTRAP_EMAIL]);
    if (!adminRows.length) {
      const hash = await bcrypt.hash(ADMIN_BOOTSTRAP_PASSWORD, 12);
      await query(`
        INSERT INTO users (id, full_name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `, [
        '00000000-0000-0000-0000-000000000000',
        ADMIN_BOOTSTRAP_NAME,
        ADMIN_BOOTSTRAP_EMAIL,
        hash,
        'admin'
      ]);
      console.log('Bootstrapped admin user from environment variables.');
    }
  } else {
    console.warn('[security] Admin bootstrap skipped (set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD to enable).');
  }
}

module.exports = { query, init };
