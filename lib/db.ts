import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const dbPath = join(process.cwd(), 'counter.sqlite');

let _db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (_db) return _db;

  _db = new DatabaseSync(dbPath);
  _db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');

  // 1. Initialize Categories Table
  _db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '',
      image TEXT DEFAULT '',
      description TEXT DEFAULT '',
      display_order INTEGER DEFAULT 0
    );
  `);

  // 2. Initialize Customers Table
  _db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      points INTEGER DEFAULT 0 NOT NULL,
      spent INTEGER DEFAULT 0 NOT NULL,
      visits INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT '',
      CONSTRAINT points_nonnegative CHECK(points >= 0)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON customers(phone);
  `);

  try {
    _db.exec(`ALTER TABLE customers ADD COLUMN email TEXT DEFAULT '';`);
  } catch {}

  // 3. Initialize Products Table
  _db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      category TEXT NOT NULL,
      category_id TEXT DEFAULT '',
      price INTEGER NOT NULL,
      cost INTEGER DEFAULT 0,
      stock INTEGER NOT NULL,
      image TEXT DEFAULT '',
      badge TEXT DEFAULT '',
      dietary TEXT DEFAULT '',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      CONSTRAINT stock_nonnegative CHECK(stock >= 0),
      CONSTRAINT price_positive CHECK(price > 0)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku);
  `);

  // Ensure missing columns in products if table existed earlier
  function ensureColumn(table: string, column: string, definition: string) {
    try {
      const cols = _db!.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      if (!cols.some(c => c.name === column)) {
        _db!.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      }
    } catch (e) {
      // Ignore migration errors
    }
  }

  ensureColumn('products', 'category_id', "TEXT DEFAULT ''");
  ensureColumn('products', 'image', "TEXT DEFAULT ''");
  ensureColumn('products', 'cost', "INTEGER DEFAULT 0");
  ensureColumn('products', 'is_active', "INTEGER DEFAULT 1");
  ensureColumn('customers', 'created_at', "TEXT DEFAULT ''");

  // 4. Initialize Sales Table
  _db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY NOT NULL,
      created TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL,
      total INTEGER NOT NULL,
      earned INTEGER NOT NULL,
      redeemed INTEGER NOT NULL,
      payment TEXT NOT NULL,
      tendered INTEGER NOT NULL,
      order_type TEXT DEFAULT 'takeaway',
      table_no TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'completed',
      cashier TEXT DEFAULT 'Worker 1',
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created);
  `);

  ensureColumn('sales', 'cashier', "TEXT DEFAULT 'Worker 1'");

  // 5. Initialize Settings Table
  _db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  function ensureSetting(key: string, defaultValue: string) {
    const exists = _db!.prepare("SELECT value FROM settings WHERE key=?").get(key);
    if (!exists) {
      _db!.prepare("INSERT INTO settings(key, value) VALUES(?, ?)").run(key, defaultValue);
    }
  }

  ensureSetting('owner_pin', '1234');
  ensureSetting('master_recovery_key', 'EATMI-8899');
  ensureSetting('owner_recovery_phone', '');
  ensureSetting('receipt_store_name', 'EATmi BAKERY & CAFE');
  ensureSetting('receipt_tagline', 'ARTISAN PÂTISSERIE & ROASTERY');
  ensureSetting('receipt_address', 'No. 07, Eugine Balasuriya Mawatha, Nupe, Matara');
  ensureSetting('receipt_phone', '0740546060');
  ensureSetting('receipt_header_note', 'TAX INVOICE / RECEIPT');
  ensureSetting('receipt_footer_1', '*** THANK YOU FOR VISITING! ***');
  ensureSetting('receipt_footer_2', 'Fresh bakes served with passion daily.');
  ensureSetting('receipt_paper_width', '80mm');
  ensureSetting('receipt_show_logo', 'true');
  ensureSetting('receipt_show_loyalty', 'true');
  ensureSetting('receipt_print_density', 'normal');
  ensureSetting('receipt_font_style', 'sans');
  ensureSetting('receipt_font_size', 'normal');
  ensureSetting('receipt_show_barcode', 'false');
  ensureSetting('receipt_auto_cut_margin', 'compact');
  ensureSetting('loyalty_rate_rupees', '300');

  // 6. Ensure Default Categories Exist
  const defaultCategories = [
    {
      id: 'cat-viennoiserie',
      name: 'Viennoiserie & Pastries',
      slug: 'viennoiserie',
      icon: '🥐',
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      description: 'Golden, flaky butter croissants, pain au chocolat, and cruffins baked fresh daily',
      display_order: 1
    },
    {
      id: 'cat-cakes',
      name: 'Cakes & Pâtisserie',
      slug: 'cakes-patisserie',
      icon: '🍰',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
      description: 'Decadent French gateaux, artisanal tarts, cheesecakes, and layered sponges',
      display_order: 2
    },
    {
      id: 'cat-macarons',
      name: 'Macarons & Delicacies',
      slug: 'macarons-delicacies',
      icon: '🧁',
      image: 'https://images.unsplash.com/photo-1569864321390-bf120ad636c0?auto=format&fit=crop&w=600&q=80',
      description: 'Parisian almond macarons, choux buns, eclairs, and gift assortments',
      display_order: 3
    },
    {
      id: 'cat-savory',
      name: 'Savory & Quiches',
      slug: 'savory-quiches',
      icon: '🥪',
      image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
      description: 'Hot quiche Lorraine, savory stuffed croissants, and melted cheese tarts',
      display_order: 4
    },
    {
      id: 'cat-bread',
      name: 'Artisan Bread',
      slug: 'artisan-bread',
      icon: '🥖',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      description: 'Slow-fermented sourdough boules, traditional stone-baked baguettes, and brioche',
      display_order: 5
    },
    {
      id: 'cat-drinks',
      name: 'Coffee & Drinks',
      slug: 'coffee-drinks',
      icon: '☕',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      description: 'Single-origin espresso, flat whites, ceremonial matcha, and hot chocolate',
      display_order: 6
    },
    {
      id: 'cat-hot-food',
      name: 'Hot Meals & Specials',
      slug: 'hot-meals',
      icon: '🍛',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      description: 'Warm cafe breakfast plates, fresh sandwich rolls, and chef specials',
      display_order: 7
    }
  ];

  for (const c of defaultCategories) {
    _db.prepare(`
      INSERT OR IGNORE INTO categories(id, name, slug, icon, image, description, display_order)
      VALUES(?, ?, ?, ?, ?, ?, ?)
    `).run(c.id, c.name, c.slug, c.icon, c.image, c.description, c.display_order);
  }

  // Ensure category is mandatory: assign any orphaned products to their proper category
  _db.prepare(`
    UPDATE products
    SET category_id = 'cat-macarons', category = 'Macarons & Delicacies'
    WHERE (category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories))
      AND (sku LIKE 'MAC-%' OR category LIKE '%Macaron%' OR category LIKE '%Eclair%')
  `).run();

  _db.prepare(`
    UPDATE products
    SET category_id = 'cat-savory', category = 'Savory & Quiches'
    WHERE (category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories))
      AND (sku LIKE 'SAV-%' OR category LIKE '%Savory%' OR category LIKE '%Quiche%')
  `).run();

  _db.prepare(`
    UPDATE products
    SET category_id = 'cat-drinks', category = 'Coffee & Drinks'
    WHERE (category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories))
      AND (sku LIKE 'BEV-%' OR category LIKE '%Coffee%' OR category LIKE '%Drink%')
  `).run();

  _db.prepare(`
    UPDATE products
    SET category_id = 'cat-bread', category = 'Artisan Bread'
    WHERE (category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories))
      AND (sku LIKE 'BRD-%' OR sku = 'SRD-101' OR category LIKE '%Bread%' OR category LIKE '%Sourdough%')
  `).run();

  _db.prepare(`
    UPDATE products
    SET category_id = 'cat-viennoiserie', category = 'Viennoiserie & Pastries'
    WHERE (category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories))
      AND (sku LIKE 'CRO-%' OR category LIKE '%Viennoiserie%')
  `).run();

  _db.prepare(`
    UPDATE products
    SET category_id = 'cat-cakes', category = 'Cakes & Pâtisserie'
    WHERE (category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories))
      AND (sku LIKE 'CAK-%' OR category LIKE '%Cake%' OR category LIKE '%Tart%')
  `).run();

  // If any other orphaned product remains, assign to first available category
  const firstCat = _db.prepare('SELECT id, name FROM categories ORDER BY display_order ASC LIMIT 1').get() as any;
  if (firstCat) {
    _db.prepare(`
      UPDATE products
      SET category_id = ?, category = ?
      WHERE category_id = '' OR category_id IS NULL OR category_id NOT IN (SELECT id FROM categories)
    `).run(firstCat.id, firstCat.name);
  }

  // Assign images and category_ids to existing products if empty
  const defaultImages: Record<string, { image: string; category_id: string }> = {
    'CRO-001': { image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80', category_id: 'cat-viennoiserie' },
    'CRO-002': { image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=500&q=80', category_id: 'cat-viennoiserie' },
    'CRO-003': { image: 'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?auto=format&fit=crop&w=500&q=80', category_id: 'cat-viennoiserie' },
    'CRO-004': { image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category_id: 'cat-viennoiserie' },
    'CRO-005': { image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80', category_id: 'cat-viennoiserie' },
    'CRO-006': { image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category_id: 'cat-viennoiserie' },
    'CAK-001': { image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80', category_id: 'cat-cakes' },
    'CAK-002': { image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=500&q=80', category_id: 'cat-cakes' },
    'CAK-003': { image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80', category_id: 'cat-cakes' },
    'CAK-004': { image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80', category_id: 'cat-cakes' },
    'CAK-005': { image: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=500&q=80', category_id: 'cat-cakes' },
    'CAK-006': { image: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=500&q=80', category_id: 'cat-cakes' },
    'MAC-001': { image: 'https://images.unsplash.com/photo-1569864321390-bf120ad636c0?auto=format&fit=crop&w=500&q=80', category_id: 'cat-macarons' },
    'MAC-002': { image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=500&q=80', category_id: 'cat-macarons' },
    'MAC-003': { image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category_id: 'cat-macarons' },
    'MAC-004': { image: 'https://images.unsplash.com/photo-1569864321390-bf120ad636c0?auto=format&fit=crop&w=500&q=80', category_id: 'cat-macarons' },
    'SAV-001': { image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=500&q=80', category_id: 'cat-savory' },
    'SAV-002': { image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=500&q=80', category_id: 'cat-savory' },
    'SAV-003': { image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80', category_id: 'cat-savory' },
    'SAV-004': { image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=500&q=80', category_id: 'cat-savory' },
    'BRD-001': { image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category_id: 'cat-bread' },
    'BRD-002': { image: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=500&q=80', category_id: 'cat-bread' },
    'BRD-003': { image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category_id: 'cat-bread' },
    'BEV-001': { image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=500&q=80', category_id: 'cat-drinks' },
    'BEV-002': { image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=80', category_id: 'cat-drinks' },
    'BEV-003': { image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=500&q=80', category_id: 'cat-drinks' },
  };

  for (const [sku, meta] of Object.entries(defaultImages)) {
    _db.prepare(`
      UPDATE products 
      SET image = CASE WHEN image = '' OR image IS NULL THEN ? ELSE image END,
          category_id = CASE WHEN category_id = '' OR category_id IS NULL THEN ? ELSE category_id END
      WHERE sku = ?
    `).run(meta.image, meta.category_id, sku);
  }

  return _db;
}

