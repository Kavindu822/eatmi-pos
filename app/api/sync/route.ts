import { NextRequest, NextResponse } from 'next/server';
import { existsSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
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

    // 1. Connect to Turso Cloud
    const turso = getTursoClient();

    // Fast connectivity check
    try {
      await turso.execute('SELECT 1');
    } catch (netErr: any) {
      const pendingSales = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE synced = 0').get() as any)?.count || 0;
      return NextResponse.json({
        ok: false,
        offline: true,
        pendingCount: pendingSales,
        message: 'Offline mode: Changes saved locally in counter.sqlite. Will sync when internet is back.'
      });
    }

    // -------------------------------------------------------------
    // STEP 2: SYNC DELETED RECORDS (TOMBSTONES)
    // -------------------------------------------------------------
    try {
      const localDeletions = db.prepare('SELECT id, table_name, deleted_at FROM deleted_records').all() as any[];
      const tursoDeletionsRes = await turso.execute('SELECT id, table_name, deleted_at FROM deleted_records');
      const tursoDeletions = tursoDeletionsRes.rows.map(r => ({ ...r })) as any[];

      const allDeletedMap = new Map<string, { id: string; table_name: string; deleted_at: string }>();
      for (const d of localDeletions) allDeletedMap.set(String(d.id), d);
      for (const d of tursoDeletions) allDeletedMap.set(String(d.id), d);

      for (const [id, d] of allDeletedMap.entries()) {
        // Apply deletion to local SQLite
        if (d.table_name === 'products') db.prepare('DELETE FROM products WHERE id=?').run(id);
        if (d.table_name === 'categories') db.prepare('DELETE FROM categories WHERE id=?').run(id);
        if (d.table_name === 'customers') {
          try { db.prepare('UPDATE sales SET customer_id = NULL WHERE customer_id = ?').run(id); } catch {}
          db.prepare('DELETE FROM customers WHERE id=?').run(id);
        }
        db.prepare('INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)').run(id, d.table_name, d.deleted_at);

        // Apply deletion to Turso Cloud
        if (d.table_name === 'products') await turso.execute({ sql: 'DELETE FROM products WHERE id=?', args: [id] });
        if (d.table_name === 'categories') await turso.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [id] });
        if (d.table_name === 'customers') {
          try { await turso.execute({ sql: 'UPDATE sales SET customer_id = NULL WHERE customer_id = ?', args: [id] }); } catch {}
          await turso.execute({ sql: 'DELETE FROM customers WHERE id=?', args: [id] });
        }
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, d.table_name, d.deleted_at]
        });
      }
    } catch (e) {
      console.warn('Deleted records sync warning:', e);
    }

    // -------------------------------------------------------------
    // STEP 3: BIDIRECTIONAL CATEGORIES SYNC
    // -------------------------------------------------------------
    const localCategories = db.prepare('SELECT * FROM categories').all() as any[];
    const tursoCatRes = await turso.execute('SELECT * FROM categories ORDER BY display_order ASC, name ASC');
    const tursoCategories = tursoCatRes.rows.map(r => ({ ...r })) as any[];

    const tursoCatMap = new Map<string, any>();
    for (const c of tursoCategories) tursoCatMap.set(String(c.id), c);

    const localCatMap = new Map<string, any>();
    for (const c of localCategories) localCatMap.set(String(c.id), c);

    // Push local categories to Turso if missing
    for (const lc of localCategories) {
      if (!tursoCatMap.has(String(lc.id))) {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO categories(id, name, slug, icon, image, description, display_order)
                VALUES(?, ?, ?, ?, ?, ?, ?)`,
          args: [lc.id, lc.name, lc.slug, lc.icon || '', lc.image || '', lc.description || '', lc.display_order || 0]
        });
      }
    }

    // Pull Turso categories into local SQLite
    for (const tc of tursoCategories) {
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
        String(tc.id),
        String(tc.name),
        String(tc.slug),
        String(tc.icon || ''),
        String(tc.image || ''),
        String(tc.description || ''),
        Number(tc.display_order || 0)
      );
    }

    // -------------------------------------------------------------
    // STEP 4: BIDIRECTIONAL PRODUCTS SYNC
    // -------------------------------------------------------------
    const localProducts = db.prepare('SELECT * FROM products').all() as any[];
    const tursoProdRes = await turso.execute('SELECT * FROM products ORDER BY category ASC, name ASC');
    const tursoProducts = tursoProdRes.rows.map(r => ({ ...r })) as any[];

    const tursoProdMap = new Map<string, any>();
    for (const p of tursoProducts) tursoProdMap.set(String(p.id), p);

    const localProdMap = new Map<string, any>();
    for (const p of localProducts) localProdMap.set(String(p.id), p);

    // Push local products to Turso if missing
    for (const lp of localProducts) {
      if (!tursoProdMap.has(String(lp.id))) {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO products(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            lp.id, lp.name, lp.sku, lp.category_id || '', lp.category,
            lp.price, lp.cost || 0, lp.stock || 0, lp.image || '',
            lp.badge || '', lp.dietary || '', lp.description || '',
            lp.is_active !== undefined ? (Number(lp.is_active) ? 1 : 0) : 1
          ]
        });
      }
    }

    // Pull Turso products into local SQLite
    for (const tp of tursoProducts) {
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
        String(tp.id),
        String(tp.name),
        String(tp.sku),
        String(tp.category_id || ''),
        String(tp.category),
        Number(tp.price),
        Number(tp.cost || 0),
        Number(tp.stock || 0),
        String(tp.image || ''),
        String(tp.badge || ''),
        String(tp.dietary || ''),
        String(tp.description || ''),
        tp.is_active !== undefined ? (Number(tp.is_active) ? 1 : 0) : 1
      );
    }

    // -------------------------------------------------------------
    // STEP 5: BIDIRECTIONAL CUSTOMERS (PATRONS) SYNC
    // -------------------------------------------------------------
    const localCustomers = db.prepare('SELECT * FROM customers').all() as any[];
    const tursoCustRes = await turso.execute('SELECT * FROM customers ORDER BY points DESC, name ASC');
    const tursoCustomers = tursoCustRes.rows.map(r => ({ ...r })) as any[];

    const tursoCustByPhone = new Map<string, any>();
    for (const c of tursoCustomers) tursoCustByPhone.set(String(c.phone), c);

    const localCustByPhone = new Map<string, any>();
    for (const c of localCustomers) localCustByPhone.set(String(c.phone), c);

    // Push local customers to Turso
    for (const lc of localCustomers) {
      const tc = tursoCustByPhone.get(String(lc.phone));
      if (!tc) {
        // Missing in Turso: Insert
        await turso.execute({
          sql: `INSERT OR REPLACE INTO customers(id, name, phone, email, points, spent, visits, created_at, updated_at)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [lc.id, lc.name, lc.phone, lc.email || '', lc.points || 0, lc.spent || 0, lc.visits || 0, lc.created_at || '', lc.updated_at || '']
        });
      } else {
        // Exists in both: Resolve based on updated_at timestamps
        const localTime = lc.updated_at ? new Date(lc.updated_at).getTime() : (lc.created_at ? new Date(lc.created_at).getTime() : 0);
        const tursoTime = tc.updated_at ? new Date(tc.updated_at).getTime() : (tc.created_at ? new Date(tc.created_at).getTime() : 0);

        let targetPoints = Number(lc.points || 0);
        let targetSpent = Number(lc.spent || 0);
        let targetVisits = Number(lc.visits || 0);
        let targetName = lc.name || tc.name;
        let targetEmail = lc.email !== undefined ? lc.email : (tc.email || '');
        let targetUpdatedAt = lc.updated_at || tc.updated_at || '';

        if (tursoTime > localTime) {
          // Cloud was updated more recently
          targetPoints = Number(tc.points || 0);
          targetSpent = Number(tc.spent || 0);
          targetVisits = Number(tc.visits || 0);
          targetName = tc.name || lc.name;
          targetEmail = tc.email !== undefined ? tc.email : (lc.email || '');
          targetUpdatedAt = tc.updated_at;
        } else if (localTime > tursoTime) {
          // Local register was updated more recently (e.g. points redeemed or earned)
          targetPoints = Number(lc.points || 0);
          targetSpent = Number(lc.spent || 0);
          targetVisits = Number(lc.visits || 0);
          targetName = lc.name || tc.name;
          targetEmail = lc.email !== undefined ? lc.email : (tc.email || '');
          targetUpdatedAt = lc.updated_at;
        } else {
          // Equal or no timestamps: keep local points, maximum for lifetime stats
          targetPoints = Number(lc.points ?? tc.points ?? 0);
          targetSpent = Math.max(Number(lc.spent || 0), Number(tc.spent || 0));
          targetVisits = Math.max(Number(lc.visits || 0), Number(tc.visits || 0));
        }

        // Update Turso if different
        if (
          targetPoints !== Number(tc.points) ||
          targetSpent !== Number(tc.spent) ||
          targetVisits !== Number(tc.visits) ||
          targetName !== tc.name ||
          targetEmail !== tc.email ||
          targetUpdatedAt !== tc.updated_at
        ) {
          await turso.execute({
            sql: 'UPDATE customers SET points=?, spent=?, visits=?, name=?, email=?, updated_at=? WHERE id=?',
            args: [targetPoints, targetSpent, targetVisits, targetName, targetEmail, targetUpdatedAt, tc.id]
          });
        }

        // Update Local SQLite if different
        if (
          targetPoints !== Number(lc.points) ||
          targetSpent !== Number(lc.spent) ||
          targetVisits !== Number(lc.visits) ||
          targetName !== lc.name ||
          targetEmail !== lc.email ||
          targetUpdatedAt !== lc.updated_at
        ) {
          db.prepare(`
            UPDATE customers SET points=?, spent=?, visits=?, name=?, email=?, updated_at=? WHERE id=?
          `).run(targetPoints, targetSpent, targetVisits, targetName, targetEmail, targetUpdatedAt, lc.id);
        }
      }
    }

    // Pull any customers present on Turso but missing locally
    for (const tc of tursoCustomers) {
      if (!localCustByPhone.has(String(tc.phone))) {
        db.prepare(`
          INSERT INTO customers(id, name, phone, email, points, spent, visits, created_at, updated_at)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(tc.id),
          String(tc.name),
          String(tc.phone),
          String(tc.email || ''),
          Number(tc.points || 0),
          Number(tc.spent || 0),
          Number(tc.visits || 0),
          String(tc.created_at || ''),
          String(tc.updated_at || '')
        );
      }
    }

    // -------------------------------------------------------------
    // STEP 6: BIDIRECTIONAL SALES SYNC
    // -------------------------------------------------------------
    const pendingSales = db.prepare('SELECT * FROM sales WHERE synced = 0').all() as any[];
    let pushedCount = 0;

    for (const s of pendingSales) {
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier, synced)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          args: [
            s.id, s.created, s.customer_id, s.customer_name || 'Walk-in Patron',
            s.items, s.subtotal, s.discount, s.total, s.earned, s.redeemed,
            s.payment, s.tendered, s.order_type || 'takeaway', s.table_no || '',
            s.notes || '', s.status || 'completed', s.cashier || 'Cashier 1'
          ]
        });
        db.prepare('UPDATE sales SET synced = 1 WHERE id = ?').run(s.id);
        pushedCount++;
      } catch (pushErr) {
        console.error(`Failed to push sale ${s.id} to Turso:`, pushErr);
      }
    }

    // Pull any sales from Turso not in local SQLite (limit 200)
    try {
      const tursoSalesRes = await turso.execute('SELECT * FROM sales ORDER BY created DESC LIMIT 200');
      const localSaleIds = new Set((db.prepare('SELECT id FROM sales').all() as any[]).map(r => r.id));

      for (const ts of tursoSalesRes.rows) {
        if (!localSaleIds.has(String(ts.id))) {
          db.prepare(`
            INSERT OR IGNORE INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier, synced)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `).run(
            String(ts.id), String(ts.created), ts.customer_id ? String(ts.customer_id) : null,
            String(ts.customer_name || 'Walk-in Patron'), String(ts.items), Number(ts.subtotal),
            Number(ts.discount || 0), Number(ts.total), Number(ts.earned || 0),
            Number(ts.redeemed || 0), String(ts.payment), Number(ts.tendered || 0),
            String(ts.order_type || 'takeaway'), String(ts.table_no || ''),
            String(ts.notes || ''), String(ts.status || 'completed'),
            String(ts.cashier || 'Cashier 1')
          );
        }
      }
    } catch (e) {}

    // -------------------------------------------------------------
    // STEP 7: BIDIRECTIONAL SETTINGS SYNC
    // -------------------------------------------------------------
    try {
      const localSettings = db.prepare('SELECT key, value, updated_at FROM settings').all() as any[];
      const tursoSetRes = await turso.execute('SELECT key, value, updated_at FROM settings');
      const tursoSettings = tursoSetRes.rows.map(r => ({ ...r })) as any[];

      const localSetMap = new Map<string, any>();
      for (const s of localSettings) localSetMap.set(String(s.key), s);

      const tursoSetMap = new Map<string, any>();
      for (const s of tursoSettings) tursoSetMap.set(String(s.key), s);

      const allKeys = new Set<string>([...localSetMap.keys(), ...tursoSetMap.keys()]);
      const tursoBatch: any[] = [];

      for (const key of allKeys) {
        const local = localSetMap.get(key);
        const remote = tursoSetMap.get(key);

        const localVal = local?.value !== undefined && local?.value !== null ? String(local.value) : '';
        const remoteVal = remote?.value !== undefined && remote?.value !== null ? String(remote.value) : '';
        const localTime = local?.updated_at ? new Date(local.updated_at).getTime() : 0;
        const remoteTime = remote?.updated_at ? new Date(remote.updated_at).getTime() : 0;

        // 1. Non-empty vs Empty: NEVER overwrite filled settings with empty strings!
        if (localVal && !remoteVal) {
          tursoBatch.push({
            sql: 'INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)',
            args: [key, localVal, local?.updated_at || new Date().toISOString()]
          });
        } else if (remoteVal && !localVal) {
          db.prepare('INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)').run(
            key, remoteVal, remote?.updated_at || new Date().toISOString()
          );
        }
        // 2. Both sides have values (or both empty), but they differ
        else if (localVal !== remoteVal) {
          if (localTime > remoteTime) {
            tursoBatch.push({
              sql: 'INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)',
              args: [key, localVal, local?.updated_at || new Date().toISOString()]
            });
          } else if (remoteTime > localTime) {
            db.prepare('INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)').run(
              key, remoteVal, remote?.updated_at || new Date().toISOString()
            );
          } else {
            // Tie-break: prefer local non-empty, otherwise remote
            if (localVal) {
              tursoBatch.push({
                sql: 'INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)',
                args: [key, localVal, new Date().toISOString()]
              });
            } else if (remoteVal) {
              db.prepare('INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)').run(
                key, remoteVal, new Date().toISOString()
              );
            }
          }
        }
      }

      if (tursoBatch.length > 0) {
        await turso.batch(tursoBatch, 'write');
      }
    } catch (setErr) {
      console.warn('Bidirectional settings sync warning:', setErr);
    }

    // -------------------------------------------------------------
    // STEP 8: BIDIRECTIONAL MEDIA (IMAGE) SYNC
    // -------------------------------------------------------------
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      mkdirSync(uploadsDir, { recursive: true });
    } catch {}

    // 8a. Download missing Turso media to local disk
    const mediaRes = await turso.execute('SELECT filename, data, mime_type FROM media');
    let downloadedMediaCount = 0;
    const tursoMediaNames = new Set<string>();

    for (const m of mediaRes.rows) {
      const filename = String(m.filename);
      tursoMediaNames.add(filename);
      const localFilePath = join(uploadsDir, filename);
      if (!existsSync(localFilePath) && m.data) {
        try {
          const buffer = Buffer.from(String(m.data), 'base64');
          writeFileSync(localFilePath, buffer);
          downloadedMediaCount++;
        } catch (writeErr) {}
      }
    }

    // 8b. Upload any local images missing from Turso media
    if (existsSync(uploadsDir)) {
      const localFiles = readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
      for (const f of localFiles) {
        if (!tursoMediaNames.has(f)) {
          try {
            const filePath = join(uploadsDir, f);
            const buffer = readFileSync(filePath);
            const ext = f.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
            await turso.execute({
              sql: 'INSERT OR REPLACE INTO media(filename, data, mime_type, updated_at) VALUES(?, ?, ?, ?)',
              args: [f, buffer.toString('base64'), mime, new Date().toISOString()]
            });
          } catch (uploadErr) {}
        }
      }
    }

    // Check remaining unsynced count
    const remainingUnsynced = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE synced = 0').get() as any)?.count || 0;
    const finalProductCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any)?.count || 0;
    const finalCustomerCount = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as any)?.count || 0;
    const finalCategoryCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as any)?.count || 0;

    return NextResponse.json({
      ok: true,
      pushedSales: pushedCount,
      downloadedMedia: downloadedMediaCount,
      categoriesCount: finalCategoryCount,
      productsCount: finalProductCount,
      customersCount: finalCustomerCount,
      pendingCount: remainingUnsynced,
      lastSyncTime: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Bidirectional Sync Error:', error);
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
