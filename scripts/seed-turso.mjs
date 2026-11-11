import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const tursoUrl = 'libsql://eatmi-pos-kavindu.aws-ap-south-1.turso.io';
const tursoToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQ0MjA2MTYsImlkIjoiMDFhMWNiY2QtNWYwMS03ODhjLWIxN2QtZDg2NTBhMDZlYWQxIiwia2lkIjoidE9VYUdZdC1MdWxhMk9rengzblExQTNSc2RxVXcyTHIzb0YxRF82SnIzcyIsInJpZCI6ImU0NDM1OGVlLWQ3OTItNDkxZS05N2QwLTg2MjM0MmQ1NjlhNSJ9.8embmjgamJr5jo_2zHeRFNdHE5elUzkVcRHnt4CWyZaCinnlaWCNvrOcPfupAgbIDoVyfkNQQXniLHhaoYWnAg';

const turso = createClient({
  url: tursoUrl,
  authToken: tursoToken
});

const localDb = new DatabaseSync('counter.sqlite');

async function seed() {
  console.log('--- 1. Initializing Tables on Turso Cloud ---');

  await turso.execute(`
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

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      points INTEGER DEFAULT 0 NOT NULL,
      spent INTEGER DEFAULT 0 NOT NULL,
      visits INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT ''
    );
  `);
  await turso.execute(`CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON customers(phone);`);

  await turso.execute(`
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
      is_active INTEGER DEFAULT 1
    );
  `);
  await turso.execute(`CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku);`);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY NOT NULL,
      created TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT DEFAULT '',
      items TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      earned INTEGER DEFAULT 0,
      redeemed INTEGER DEFAULT 0,
      payment TEXT NOT NULL,
      tendered INTEGER DEFAULT 0,
      order_type TEXT DEFAULT 'takeaway',
      table_no TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'preparing',
      cashier TEXT DEFAULT 'Cashier 1',
      synced INTEGER DEFAULT 1
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // Media table for cloud images (Vercel & sync)
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS media (
      filename TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  console.log('--- 2. Migrating Data from Local SQLite to Turso Cloud ---');

  // Categories
  const categories = localDb.prepare('SELECT * FROM categories').all();
  for (const c of categories) {
    await turso.execute({
      sql: 'INSERT OR REPLACE INTO categories(id, name, slug, icon, image, description, display_order) VALUES(?, ?, ?, ?, ?, ?, ?)',
      args: [c.id, c.name, c.slug, c.icon || '', c.image || '', c.description || '', c.display_order || 0]
    });
  }
  console.log(`Migrated ${categories.length} categories.`);

  // Products
  const products = localDb.prepare('SELECT * FROM products').all();
  for (const p of products) {
    await turso.execute({
      sql: 'INSERT OR REPLACE INTO products(id, name, sku, category, category_id, price, cost, stock, image, badge, dietary, description, is_active) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [p.id, p.name, p.sku, p.category, p.category_id || '', p.price, p.cost || 0, p.stock, p.image || '', p.badge || '', p.dietary || '', p.description || '', p.is_active ?? 1]
    });
  }
  console.log(`Migrated ${products.length} products.`);

  // Customers
  const customers = localDb.prepare('SELECT * FROM customers').all();
  for (const cu of customers) {
    await turso.execute({
      sql: 'INSERT OR REPLACE INTO customers(id, name, phone, email, points, spent, visits, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
      args: [cu.id, cu.name, cu.phone, cu.email || '', cu.points, cu.spent, cu.visits, cu.created_at || '']
    });
  }
  console.log(`Migrated ${customers.length} customers.`);

  // Sales
  const sales = localDb.prepare('SELECT * FROM sales').all();
  for (const s of sales) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier, synced)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [s.id, s.created, s.customer_id, s.customer_name, s.items, s.subtotal, s.discount, s.total, s.earned, s.redeemed, s.payment, s.tendered, s.order_type, s.table_no, s.notes, s.status, s.cashier]
    });
  }
  console.log(`Migrated ${sales.length} sales.`);

  // Settings
  const settings = localDb.prepare('SELECT * FROM settings').all();
  for (const st of settings) {
    await turso.execute({
      sql: 'INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)',
      args: [st.key, st.value]
    });
  }
  console.log(`Migrated ${settings.length} settings.`);

  // Migrate local images into Turso media table
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  if (existsSync(uploadsDir)) {
    const files = readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
    for (const f of files) {
      const filePath = join(uploadsDir, f);
      const buffer = readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const ext = f.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO media(filename, data, mime_type, updated_at) VALUES(?, ?, ?, ?)',
        args: [f, base64, mime, new Date().toISOString()]
      });
    }
    console.log(`Uploaded ${files.length} images to Turso media storage.`);
  }

  console.log('✅ ALL LOCAL DATA AND IMAGES SUCCESSFULLY SEEDED TO TURSO CLOUD!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

