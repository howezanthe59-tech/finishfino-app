-- Create database
CREATE DATABASE IF NOT EXISTS finishfino;
USE finishfino;

-- 1. Users table
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
);

-- 2. Products table (Cleaning Supplies)
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
);

-- 3. Bookings table (Service Reservations)
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
  bedrooms INT DEFAULT 0,
  bathrooms INT DEFAULT 0,
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
);

-- 4. Orders table (Links product purchases to bookings/users)
CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36),
  user_id CHAR(36),
  items JSON NOT NULL, -- List of product IDs or names
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
  UNIQUE KEY uq_orders_paypal_order_id (paypal_order_id),
  UNIQUE KEY uq_orders_paypal_capture_id (paypal_capture_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. Order items table (line items used for order tracking/counts)
CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 6. Loyalty points table (used by /api/orders rewards logic)
CREATE TABLE IF NOT EXISTS points (
  user_id CHAR(36) PRIMARY KEY,
  points INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Seed Users
-- Intentionally left empty for security. Create users via /api/auth/signup.
-- For one-time admin bootstrap, set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD
-- in backend environment before first startup.

-- Seed Products (Aligned with Frontend Categories)
INSERT INTO products (id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features) VALUES
('multi-surface', 'ProClean Multi-Surface Soap', 'Powerful yet gentle formula perfect for all surfaces.', 2499, 'Soap', 120, 'in_stock', NULL, 'assets/images/multi surface.webp', NULL, 'Best Seller', JSON_ARRAY('Safe for all surfaces','Biodegradable formula','Fresh lemon scent')),
('disinfectant', 'Disinfectant', 'Kill 99.9% of germs, bacteria, and viruses.', 1899, 'Disinfectant', 140, 'in_stock', NULL, 'assets/images/disinfectant.webp', NULL, 'New', JSON_ARRAY('Kills 99.9% of germs','No harsh fumes')),
('bleach', 'Professional Strength Bleach', 'Maximum whitening and sanitizing power.', 1299, 'Bleach', 200, 'in_stock', NULL, 'assets/images/bleach.webp', NULL, NULL, JSON_ARRAY('Maximum strength formula','Whitens & brightens')),
('cloths', 'Premium Microfiber Cloths', 'Ultra-absorbent microfiber cloths that trap dirt and dust.', 1699, 'Cloth', 160, 'in_stock', NULL, 'assets/images/cloth.webp', NULL, 'Popular', JSON_ARRAY('Pack of 12 cloths','Lint-free cleaning')),
('fresh-linen', 'Fresh Linen Home Spray', 'Long-lasting fresh linen scent.', 1499, 'Spray', 110, 'in_stock', NULL, 'assets/images/home spray.webp', NULL, NULL, JSON_ARRAY('Odor eliminator','Natural ingredients')),
('lavender', 'Lavender Dreams Home Spray', 'Calming lavender scent creates a relaxing atmosphere.', 1499, 'Spray', 95, 'in_stock', NULL, 'assets/images/lavender dreams.webp', NULL, NULL, JSON_ARRAY('Soothing lavender scent','Aromatherapy benefits','Natural formula')),
('citrus', 'Citrus Burst Home Spray', 'Energizing citrus blend that freshens any room.', 1499, 'Spray', 85, 'in_stock', NULL, 'assets/images/citrus blast.webp', NULL, NULL, JSON_ARRAY('Zesty citrus scent','Energy-boosting aroma','Natural oils')),
('glass-cleaner', 'Streak-Free Glass Cleaner', 'Crystal-clear shine without streaks. Ammonia-free.', 1199, 'Glass Cleaner', 150, 'in_stock', NULL, 'assets/images/Glass cleaner.webp', NULL, NULL, JSON_ARRAY('Streak-free formula','Ammonia-free','Anti-fog')),
('all-purpose', 'Ultimate All-Purpose Cleaner', 'One cleaner for everything. Eco-friendly and tough.', 2299, 'Soap', 130, 'in_stock', NULL, 'assets/images/soap.webp', NULL, 'Best Value', JSON_ARRAY('Works on any surface','Concentrated','Eco-friendly')),
-- Bundles
('bundle-home', 'Home Essentials Bundle', 'Multi-surface essentials for everyday cleaning.', 7399, 'Bundle', 30, 'in_stock', NULL, 'assets/images/home.webp', NULL, 'Bundle', JSON_ARRAY('Multi-Surface Soap','Pro Strength Bleach','Disinfectant','Microfiber Cloths','Fresh Linen Spray')),
('bundle-commercial', 'Commercial Bundle', 'High-coverage kit for offices and facilities.', 7199, 'Bundle', 22, 'in_stock', NULL, 'assets/images/commerc.webp', NULL, 'Bundle', JSON_ARRAY('Multi-Surface Soap','Disinfectant','Professional Bleach','Microfiber Cloths','Glass Cleaner')),
('bundle-fresh-space', 'Fresh Space Bundle', 'Odor-control and refresh kit for any environment.', 7599, 'Bundle', 18, 'in_stock', NULL, 'assets/images/resi.webp', NULL, 'Bundle', JSON_ARRAY('Fresh Linen Spray','Disinfectant','Microfiber Cloths','Professional Bleach','All-Purpose Cleaner'))
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  description=VALUES(description),
  price_cents=VALUES(price_cents),
  category=VALUES(category),
  stock_quantity=VALUES(stock_quantity),
  status=VALUES(status),
  sku=VALUES(sku),
  image_url=VALUES(image_url),
  additional_images=VALUES(additional_images),
  badge=VALUES(badge),
  features=VALUES(features);
