import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { randomUUID } from 'node:crypto';

export async function GET() {
  try {
    const db = getDatabase();

    const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC, name ASC').all() as any[];
    const products = db.prepare('SELECT * FROM products ORDER BY category ASC, name ASC').all() as any[];
    const customers = db.prepare('SELECT * FROM customers ORDER BY points DESC, name ASC').all() as any[];
    const sales = db.prepare('SELECT * FROM sales ORDER BY created DESC LIMIT 500').all() as any[];
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];

    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    // Daily Sales & Summary
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
        const lines = JSON.parse(s.items);
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

    return NextResponse.json({
      categories,
      products,
      customers,
      sales,
      settings,
      summary: {
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
      }
    });
  } catch (error: any) {
    console.error('POS GET Error:', error);
    return NextResponse.json({ error: 'Failed to load POS data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabase();
    const b = await req.json();

    // -------------------------------------------------------------
    // ACTION: checkout (High-Speed POS Register Sale)
    // -------------------------------------------------------------
    if (b.action === 'checkout') {
      const id = b.id ? String(b.id) : `SALE-${Date.now().toString().slice(-6)}`;

      if (!Array.isArray(b.items) || b.items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty. Please add items.' }, { status: 400 });
      }

      // Aggregate item quantities
      const requestedQty = new Map<string, number>();
      for (const item of b.items) {
        const pid = String(item.id);
        const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
        requestedQty.set(pid, (requestedQty.get(pid) || 0) + qty);
      }

      // Verify stock
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

      // Build validated line items & calculate subtotal
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

      // Check customer loyalty
      const customer = b.customerId
        ? (db.prepare('SELECT * FROM customers WHERE id=?').get(String(b.customerId)) as any)
        : null;

      // Loyalty points redemption: 1 pt = Rs. 1 (100 cents)
      const redeemed = Math.max(0, Math.floor(Number(b.redeemed) || 0));
      if (redeemed > 0) {
        if (!customer) {
          return NextResponse.json({ error: 'Customer must be selected to redeem points.' }, { status: 400 });
        }
        if (redeemed > customer.points) {
          return NextResponse.json({ error: `Redeemed points (${redeemed}) exceed customer balance (${customer.points}).` }, { status: 400 });
        }
      }

      const pointsDiscount = redeemed * 100; // 1 pt = Rs. 1.00 (100 cents)
      const promoDiscount = Math.max(0, Math.floor(Number(b.promoDiscount) || 0));
      const discount = Math.min(subtotal, pointsDiscount + promoDiscount);
      const total = subtotal - discount;

      // ===============================================================
      // LOYALTY RULE: 1 point for every Rs. X spent (admin customizable)!
      // e.g. buy Rs. 300 -> 1 pt, buy Rs. 600 -> 2 pts, buy Rs. 900 -> 3 pts...
      // ===============================================================
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
      const status = String(b.status || 'preparing');
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
        cashier
      };

      // Execute database operations
      db.exec('BEGIN IMMEDIATE');
      try {
        // 1. Insert sale record
        db.prepare(`
          INSERT INTO sales(id, created, customer_id, customer_name, items, subtotal, discount, total, earned, redeemed, payment, tendered, order_type, table_no, notes, status, cashier)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sale.id, sale.created, sale.customer_id, sale.customer_name, sale.items,
          sale.subtotal, sale.discount, sale.total, sale.earned, sale.redeemed,
          sale.payment, sale.tendered, sale.order_type, sale.table_no, sale.notes,
          sale.status, sale.cashier
        );

        // 2. Decrement inventory stock
        for (const [pid, qty] of requestedQty.entries()) {
          db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, pid);
        }

        // 3. Update customer loyalty balance & stats
        if (customer) {
          db.prepare(`
            UPDATE customers 
            SET points = points - ? + ?,
                spent = spent + ?,
                visits = visits + 1
            WHERE id = ?
          `).run(redeemed, earned, total, customer.id);
        }

        db.exec('COMMIT');
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

    // -------------------------------------------------------------
    // ACTION: category (Add / Edit Category with Image)
    // -------------------------------------------------------------
    if (b.action === 'category') {
      const id = b.id ? String(b.id) : `cat-${Date.now()}`;
      const name = String(b.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

      const slug = String(b.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      const icon = String(b.icon || '🏷️').trim();
      const image = String(b.image || '').trim();
      const description = String(b.description || '').trim();
      const display_order = Math.floor(Number(b.display_order) || 10);

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

      const category = db.prepare('SELECT * FROM categories WHERE id=?').get(id);
      return NextResponse.json({ ok: true, category });
    }

    // -------------------------------------------------------------
    // ACTION: delete_category (PREVENT DELETION IF ITEMS ARE ASSIGNED)
    // -------------------------------------------------------------
    if (b.action === 'delete_category') {
      const id = String(b.id);
      
      const category = db.prepare('SELECT * FROM categories WHERE id=?').get(id) as any;
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      // Check if any products are assigned to this category
      const assignedCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id=? OR category=?').get(id, category.name) as any)?.count || 0;

      if (assignedCount > 0) {
        return NextResponse.json({
          error: `Cannot delete category "${category.name}". It currently has ${assignedCount} assigned item(s). Every menu item must have a category (category is mandatory). Please reassign or delete the items first.`
        }, { status: 400 });
      }

      db.prepare('DELETE FROM categories WHERE id=?').run(id);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // ACTION: product (Add / Edit Product with Mandatory Category)
    // -------------------------------------------------------------
    if (b.action === 'product') {
      const id = b.id ? String(b.id) : `prod-${Date.now()}`;
      const name = String(b.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });

      // CATEGORY IS MANDATORY
      const category_id = String(b.category_id || '').trim();
      if (!category_id) {
        return NextResponse.json({ error: 'Category is mandatory. Every menu item must be assigned to a category.' }, { status: 400 });
      }

      const targetCategory = db.prepare('SELECT * FROM categories WHERE id=?').get(category_id) as any;
      if (!targetCategory) {
        return NextResponse.json({ error: 'Selected category does not exist. Please select a valid category.' }, { status: 400 });
      }

      const category = targetCategory.name;
      const sku = String(b.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`).trim();
      // Price stored in cents (e.g. Rs. 450 -> 45000 cents)
      const price = Math.max(1, Math.floor(Number(b.price) || 0));
      const cost = Math.max(0, Math.floor(Number(b.cost) || 0));
      const stock = Math.max(0, Math.floor(Number(b.stock) || 0));
      const image = String(b.image || '').trim();
      const badge = String(b.badge || '').trim();
      const dietary = String(b.dietary || '').trim();
      const description = String(b.description || '').trim();
      const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1;

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
      `).run(id, name, sku, category_id, category, price, cost, stock, image, badge, dietary, description, is_active);

      const product = db.prepare('SELECT * FROM products WHERE id=?').get(id);
      return NextResponse.json({ ok: true, product });
    }

    // -------------------------------------------------------------
    // ACTION: delete_product
    // -------------------------------------------------------------
    if (b.action === 'delete_product') {
      const id = String(b.id);
      db.prepare('DELETE FROM products WHERE id=?').run(id);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // ACTION: restock (Quick Batch Restock, e.g. +12 baked)
    // -------------------------------------------------------------
    if (b.action === 'restock') {
      const id = String(b.id);
      const qty = Math.max(1, Math.floor(Number(b.qty) || 1));
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, id);
      const product = db.prepare('SELECT * FROM products WHERE id=?').get(id);
      return NextResponse.json({ ok: true, product });
    }

    // -------------------------------------------------------------
    // ACTION: customer (Register New Patron)
    // -------------------------------------------------------------
    if (b.action === 'customer') {
      const id = b.id ? String(b.id) : `cust-${Date.now()}`;
      const name = String(b.name || '').trim();
      const phone = String(b.phone || '').trim();
      const email = String(b.email || '').trim().toLowerCase();

      if (!name || !phone) {
        return NextResponse.json({ error: 'Full Name and Mobile Phone Number are compulsory.' }, { status: 400 });
      }

      // Check unique phone
      const existing = db.prepare('SELECT id FROM customers WHERE phone=?').get(phone);
      if (existing) {
        return NextResponse.json({ error: 'A customer with this phone number already exists.' }, { status: 400 });
      }

      db.prepare(`
        INSERT INTO customers(id, name, phone, email, points, spent, visits, created_at)
        VALUES(?, ?, ?, ?, 0, 0, 0, ?)
      `).run(id, name, phone, email, new Date().toISOString());

      const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      return NextResponse.json({ ok: true, customer });
    }

    // -------------------------------------------------------------
    // ACTION: update_customer (Edit Patron Details & Email)
    // -------------------------------------------------------------
    if (b.action === 'update_customer') {
      const id = String(b.id || '');
      const name = String(b.name || '').trim();
      const phone = String(b.phone || '').trim();
      const email = String(b.email || '').trim().toLowerCase();

      if (!id || !name || !phone) {
        return NextResponse.json({ error: 'Full Name and Phone Number are compulsory.' }, { status: 400 });
      }

      db.prepare(`
        UPDATE customers SET name=?, phone=?, email=? WHERE id=?
      `).run(name, phone, email, id);

      const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      return NextResponse.json({ ok: true, customer });
    }

    // -------------------------------------------------------------
    // ACTION: update_customer_points (Owner manual adjustment)
    // -------------------------------------------------------------
    if (b.action === 'update_customer_points') {
      const id = String(b.id);
      const points = Math.max(0, Math.floor(Number(b.points) || 0));
      db.prepare('UPDATE customers SET points=? WHERE id=?').run(points, id);
      const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(id);
      return NextResponse.json({ ok: true, customer });
    }

    // -------------------------------------------------------------
    // ACTION: update_order_status (For Kitchen Display KDS)
    // -------------------------------------------------------------
    if (b.action === 'update_order_status') {
      const id = String(b.id);
      const status = String(b.status);
      db.prepare('UPDATE sales SET status=? WHERE id=?').run(status, id);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // ACTION: verify_pin (Owner Portal Access Check)
    // -------------------------------------------------------------
    if (b.action === 'verify_pin') {
      const enteredPin = String(b.pin || '').trim();
      const currentPinRow = db.prepare("SELECT value FROM settings WHERE key='owner_pin'").get() as any;
      const validPin = currentPinRow?.value || '1234';
      if (enteredPin === validPin) {
        return NextResponse.json({ ok: true, verified: true });
      } else {
        return NextResponse.json({ ok: false, error: 'Incorrect Owner PIN. Default is 1234.' }, { status: 401 });
      }
    }

    // -------------------------------------------------------------
    // ACTION: update_pin
    // -------------------------------------------------------------
    if (b.action === 'update_pin') {
      const newPin = String(b.pin || '').trim();
      if (!newPin || newPin.length < 4) {
        return NextResponse.json({ error: 'PIN must be at least 4 digits.' }, { status: 400 });
      }
      db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES('owner_pin', ?)").run(newPin);
      return NextResponse.json({ ok: true, message: 'Owner PIN updated successfully.' });
    }

    // -------------------------------------------------------------
    // ACTION: recover_pin (Emergency Master Recovery)
    // -------------------------------------------------------------
    if (b.action === 'recover_pin') {
      const recoveryInput = String(b.recovery_input || '').trim();
      const newPin = String(b.new_pin || '').trim();

      if (!recoveryInput) {
        return NextResponse.json({ error: 'Please enter the Master Recovery Key or Registered Phone Number.' }, { status: 400 });
      }
      if (!newPin || newPin.length < 4) {
        return NextResponse.json({ error: 'New PIN must be at least 4 digits.' }, { status: 400 });
      }

      const masterKeyRow = db.prepare("SELECT value FROM settings WHERE key='master_recovery_key'").get() as any;
      const validMasterKey = (masterKeyRow?.value || 'EATMI-8899').trim().toUpperCase();

      const phoneRow = db.prepare("SELECT value FROM settings WHERE key='owner_recovery_phone'").get() as any;
      const validPhone = (phoneRow?.value || '').trim();

      const cleanInput = recoveryInput.toUpperCase().replace(/\s+/g, '');
      const cleanPhone = validPhone.replace(/[\s\-\+]/g, '');
      const cleanInputPhone = recoveryInput.replace(/[\s\-\+]/g, '');

      const isMatch = (cleanInput === validMasterKey.replace(/\s+/g, '')) || 
                      (cleanPhone && cleanInputPhone && cleanInputPhone === cleanPhone);

      if (!isMatch) {
        return NextResponse.json({
          error: 'Invalid Master Recovery Key or Phone Number. Please check your credentials or run ResetPin.cmd on the shop computer.'
        }, { status: 401 });
      }

      db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES('owner_pin', ?)").run(newPin);
      return NextResponse.json({ ok: true, verified: true, message: 'Owner PIN successfully reset!' });
    }

    // -------------------------------------------------------------
    // ACTION: update_recovery_settings
    // -------------------------------------------------------------
    if (b.action === 'update_recovery_settings') {
      const masterKey = String(b.master_recovery_key || '').trim().toUpperCase();
      const phone = String(b.owner_recovery_phone || '').trim();

      if (masterKey) {
        db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES('master_recovery_key', ?)").run(masterKey);
      }
      if (phone !== undefined) {
        db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES('owner_recovery_phone', ?)").run(phone);
      }

      return NextResponse.json({ ok: true, message: 'Emergency recovery settings updated successfully.' });
    }

    // -------------------------------------------------------------
    // ACTION: update_receipt_settings
    // -------------------------------------------------------------
    if (b.action === 'update_receipt_settings') {
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

      for (const key of allowedKeys) {
        if (b[key] !== undefined) {
          db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)").run(key, String(b[key]));
        }
      }

      return NextResponse.json({ ok: true, message: 'Settings saved successfully!' });
    }

    // -------------------------------------------------------------
    // ACTION: update_email_settings (Configure SMTP Server)
    // -------------------------------------------------------------
    if (b.action === 'update_email_settings') {
      const emailKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_name', 'smtp_secure'];
      for (const key of emailKeys) {
        if (b[key] !== undefined) {
          db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)").run(key, String(b[key]));
        }
      }
      return NextResponse.json({ ok: true, message: 'Email & SMTP settings saved successfully!' });
    }

    // -------------------------------------------------------------
    // ACTION: update_loyalty_rate
    // -------------------------------------------------------------
    if (b.action === 'update_loyalty_rate') {
      const rate = Math.max(1, Math.floor(Number(b.rate) || 300));
      db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES('loyalty_rate_rupees', ?)").run(String(rate));
      return NextResponse.json({ ok: true, rate, message: `Loyalty rule updated: Every Rs. ${rate} spent earns 1 reward point.` });
    }

    return NextResponse.json({ error: 'Unknown action requested' }, { status: 400 });
  } catch (error: any) {
    console.error('POS POST Error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

