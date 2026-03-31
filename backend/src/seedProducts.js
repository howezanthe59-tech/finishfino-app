const { v4: uuid } = require('uuid');
const { query } = require('./db');

// Frontend product IDs and data
const products = [
  {
    id: 'multi-surface-soap',
    name: 'ProClean Multi-Surface Soap',
    price: 24.99,
    description: 'Powerful yet gentle formula perfect for all surfaces. Cuts through grease and grime while leaving a fresh, clean scent.',
    category: 'Soap',
    stock_quantity: 120,
    image: 'assets/images/multi surface.webp',
    badge: 'Best Seller',
    features: ['Safe for all surfaces', 'Biodegradable formula', 'Fresh lemon scent']
  },
  {
    id: 'disinfectant',
    name: 'Disinfectant',
    price: 18.99,
    description: 'Kill 99.9% of germs, bacteria, and viruses. EPA-approved formula for professional sanitization.',
    category: 'Disinfectant',
    stock_quantity: 140,
    image: 'assets/images/disinfectant.webp',
    badge: 'New',
    features: ['Kills 99.9% of germs', 'No harsh fumes']
  },
  {
    id: 'bleach',
    name: 'Professional Strength Bleach',
    price: 12.99,
    description: 'Maximum whitening and sanitizing power. Perfect for tough stains and deep cleaning tasks.',
    category: 'Bleach',
    stock_quantity: 200,
    image: 'assets/images/bleach.webp',
    features: ['Maximum strength formula', 'Whitens & brightens', 'Removes tough stains']
  },
  {
    id: 'microfiber',
    name: 'Premium Microfiber Cloths',
    price: 16.99,
    description: 'Ultra-absorbent microfiber cloths that trap dirt and dust. Reusable and machine washable.',
    category: 'Cloth',
    stock_quantity: 160,
    image: 'assets/images/cloth.webp',
    badge: 'Popular',
    features: ['Pack of 12 cloths', 'Ultra-absorbent', 'Lint-free cleaning']
  },
  {
    id: 'fresh-linen',
    name: 'Fresh Linen Home Spray',
    price: 14.99,
    description: 'Long-lasting fresh linen scent that eliminates odors and leaves your home smelling clean and inviting.',
    category: 'Spray',
    stock_quantity: 110,
    image: 'assets/images/home spray.webp',
    features: ['Fresh linen fragrance', 'Odor eliminator', 'Natural ingredients']
  },
  {
    id: 'lavender',
    name: 'Lavender Dreams Home Spray',
    price: 14.99,
    description: 'Calming lavender scent creates a relaxing atmosphere. Perfect for bedrooms and living spaces.',
    category: 'Spray',
    stock_quantity: 95,
    image: 'assets/images/lavender dreams.webp',
    features: ['Soothing lavender scent', 'Aromatherapy benefits', 'All-natural formula']
  },
  {
    id: 'citrus',
    name: 'Citrus Burst Home Spray',
    price: 14.99,
    description: 'Energizing citrus blend that freshens any room. Uplifting and invigorating fragrance.',
    category: 'Spray',
    stock_quantity: 85,
    image: 'assets/images/citrus blast.webp',
    features: ['Zesty citrus scent', 'Energy-boosting aroma', 'Natural essential oils']
  },
  {
    id: 'glass-cleaner',
    name: 'Streak-Free Glass Cleaner',
    price: 11.99,
    description: 'Crystal-clear shine without streaks. Ammonia-free formula safe for all glass surfaces.',
    category: 'Glass Cleaner',
    stock_quantity: 150,
    image: 'assets/images/Glass cleaner.webp',
    features: ['Streak-free formula', 'Ammonia-free', 'Anti-fog protection']
  },
  {
    id: 'all-purpose',
    name: 'Ultimate All-Purpose Cleaner',
    price: 22.99,
    description: 'One cleaner for everything. Tackles kitchen grease, bathroom grime, and everyday messes.',
    category: 'Soap',
    stock_quantity: 130,
    image: 'assets/images/soap.webp',
    badge: 'Best Value',
    features: ['Works on any surface', 'Concentrated formula', 'Eco-friendly']
  }
];

async function seed() {
  for (const p of products) {
    const priceCents = Math.round(p.price * 100);
    await query(
      `INSERT INTO products (id, name, description, price_cents, category, stock_quantity, status, sku, image_url, additional_images, badge, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         price_cents = VALUES(price_cents),
         category = VALUES(category),
         stock_quantity = VALUES(stock_quantity),
         status = VALUES(status),
         sku = VALUES(sku),
         image_url = VALUES(image_url),
         additional_images = VALUES(additional_images),
         badge = VALUES(badge),
         features = VALUES(features)`,
      [
        p.id,
        p.name,
        p.description,
        priceCents,
        p.category || 'Uncategorized',
        Number.isFinite(p.stock_quantity) ? p.stock_quantity : 0,
        (Number.isFinite(p.stock_quantity) ? p.stock_quantity : 0) > 0 ? 'in_stock' : 'out_of_stock',
        p.sku || null,
        p.image,
        null,
        p.badge || null,
        JSON.stringify(p.features || [])
      ]
    );
  }
  console.log(`Seeded ${products.length} products.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed', err);
  process.exit(1);
});
