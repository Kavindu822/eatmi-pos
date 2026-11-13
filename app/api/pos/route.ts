import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getTursoClient } from '@/lib/turso';

function isCloudEnvironment(): boolean {
  if (process.env.VERCEL === '1' || process.env.USE_TURSO === '1') return true;
  // If local SQLite file doesn't exist, fall back to Turso cloud
  const localDbPath = join(process.cwd(), 'counter.sqlite');
  return !existsSync(localDbPath);
}

// Helper to compute POS summary metrics (used in both Local & Cloud mode)
function computeSummary(products: any[], customers: any[], sales: any[]) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s: any) => s.created && s.created.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
  const todayOrdersCount = todaySales.length;
  const avgOrderValue = todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0;

  let cashRevenue = 0;
  let cardRevenue = 0;
  let qrRevenue = 0;

  for (const s of todaySales) {
    if (s.payment === 'Cash') cashRevenue += s.total || 0;
    else if (s.payment === 'Card') cardRevenue += s.total || 0;
    else if (s.payment === 'QR') qrRevenue += s.total || 0;
  }

  // Item popularity counters
  const itemMap = new Map<string, { count: number; revenue: number }>();
  for (const s of todaySales) {
    try {
      const lines = typeof s.items === 'string' ? JSON.parse(s.items) : s.items;
      if (Array.isArray(lines)) {
        for (const line of lines) {
          const cur = itemMap.get(line.name) || { count: 0, revenue: 0 };
          cur.count += line.qty || 1;
          cur.revenue += (line.price || 0) * (line.qty || 1);
          itemMap.set(line.name, cur);
        }
      }
    } catch (e) {}
  }

  const topPastries = Array.from(itemMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }));

  const totalPointsIssued = customers.reduce((sum: number, c: any) => sum + (c.points || 0), 0);

  return {
    todayRevenue,
    todayOrdersCount,
    avgOrderValue,
    cashRevenue,
    cardRevenue,
    qrRevenue,
    topPastries,
    totalProducts: products.length,
    lowStockCount: products.filter((p: any) => p.stock > 0 && p.stock <= 5).length,
    outOfStockCount: products.filter((p: any) => p.stock <= 0).length,
    totalCustomers: customers.length,
    totalPointsIssued
  };
}

export async function GET() {
  try {
    const isCloud = isCloudEnvironment();

    if (isCloud) {
      // -------------------------------------------------------------
      // CLOUD MODE (TURSO DATABASE on VERCEL)
      // -------------------------------------------------------------
      const turso = getTursoClient();
      const [catRes, prodRes, custRes, salesRes, setRes] = await Promise.all([
        turso.execute('SELECT * FROM categories ORDER BY display_order ASC, name ASC'),
        turso.execute('SELECT * FROM products ORDER BY category ASC, name ASC'),
        turso.execute('SELECT * FROM customers ORDER BY points DESC, name ASC'),
        turso.execute('SELECT * FROM sales ORDER BY created DESC LIMIT 2000'),
        turso.execute('SELECT key, value FROM settings')
      ]);

      const categories = catRes.rows.map(r => ({ ...r }));
      const products = prodRes.rows.map(r => ({ ...r }));
      const customers = custRes.rows.map(r => ({ ...r }));
      const sales = salesRes.rows.map(r => ({ ...r }));

      const settings: Record<string, string> = {};
      for (const row of setRes.rows) {
        settings[String(row.key)] = String(row.value);
      }

      const summary = computeSummary(products, customers, sales);

      return NextResponse.json({
        categories,
        products,
        customers,
        sales,
        settings,
        summary,
        cloudMode: true
      });
    }

    // -------------------------------------------------------------
    // LOCAL MODE (OFFLINE SQLITE ON CASHIER PC)
    // -------------------------------------------------------------
    const { getDatabase } = await import('@/lib/db');
    const db = getDatabase();

    const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC, name ASC').all() as any[];
    const products = db.prepare('SELECT * FROM products ORDER BY category ASC, name ASC').all() as any[];
    const customers = db.prepare('SELECT * FROM customers ORDER BY points DESC, name ASC').all() as any[];
    const sales = db.prepare('SELECT * FROM sales ORDER BY created DESC LIMIT 2000').all() as any[];
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];

    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    const summary = computeSummary(products, customers, sales);

    return NextResponse.json({
      categories,
      products,
      customers,
      sales,
      settings,
      summary,
      cloudMode: false
    });
  } catch (error: any) {
    console.error('POS GET Error:', error);
    return NextResponse.json({ error: 'Failed to load POS data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isCloud = isCloudEnvironment();
    const b = await req.json();

    // =============================================================
    // 1. ACTION: checkout
    // =============================================================
    if (b.action === 'checkout') {
      const id = b.id ? String(b.id) : `SALE-${Date.now().toString().slice(-6)}`;

      if (!Array.isArray(b.items) || b.items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty. Please add items.' }, { status: 400 });
      }

      const requestedQty = new Map<string, number>();
      for (const item of b.items) {
        const pid = String(item.id);
        const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
        requestedQty.set(pid, (requestedQty.get(pid) || 0) + qty);
      }

      if (isCloud) {
        // --- CLOUD CHECKOUT (Turso) ---
        const turso = getTursoClient();
        const productMap = new Map<string, any>();

        for (const [pid, qty] of requestedQty.entries()) {
          const res = await turso.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [pid] });
          const prod = res.rows[0];
          if (!prod) {
            return NextResponse.json({ error: `Product ID "${pid}" does not exist in catalog.` }, { status: 400 });
          }
          if (Number(prod.stock) < qty) {
            return NextResponse.json({
              error: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, In Cart: ${qty}.`
            }, { status: 400 });
          }
          productMap.set(pid, prod);
        }

        const lineItems = [];
        let subtotal = 0;
        for (const item of b.items) {
          const pid = String(item.id);
          const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
          const prod = productMap.get(pid)!;

          lineItems.push({
            id: pid,
            name: prod.name,
            sku: prod.sku,
            price: prod.price,
            qty,
            image: prod.image || '',
            modifiers: typeof item.modifiers === 'string' ? item.modifiers.slice(0, 150) : '',
            notes: typeof item.notes === 'string' ? item.notes.slice(0, 150) : ''
          });
          subtotal += Number(prod.price) * qty;
        }

        let customer: any = null;
        if (b.customerId) {
          const custRes = await turso.execute({ sql: 'SELECT * FROM customers WHERE id=?', args: [String(b.customerId)] });
          customer = custRes.rows[0] || null;
        }

        const redeemed = Math.max(0, Math.floor(Number(b.redeemed) || 0));
        if (redeemed > 0) {
          if (!customer) {
            return NextResponse.json({ error: 'Customer must be selected to redeem points.' }, { status: 400 });
          }
          if (redeemed > Number(customer.points)) {
            return NextResponse.json({ error: `Redeemed points (${redeemed}) exceed customer balance (${customer.points}).` }, { status: 400 });
          }
        }

        const pointsDiscount = redeemed * 100;
        const promoDiscount = Math.max(0, Math.floor(Number(b.promoDiscount) || 0));
        const discount = Math.min(subtotal, pointsDiscount + promoDiscount);
        const total = subtotal - discount;

        const rateSettingRes = await turso.execute("SELECT value FROM settings WHERE key='loyalty_rate_rupees'");
        const loyaltyRateRupees = Math.max(1, Number(rateSettingRes.rows[0]?.value) || 300);
        const totalRupees = Math.floor(total / 100);
        const earned = customer ? Math.floor(totalRupees / loyaltyRateRupees) : 0;

        const payment = ['Cash', 'Card', 'QR'].includes(b.payment) ? b.payment : 'Cash';
        const tendered = payment === 'Cash' ? Math.max(total, Math.floor(Number(b.tendered) || total)) : total;

        if (tendered < total) {
          return NextResponse.json({ error: `Cash tendered (Rs. ${(tendered / 100).toFixed(2)}) is less than total bill (Rs. ${(total / 100).toFixed(2)}).` }, { status: 400 });
        }

        const orderType = ['takeaway', 'dine_in', 'delivery'].includes(b.order_type) ? b.order_type : 'takeaway';
        const tableNo = String(b.table_no || '').slice(0, 30);
        const notes = String(b.notes || '').slice(0, 300);
        const status = String(b.status || 'completed');
        const cashier = String(b.cashier || 'Cashier 1');

        const sale = {
          id,
          created: new Date().toISOString(),
          customer_id: customer ? customer.id : null,
          customer_name: customer ? customer.name : 'Walk-in Patron',
          items: JSON.stringify(lineItems),
          subtotal,
          discount,
          total,
          earned,
          redeemed,
          payment,
          tendered,
          order_type: orderType,
          table_no: tableNo,
          notes,
          status,
          cashier,
          synced: 1
        };

        const batchStatements: any[] = [
          {
            sql: `INSERT INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier, synced)
                  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            args: [
              sale.id, sale.created, sale.customer_id, sale.customer_name, sale.items,
              sale.subtotal, sale.discount, sale.total, sale.earned, sale.redeemed,
              sale.payment, sale.tendered, sale.order_type, sale.table_no, sale.notes,
              sale.status, sale.cashier
            ]
          }
        ];

        const now = new Date().toISOString();

        for (const [pid, qty] of requestedQty.entries()) {
          batchStatements.push({
            sql: 'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
            args: [qty, now, pid]
          });
        }

        if (customer) {
          batchStatements.push({
            sql: `UPDATE customers 
                  SET points = points - ? + ?,
                      spent = spent + ?,
                      visits = visits + 1,
                      updated_at = ?
                  WHERE id = ?`,
            args: [redeemed, earned, total, now, customer.id]
          });
        }

        await turso.batch(batchStatements, 'write');

        const updatedCustRes = customer
          ? await turso.execute({ sql: 'SELECT * FROM customers WHERE id=?', args: [customer.id] })
          : null;

        return NextResponse.json({
          ok: true,
          sale,
          customer: updatedCustRes?.rows[0] || null,
          loyaltyEarned: earned,
          message: `Sale #${sale.id} completed! Earned: ${earned} pts`
        });
      }

      // --- LOCAL CHECKOUT (SQLite) ---
      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();

      const productMap = new Map<string, any>();
      for (const [pid, qty] of requestedQty.entries()) {
        const prod = db.prepare('SELECT * FROM products WHERE id=?').get(pid) as any;
        if (!prod) {
          return NextResponse.json({ error: `Product ID "${pid}" does not exist in catalog.` }, { status: 400 });
        }
        if (prod.stock < qty) {
          return NextResponse.json({
            error: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, In Cart: ${qty}.`
          }, { status: 400 });
        }
        productMap.set(pid, prod);
      }

      const lineItems = [];
      let subtotal = 0;
      for (const item of b.items) {
        const pid = String(item.id);
        const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
        const prod = productMap.get(pid)!;

        lineItems.push({
          id: pid,
          name: prod.name,
          sku: prod.sku,
          price: prod.price,
          qty,
          image: prod.image || '',
          modifiers: typeof item.modifiers === 'string' ? item.modifiers.slice(0, 150) : '',
          notes: typeof item.notes === 'string' ? item.notes.slice(0, 150) : ''
        });
        subtotal += prod.price * qty;
      }

      const customer = b.customerId
        ? (db.prepare('SELECT * FROM customers WHERE id=?').get(String(b.customerId)) as any)
        : null;

      const redeemed = Math.max(0, Math.floor(Number(b.redeemed) || 0));
      if (redeemed > 0) {
        if (!customer) {
          return NextResponse.json({ error: 'Customer must be selected to redeem points.' }, { status: 400 });
        }
        if (redeemed > customer.points) {
          return NextResponse.json({ error: `Redeemed points (${redeemed}) exceed customer balance (${customer.points}).` }, { status: 400 });
        }
      }

      const pointsDiscount = redeemed * 100;
      const promoDiscount = Math.max(0, Math.floor(Number(b.promoDiscount) || 0));
      const discount = Math.min(subtotal, pointsDiscount + promoDiscount);
      const total = subtotal - discount;

      const rateSetting = db.prepare("SELECT value FROM settings WHERE key='loyalty_rate_rupees'").get() as any;
      const loyaltyRateRupees = Math.max(1, Number(rateSetting?.value) || 300);
      const totalRupees = Math.floor(total / 100);
      const earned = customer ? Math.floor(totalRupees / loyaltyRateRupees) : 0;

      const payment = ['Cash', 'Card', 'QR'].includes(b.payment) ? b.payment : 'Cash';
      const tendered = payment === 'Cash' ? Math.max(total, Math.floor(Number(b.tendered) || total)) : total;

      if (tendered < total) {
        return NextResponse.json({ error: `Cash tendered (Rs. ${(tendered / 100).toFixed(2)}) is less than total bill (Rs. ${(total / 100).toFixed(2)}).` }, { status: 400 });
      }

      const orderType = ['takeaway', 'dine_in', 'delivery'].includes(b.order_type) ? b.order_type : 'takeaway';
      const tableNo = String(b.table_no || '').slice(0, 30);
      const notes = String(b.notes || '').slice(0, 300);
      const status = String(b.status || 'completed');
      const cashier = String(b.cashier || 'Cashier 1');

      const sale = {
        id,
        created: new Date().toISOString(),
        customer_id: customer ? customer.id : null,
        customer_name: customer ? customer.name : 'Walk-in Patron',
        items: JSON.stringify(lineItems),
        subtotal,
        discount,
        total,
        earned,
        redeemed,
        payment,
        tendered,
        order_type: orderType,
        table_no: tableNo,
        notes,
        status,
        cashier,
        synced: 0
      };

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          INSERT INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier, synced)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          sale.id, sale.created, sale.customer_id, sale.customer_name, sale.items,
          sale.subtotal, sale.discount, sale.total, sale.earned, sale.redeemed,
          sale.payment, sale.tendered, sale.order_type, sale.table_no, sale.notes,
          sale.status, sale.cashier
        );

        const now = new Date().toISOString();

        for (const [pid, qty] of requestedQty.entries()) {
          db.prepare('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?').run(qty, now, pid);
        }

        let finalCustomerPoints = 0;
        let finalCustomerSpent = 0;
        let finalCustomerVisits = 0;

        if (customer) {
          finalCustomerPoints = Math.max(0, (customer.points || 0) - redeemed + earned);
          finalCustomerSpent = (customer.spent || 0) + total;
          finalCustomerVisits = (customer.visits || 0) + 1;

          db.prepare(`
            UPDATE customers 
            SET points = ?,
                spent = ?,
                visits = ?,
                updated_at = ?
            WHERE id = ?
          `).run(finalCustomerPoints, finalCustomerSpent, finalCustomerVisits, now, customer.id);
        }

        db.exec('COMMIT');

        // Immediately replicate product stock reductions to Turso Cloud so cloud sync never restores old stock
        for (const [pid, qty] of requestedQty.entries()) {
          try {
            const turso = getTursoClient();
            await turso.execute({
              sql: 'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
              args: [qty, now, pid]
            });
          } catch (cloudErr) {}
        }

        // Immediately replicate to Turso Cloud so background sync never restores old points
        if (customer) {
          try {
            const turso = getTursoClient();
            await turso.execute({
              sql: `UPDATE customers 
                    SET points = ?, spent = ?, visits = ?, updated_at = ?
                    WHERE id = ?`,
              args: [finalCustomerPoints, finalCustomerSpent, finalCustomerVisits, now, customer.id]
            });
          } catch (cloudErr) {}
        }
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      const updatedCustomer = customer
        ? db.prepare('SELECT * FROM customers WHERE id=?').get(customer.id)
        : null;

      return NextResponse.json({
        ok: true,
        sale,
        customer: updatedCustomer,
        loyaltyEarned: earned,
        message: `Sale #${sale.id} completed! Earned: ${earned} pts`
      });
    }

    // =============================================================
    // 2. ACTION: category
    // =============================================================
    if (b.action === 'category') {
      const id = b.id ? String(b.id) : `cat-${Date.now()}`;
      const name = String(b.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

      const slug = String(b.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      const icon = String(b.icon || '🏷️').trim();
      const image = String(b.image || '').trim();
      const description = String(b.description || '').trim();
      const display_order = Math.floor(Number(b.display_order) || 10);

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({
          sql: `
            INSERT INTO categories(id, name, slug, icon, image, description, display_order)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              slug=excluded.slug,
              icon=excluded.icon,
              image=excluded.image,
              description=excluded.description,
              display_order=excluded.display_order
          `,
          args: [id, name, slug, icon, image, description, display_order]
        });
        const res = await turso.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [id] });
        return NextResponse.json({ ok: true, category: res.rows[0] });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
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
      `).run(id, name, slug, icon, image, description, display_order);

      // Replicate to Turso if online
      try {
        const turso = getTursoClient();
        await turso.execute({
          sql: `
            INSERT INTO categories(id, name, slug, icon, image, description, display_order)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              slug=excluded.slug,
              icon=excluded.icon,
              image=excluded.image,
              description=excluded.description,
              display_order=excluded.display_order
          `,
          args: [id, name, slug, icon, image, description, display_order]
        });
      } catch (cloudErr) {}

      const category = db.prepare('SELECT * FROM categories WHERE id=?').get(id);
      return NextResponse.json({ ok: true, category });
    }

    // =============================================================
    // 3. ACTION: delete_category
    // =============================================================
    if (b.action === 'delete_category') {
      const id = String(b.id);

      if (isCloud) {
        const turso = getTursoClient();
        const catRes = await turso.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [id] });
        const category = catRes.rows[0];
        if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

        const countRes = await turso.execute({
          sql: 'SELECT COUNT(*) as count FROM products WHERE category_id=? OR category=?',
          args: [id, String(category.name)]
        });
        const assignedCount = Number(countRes.rows[0]?.count || 0);

        if (assignedCount > 0) {
          return NextResponse.json({
            error: `Cannot delete category "${category.name}". It currently has ${assignedCount} assigned item(s). Every menu item must have a category (category is mandatory). Please reassign or delete the items first.`
          }, { status: 400 });
        }

        await turso.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [id] });
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, 'categories', new Date().toISOString()]
        });
        return NextResponse.json({ ok: true });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      const category = db.prepare('SELECT * FROM categories WHERE id=?').get(id) as any;
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

      const assignedCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id=? OR category=?').get(id, category.name) as any)?.count || 0;
      if (assignedCount > 0) {
        return NextResponse.json({
          error: `Cannot delete category "${category.name}". It currently has ${assignedCount} assigned item(s). Every menu item must have a category (category is mandatory). Please reassign or delete the items first.`
        }, { status: 400 });
      }

      db.prepare('DELETE FROM categories WHERE id=?').run(id);
      db.prepare('INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)').run(id, 'categories', new Date().toISOString());
      try {
        const turso = getTursoClient();
        await turso.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [id] });
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, 'categories', new Date().toISOString()]
        });
      } catch (cloudErr) {}
      return NextResponse.json({ ok: true });
    }

    // =============================================================
    // 4. ACTION: product
    // =============================================================
    if (b.action === 'product') {
      const id = b.id ? String(b.id) : `prod-${Date.now()}`;
      const name = String(b.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });

      const category_id = String(b.category_id || '').trim();
      if (!category_id) {
        return NextResponse.json({ error: 'Category is mandatory. Every menu item must be assigned to a category.' }, { status: 400 });
      }

      const sku = String(b.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`).trim();
      const price = Math.max(1, Math.floor(Number(b.price) || 0));
      const cost = Math.max(0, Math.floor(Number(b.cost) || 0));
      const stock = Math.max(0, Math.floor(Number(b.stock) || 0));
      const image = String(b.image || '').trim();
      const badge = String(b.badge || '').trim();
      const dietary = String(b.dietary || '').trim();
      const description = String(b.description || '').trim();
      const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1;
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        const catRes = await turso.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [category_id] });
        const targetCategory = catRes.rows[0];
        if (!targetCategory) {
          return NextResponse.json({ error: 'Selected category does not exist. Please select a valid category.' }, { status: 400 });
        }
        const category = String(targetCategory.name);

        await turso.execute({
          sql: `
            INSERT INTO products(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              is_active=excluded.is_active,
              updated_at=excluded.updated_at
          `,
          args: [id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active, now]
        });

        const prodRes = await turso.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [id] });
        return NextResponse.json({ ok: true, product: prodRes.rows[0] });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      const targetCategory = db.prepare('SELECT * FROM categories WHERE id=?').get(category_id) as any;
      if (!targetCategory) {
        return NextResponse.json({ error: 'Selected category does not exist. Please select a valid category.' }, { status: 400 });
      }
      const category = targetCategory.name;

      db.prepare(`
        INSERT INTO products(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          is_active=excluded.is_active,
          updated_at=excluded.updated_at
      `).run(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active, now);

      // Replicate to Turso if online
      try {
        const turso = getTursoClient();
        await turso.execute({
          sql: `
            INSERT INTO products(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              is_active=excluded.is_active,
              updated_at=excluded.updated_at
          `,
          args: [id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active, now]
        });
      } catch (cloudErr) {}

      const product = db.prepare('SELECT * FROM products WHERE id=?').get(id);
      return NextResponse.json({ ok: true, product });
    }

    // =============================================================
    // 5. ACTION: delete_product
    // =============================================================
    if (b.action === 'delete_product') {
      const id = String(b.id);
      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({ sql: 'DELETE FROM products WHERE id=?', args: [id] });
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, 'products', new Date().toISOString()]
        });
        return NextResponse.json({ ok: true });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      db.prepare('DELETE FROM products WHERE id=?').run(id);
      db.prepare('INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)').run(id, 'products', new Date().toISOString());
      try {
        const turso = getTursoClient();
        await turso.execute({ sql: 'DELETE FROM products WHERE id=?', args: [id] });
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, 'products', new Date().toISOString()]
        });
      } catch (cloudErr) {}
      return NextResponse.json({ ok: true });
    }

    // =============================================================
    // 6. ACTION: restock
    // =============================================================
    if (b.action === 'restock') {
      const id = String(b.id);
      const qty = Math.max(1, Math.floor(Number(b.qty) || 1));
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({ sql: 'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?', args: [qty, now, id] });
        const prodRes = await turso.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [id] });
        return NextResponse.json({ ok: true, product: prodRes.rows[0] });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      db.prepare('UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?').run(qty, now, id);
      try {
        const turso = getTursoClient();
        await turso.execute({ sql: 'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?', args: [qty, now, id] });
      } catch (cloudErr) {}
      const product = db.prepare('SELECT * FROM products WHERE id=?').get(id);
      return NextResponse.json({ ok: true, product });
    }

    // =============================================================
    // 7. ACTION: customer
    // =============================================================
    if (b.action === 'customer') {
      const id = b.id ? String(b.id) : `cust-${Date.now()}`;
      const name = String(b.name || '').trim();
      const phone = String(b.phone || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const now = new Date().toISOString();

      if (!name || !phone) {
        return NextResponse.json({ error: 'Full Name and Mobile Phone Number are compulsory.' }, { status: 400 });
      }

      if (isCloud) {
        const turso = getTursoClient();
        const existing = await turso.execute({ sql: 'SELECT id FROM customers WHERE phone=?', args: [phone] });
        if (existing.rows.length > 0) {
          return NextResponse.json({ error: 'A customer with this phone number already exists.' }, { status: 400 });
        }
        await turso.execute({
          sql: `INSERT INTO customers(id, name, phone, email, points, spent, visits, created_at, updated_at)
                VALUES(?, ?, ?, ?, 0, 0, 0, ?, ?)`,
          args: [id, name, phone, email, now, now]
        });
        const custRes = await turso.execute({ sql: 'SELECT * FROM customers WHERE id=?', args: [id] });
        return NextResponse.json({ ok: true, customer: custRes.rows[0] });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      const existing = db.prepare('SELECT id FROM customers WHERE phone=?').get(phone);
      if (existing) {
        return NextResponse.json({ error: 'A customer with this phone number already exists.' }, { status: 400 });
      }
      db.prepare(`
        INSERT INTO customers(id, name, phone, email, points, spent, visits, created_at, updated_at)
        VALUES(?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).run(id, name, phone, email, now, now);

      // Replicate to Turso if online
      try {
        const turso = getTursoClient();
        await turso.execute({
          sql: `INSERT INTO customers(id, name, phone, email, points, spent, visits, created_at, updated_at)
                VALUES(?, ?, ?, ?, 0, 0, 0, ?, ?)`,
          args: [id, name, phone, email, now, now]
        });
      } catch (cloudErr) {}

      const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      return NextResponse.json({ ok: true, customer });
    }

    // =============================================================
    // 8. ACTION: update_customer
    // =============================================================
    if (b.action === 'update_customer') {
      const id = String(b.id || '');
      const name = String(b.name || '').trim();
      const phone = String(b.phone || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const now = new Date().toISOString();

      if (!id || !name || !phone) {
        return NextResponse.json({ error: 'Full Name and Phone Number are compulsory.' }, { status: 400 });
      }

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({
          sql: 'UPDATE customers SET name=?, phone=?, email=?, updated_at=? WHERE id=?',
          args: [name, phone, email, now, id]
        });
        const custRes = await turso.execute({ sql: 'SELECT * FROM customers WHERE id=?', args: [id] });
        return NextResponse.json({ ok: true, customer: custRes.rows[0] });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      db.prepare('UPDATE customers SET name=?, phone=?, email=?, updated_at=? WHERE id=?').run(name, phone, email, now, id);

      try {
        const turso = getTursoClient();
        await turso.execute({
          sql: 'UPDATE customers SET name=?, phone=?, email=?, updated_at=? WHERE id=?',
          args: [name, phone, email, now, id]
        });
      } catch (cloudErr) {}

      const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      return NextResponse.json({ ok: true, customer });
    }

    // =============================================================
    // 8b. ACTION: delete_customer
    // =============================================================
    if (b.action === 'delete_customer') {
      const id = String(b.id || '');
      if (!id) {
        return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
      }
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        // Unlink customer from historical sales to prevent FOREIGN KEY constraint failure
        try {
          await turso.execute({ sql: 'UPDATE sales SET customer_id = NULL WHERE customer_id = ?', args: [id] });
        } catch (e) {}
        await turso.execute({ sql: 'DELETE FROM customers WHERE id=?', args: [id] });
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, 'customers', now]
        });
        return NextResponse.json({ ok: true, message: 'Patron deleted successfully' });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      // Unlink customer from historical sales to prevent FOREIGN KEY constraint failure
      try {
        db.prepare('UPDATE sales SET customer_id = NULL WHERE customer_id = ?').run(id);
      } catch (e) {}
      db.prepare('DELETE FROM customers WHERE id=?').run(id);
      db.prepare('INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)').run(id, 'customers', now);

      try {
        const turso = getTursoClient();
        try {
          await turso.execute({ sql: 'UPDATE sales SET customer_id = NULL WHERE customer_id = ?', args: [id] });
        } catch (e) {}
        await turso.execute({ sql: 'DELETE FROM customers WHERE id=?', args: [id] });
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO deleted_records(id, table_name, deleted_at) VALUES(?, ?, ?)',
          args: [id, 'customers', now]
        });
      } catch (cloudErr) {}

      return NextResponse.json({ ok: true, message: 'Patron deleted successfully' });
    }

    // =============================================================
    // 9. ACTION: update_customer_points
    // =============================================================
    if (b.action === 'update_customer_points') {
      const id = String(b.id);
      const points = Math.max(0, Math.floor(Number(b.points) || 0));
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({ sql: 'UPDATE customers SET points=?, updated_at=? WHERE id=?', args: [points, now, id] });
        const custRes = await turso.execute({ sql: 'SELECT * FROM customers WHERE id=?', args: [id] });
        return NextResponse.json({ ok: true, customer: custRes.rows[0] });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      db.prepare('UPDATE customers SET points=?, updated_at=? WHERE id=?').run(points, now, id);

      try {
        const turso = getTursoClient();
        await turso.execute({ sql: 'UPDATE customers SET points=?, updated_at=? WHERE id=?', args: [points, now, id] });
      } catch (cloudErr) {}

      const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      return NextResponse.json({ ok: true, customer });
    }

    // =============================================================
    // 10. ACTION: update_order_status (Kitchen Display KDS)
    // =============================================================
    if (b.action === 'update_order_status') {
      const id = String(b.id);
      const status = String(b.status);

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({ sql: 'UPDATE sales SET status=? WHERE id=?', args: [status, id] });
        return NextResponse.json({ ok: true });
      }

      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      db.prepare('UPDATE sales SET status=? WHERE id=?').run(status, id);
      return NextResponse.json({ ok: true });
    }

    // =============================================================
    // 11. ACTION: verify_pin
    // =============================================================
    if (b.action === 'verify_pin') {
      const enteredPin = String(b.pin || '').trim();

      let validPin = '1234';
      if (isCloud) {
        const turso = getTursoClient();
        const pinRes = await turso.execute("SELECT value FROM settings WHERE key='owner_pin'");
        validPin = String(pinRes.rows[0]?.value || '1234');
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        const currentPinRow = db.prepare("SELECT value FROM settings WHERE key='owner_pin'").get() as any;
        validPin = currentPinRow?.value || '1234';
      }

      if (enteredPin === validPin) {
        return NextResponse.json({ ok: true, verified: true });
      } else {
        return NextResponse.json({ ok: false, error: 'Incorrect Owner PIN. Default is 1234.' }, { status: 401 });
      }
    }

    // =============================================================
    // 12. ACTION: update_pin
    // =============================================================
    if (b.action === 'update_pin') {
      const newPin = String(b.pin || '').trim();
      if (!newPin || newPin.length < 4) {
        return NextResponse.json({ error: 'PIN must be at least 4 digits.' }, { status: 400 });
      }
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({
          sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_pin', ?, ?)",
          args: [newPin, now]
        });
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        db.prepare("INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_pin', ?, ?)").run(newPin, now);
        try {
          const turso = getTursoClient();
          await turso.execute({
            sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_pin', ?, ?)",
            args: [newPin, now]
          });
        } catch (e) {}
      }

      return NextResponse.json({ ok: true, message: 'Owner PIN updated successfully.' });
    }

    // =============================================================
    // 13. ACTION: recover_pin
    // =============================================================
    if (b.action === 'recover_pin') {
      const recoveryInput = String(b.recovery_input || '').trim();
      const newPin = String(b.new_pin || '').trim();

      if (!recoveryInput) {
        return NextResponse.json({ error: 'Please enter the Master Recovery Key or Registered Phone Number.' }, { status: 400 });
      }
      if (!newPin || newPin.length < 4) {
        return NextResponse.json({ error: 'New PIN must be at least 4 digits.' }, { status: 400 });
      }

      let validMasterKey = 'EATMI-8899';
      let validPhone = '';

      if (isCloud) {
        const turso = getTursoClient();
        const [mkRes, phRes] = await Promise.all([
          turso.execute("SELECT value FROM settings WHERE key='master_recovery_key'"),
          turso.execute("SELECT value FROM settings WHERE key='owner_recovery_phone'")
        ]);
        validMasterKey = (String(mkRes.rows[0]?.value || 'EATMI-8899')).trim().toUpperCase();
        validPhone = (String(phRes.rows[0]?.value || '')).trim();
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        const masterKeyRow = db.prepare("SELECT value FROM settings WHERE key='master_recovery_key'").get() as any;
        validMasterKey = (masterKeyRow?.value || 'EATMI-8899').trim().toUpperCase();
        const phoneRow = db.prepare("SELECT value FROM settings WHERE key='owner_recovery_phone'").get() as any;
        validPhone = (phoneRow?.value || '').trim();
      }

      const cleanInput = recoveryInput.toUpperCase().replace(/\s+/g, '');
      const cleanPhone = validPhone.replace(/[\s\-\+]/g, '');
      const cleanInputPhone = recoveryInput.replace(/[\s\-\+]/g, '');

      const isMatch = (cleanInput === validMasterKey.replace(/\s+/g, '')) || 
                      (cleanPhone && cleanInputPhone && cleanInputPhone === cleanPhone);

      if (!isMatch) {
        return NextResponse.json({
          error: 'Invalid Master Recovery Key or Phone Number. Please check your credentials.'
        }, { status: 401 });
      }

      const now = new Date().toISOString();
      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({
          sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_pin', ?, ?)",
          args: [newPin, now]
        });
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        db.prepare("INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_pin', ?, ?)").run(newPin, now);
        try {
          const turso = getTursoClient();
          await turso.execute({
            sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_pin', ?, ?)",
            args: [newPin, now]
          });
        } catch (e) {}
      }

      return NextResponse.json({ ok: true, verified: true, message: 'Owner PIN successfully reset!' });
    }

    // =============================================================
    // 14. ACTION: update_recovery_settings
    // =============================================================
    if (b.action === 'update_recovery_settings') {
      const masterKey = String(b.master_recovery_key || '').trim().toUpperCase();
      const phone = String(b.owner_recovery_phone || '').trim();
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        if (masterKey) {
          await turso.execute({
            sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('master_recovery_key', ?, ?)",
            args: [masterKey, now]
          });
        }
        if (phone !== undefined) {
          await turso.execute({
            sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_recovery_phone', ?, ?)",
            args: [phone, now]
          });
        }
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        if (masterKey) {
          db.prepare("INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('master_recovery_key', ?, ?)").run(masterKey, now);
        }
        if (phone !== undefined) {
          db.prepare("INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_recovery_phone', ?, ?)").run(phone, now);
        }
        try {
          const turso = getTursoClient();
          if (masterKey) {
            await turso.execute({
              sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('master_recovery_key', ?, ?)",
              args: [masterKey, now]
            });
          }
          if (phone !== undefined) {
            await turso.execute({
              sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('owner_recovery_phone', ?, ?)",
              args: [phone, now]
            });
          }
        } catch (e) {}
      }

      return NextResponse.json({ ok: true, message: 'Emergency recovery settings updated successfully.' });
    }

    // =============================================================
    // 15. ACTION: update_receipt_settings & update_email_settings
    // =============================================================
    if (b.action === 'update_receipt_settings' || b.action === 'update_email_settings') {
      const allowedKeys = [
        'receipt_store_name',
        'receipt_tagline',
        'receipt_address',
        'receipt_phone',
        'receipt_header_note',
        'receipt_footer_1',
        'receipt_footer_2',
        'receipt_paper_width',
        'receipt_print_density',
        'receipt_font_style',
        'receipt_font_size',
        'receipt_show_logo',
        'receipt_show_loyalty',
        'receipt_show_barcode',
        'receipt_auto_cut_margin',
        'loyalty_rate_rupees',
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_pass',
        'smtp_from_name',
        'smtp_secure'
      ];

      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        const batch: any[] = [];
        for (const key of allowedKeys) {
          if (b[key] !== undefined) {
            batch.push({
              sql: 'INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)',
              args: [key, String(b[key]), now]
            });
          }
        }
        if (batch.length > 0) {
          await turso.batch(batch, 'write');
        }
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        for (const key of allowedKeys) {
          if (b[key] !== undefined) {
            db.prepare('INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)').run(key, String(b[key]), now);
          }
        }

        // Also push immediately to Turso Cloud so Vercel is in sync instantly
        try {
          const turso = getTursoClient();
          const batch: any[] = [];
          for (const key of allowedKeys) {
            if (b[key] !== undefined) {
              batch.push({
                sql: 'INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES(?, ?, ?)',
                args: [key, String(b[key]), now]
              });
            }
          }
          if (batch.length > 0) {
            await turso.batch(batch, 'write');
          }
        } catch (cloudErr) {
          console.warn('Could not push settings to Turso immediately (offline):', cloudErr);
        }
      }

      return NextResponse.json({ ok: true, message: 'Settings saved successfully!' });
    }

    // =============================================================
    // 16. ACTION: update_loyalty_rate
    // =============================================================
    if (b.action === 'update_loyalty_rate') {
      const rate = Math.max(1, Math.floor(Number(b.rate) || 300));
      const now = new Date().toISOString();

      if (isCloud) {
        const turso = getTursoClient();
        await turso.execute({
          sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('loyalty_rate_rupees', ?, ?)",
          args: [String(rate), now]
        });
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        db.prepare("INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('loyalty_rate_rupees', ?, ?)").run(String(rate), now);
        try {
          const turso = getTursoClient();
          await turso.execute({
            sql: "INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('loyalty_rate_rupees', ?, ?)",
            args: [String(rate), now]
          });
        } catch (e) {}
      }

      return NextResponse.json({ ok: true, rate, message: `Loyalty rule updated: Every Rs. ${rate} spent earns 1 reward point.` });
    }

    // =============================================================
    // 17. ACTION: clear_all_sales (Reset Test Transactions)
    // =============================================================
    if (b.action === 'clear_all_sales') {
      const enteredPin = String(b.pin || '').trim();

      // Verify Owner PIN or Master Key
      let validPin = '1234';
      let masterKey = 'EATMI-8899';
      if (isCloud) {
        const turso = getTursoClient();
        const pinRes = await turso.execute("SELECT key, value FROM settings WHERE key IN ('owner_pin', 'master_recovery_key')");
        for (const row of pinRes.rows) {
          if (row.key === 'owner_pin') validPin = String(row.value || '1234');
          if (row.key === 'master_recovery_key') masterKey = String(row.value || 'EATMI-8899');
        }
      } else {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        const pinRow = db.prepare("SELECT value FROM settings WHERE key='owner_pin'").get() as any;
        const keyRow = db.prepare("SELECT value FROM settings WHERE key='master_recovery_key'").get() as any;
        if (pinRow?.value) validPin = pinRow.value;
        if (keyRow?.value) masterKey = keyRow.value;
      }

      if (enteredPin !== validPin && enteredPin !== masterKey) {
        return NextResponse.json({ ok: false, error: 'Incorrect Owner PIN. Please enter your valid 4-digit PIN (default: 1234).' }, { status: 401 });
      }

      const resetCustomers = Boolean(b.resetCustomers !== false);
      const now = new Date().toISOString();

      // Wipe from local SQLite
      try {
        const { getDatabase } = await import('@/lib/db');
        const db = getDatabase();
        db.prepare('DELETE FROM sales').run();
        if (resetCustomers) {
          db.prepare('UPDATE customers SET points = 0, spent = 0, visits = 0, updated_at = ?').run(now);
        }
      } catch (e) {
        // Local SQLite might not exist in cloud environment
      }

      // Wipe from Turso Cloud
      try {
        const turso = getTursoClient();
        await turso.execute('DELETE FROM sales');
        if (resetCustomers) {
          await turso.execute({
            sql: 'UPDATE customers SET points = 0, spent = 0, visits = 0, updated_at = ?',
            args: [now]
          });
        }
      } catch (cloudErr) {
        console.warn('Could not wipe sales on Turso Cloud:', cloudErr);
      }

      return NextResponse.json({
        ok: true,
        message: 'All test sales records have been cleared from both Local PC and Cloud databases! Sales history has been reset to Rs. 0.00.'
      });
    }

    return NextResponse.json({ error: 'Unknown action requested' }, { status: 400 });
  } catch (error: any) {
    console.error('POS POST Error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
