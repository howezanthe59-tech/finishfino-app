// Load environment variables for any script that imports this module (server, seeds, tests)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASS = '',
  DB_NAME = 'finishfino',
  DB_PORT = 3306
} = process.env;

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
      status VARCHAR(50) DEFAULT 'pending_payment',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Ensure new columns exist; ignore errors if they already exist (for MySQL versions without IF NOT EXISTS)
  try { await query(`ALTER TABLE bookings ADD COLUMN product_selection JSON`); } catch (_) {}
  try { await query(`ALTER TABLE bookings ADD COLUMN cleaning_level VARCHAR(20)`); } catch (_) {}
  try { await query(`ALTER TABLE bookings ADD COLUMN service_size VARCHAR(20)`); } catch (_) {}
  try { await query(`ALTER TABLE orders ADD COLUMN booking_id CHAR(36)`); } catch (_) {}
  try { await query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer'`); } catch (_) {}
  try { await query(`ALTER TABLE users ADD COLUMN profile_image_url TEXT`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN image_url TEXT`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN category VARCHAR(80) NOT NULL DEFAULT 'Uncategorized'`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'out_of_stock'`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN sku VARCHAR(80)`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN additional_images JSON`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN badge VARCHAR(50)`); } catch (_) {}
  try { await query(`ALTER TABLE products ADD COLUMN features JSON`); } catch (_) {}
  try { await query(`ALTER TABLE cookie_consents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`); } catch (_) {}

  // Seed Admin if not exists
  const adminRows = await query('SELECT id FROM users WHERE email = ?', ['admin@finishfino.com']);
  if (!adminRows.length) {
    await query(`
      INSERT INTO users (id, full_name, email, password_hash, phone, address, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      '00000000-0000-0000-0000-000000000000',
      'System Admin',
      'admin@finishfino.com',
      '$2a$10$fppg0z.pG0zg5A3Bz2P5be773qXuMXTEletJnBL75GFjsjwE9CLk46',
      '(555) 999-9999',
      'Admin HQ',
      'admin'
    ]);
    console.log('Seeded admin user');
  }
}

module.exports = { query, init };
