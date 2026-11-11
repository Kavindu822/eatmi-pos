import { NextRequest, NextResponse } from 'next/server';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getTursoClient } from '@/lib/turso';

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const isVercel = process.env.VERCEL === '1';
    if (isVercel) {
      return NextResponse.json({
        ok: true,
        isCloud: true,
        message: 'Running cloud-native on Vercel with Turso database.'
      });
    }

    // Dynamic import to avoid node:sqlite on environments without it
    const { getDatabase } = await import('@/lib/db');
    const db = getDatabase();

    // 1. Get all pending local sales that need cloud upload
    const pendingSales = db.prepare('SELECT * FROM sales WHERE synced = 0').all() as any[];

    // 2. Connect to Turso Cloud
    const turso = getTursoClient();

    // Check Turso connectivity with a fast ping query
    try {
      await turso.execute('SELECT 1');
    } catch (netErr: any) {
      return NextResponse.json({
        ok: false,
        offline: true,
        pendingCount: pendingSales.length,
        message: 'Offline mode: Changes saved locally in counter.sqlite. Will sync when internet is back.'
      });
    }

    // 3. PUSH: Upload pending local sales to Turso Cloud
    let pushedCount = 0;
    if (pendingSales.length > 0) {
      for (const s of pendingSales) {
        try {
          await turso.execute({
            sql: `INSERT OR REPLACE INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier, synced)
                  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            args: [
              s.id,
              s.created,
              s.customer_id,
              s.customer_name || 'Walk-in Patron',
              s.items,
              s.subtotal,
              s.discount,
              s.total,
              s.earned,
              s.redeemed,
              s.payment,
              s.tendered,
              s.order_type || 'takeaway',
              s.table_no || '',
              s.notes || '',
              s.status || 'completed',
              s.cashier || 'Cashier 1'
            ]
          });

          // Mark as synced locally
          db.prepare('UPDATE sales SET synced = 1 WHERE id = ?').run(s.id);
          pushedCount++;
        } catch (pushErr) {
          console.error(`Failed to push sale ${s.id} to Turso:`, pushErr);
        }
      }
    }

    // 4. PULL: Fetch latest master data from Turso Cloud
    const [catRes, prodRes, custRes, setRes, mediaRes] = await Promise.all([
      turso.execute('SELECT * FROM categories ORDER BY display_order ASC, name ASC'),
      turso.execute('SELECT * FROM products ORDER BY category ASC, name ASC'),
      turso.execute('SELECT * FROM customers ORDER BY points DESC, name ASC'),
      turso.execute('SELECT key, value FROM settings'),
      turso.execute('SELECT filename, data, mime_type FROM media')
    ]);

    // 5. Merge Categories into local SQLite
    for (const c of catRes.rows) {
      try {
        db.prepare(`
          INSERT INTO categories(id, name, slug, icon, image, description, display_order)
          VALUES(?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            slug=excluded.slug,
            icon=excluded.icon,
            image=excluded.image,
            description=excluded.description,
            display_order=excluded.display_order
        `).run(
          String(c.id),
          String(c.name),
          String(c.slug),
          String(c.icon || ''),
          String(c.image || ''),
          String(c.description || ''),
          Number(c.display_order || 0)
        );
      } catch (err) {}
    }

    // 6. Merge Products into local SQLite
    for (const p of prodRes.rows) {
      try {
        db.prepare(`
          INSERT INTO products(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            sku=excluded.sku,
            category_id=excluded.category_id,
            category=excluded.category,
            price=excluded.price,
            cost=excluded.cost,
            stock=excluded.stock,
            image=excluded.image,
            badge=excluded.badge,
            dietary=excluded.dietary,
            description=excluded.description,
            is_active=excluded.is_active
        `).run(
          String(p.id),
          String(p.name),
          String(p.sku),
          String(p.category_id || ''),
          String(p.category),
          Number(p.price),
          Number(p.cost || 0),
          Number(p.stock || 0),
          String(p.image || ''),
          String(p.badge || ''),
          String(p.dietary || ''),
          String(p.description || ''),
          p.is_active !== undefined ? (Number(p.is_active) ? 1 : 0) : 1
        );
      } catch (err) {}
    }

    // 7. Merge Customers into local SQLite
    for (const cu of custRes.rows) {
      try {
        db.prepare(`
          INSERT INTO customers(id, name, phone, email, points, spent, visits, created_at)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            phone=excluded.phone,
            email=excluded.email,
            points=excluded.points,
            spent=excluded.spent,
            visits=excluded.visits
        `).run(
          String(cu.id),
          String(cu.name),
          String(cu.phone),
          String(cu.email || ''),
          Number(cu.points || 0),
          Number(cu.spent || 0),
          Number(cu.visits || 0),
          String(cu.created_at || '')
        );
      } catch (err) {}
    }

    // 8. Merge Settings into local SQLite
    for (const st of setRes.rows) {
      try {
        db.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)').run(
          String(st.key),
          String(st.value)
        );
      } catch (err) {}
    }

    // 9. Download missing cloud media images to public/uploads/ for offline cashier access
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      mkdirSync(uploadsDir, { recursive: true });
    } catch {}

    let downloadedMediaCount = 0;
    for (const m of mediaRes.rows) {
      const filename = String(m.filename);
      const localFilePath = join(uploadsDir, filename);
      if (!existsSync(localFilePath) && m.data) {
        try {
          const buffer = Buffer.from(String(m.data), 'base64');
          writeFileSync(localFilePath, buffer);
          downloadedMediaCount++;
        } catch (writeErr) {}
      }
    }

    // Check remaining unsynced count
    const remainingUnsynced = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE synced = 0').get() as any)?.count || 0;

    return NextResponse.json({
      ok: true,
      pushedSales: pushedCount,
      downloadedMedia: downloadedMediaCount,
      categoriesCount: catRes.rows.length,
      productsCount: prodRes.rows.length,
      customersCount: custRes.rows.length,
      pendingCount: remainingUnsynced,
      lastSyncTime: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Synchronization failed',
        offline: true
      },
      { status: 500 }
    );
  }
}
