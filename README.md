# EATmi · Online Cloud POS & Remote Owner Supervision System

A modern full-stack Point-of-Sale (POS), Kitchen Display (KDS), and Remote Owner Supervision platform built with **Next.js 15**, **React 19**, **Tailwind CSS**, and **SQLite / Cloud Database**.

Designed specifically for bakeries, cafes, and restaurants where **workers operate the cashier register in the physical shop** while the **business owner stays in a remote area and needs real-time access and supervision anytime from their smartphone or laptop**.

---

## 🌟 Key Features

### 1. 👨‍💼 Anytime Remote Owner Supervision (Mobile & Web)
- **Live Sales Stream**: Watch orders appear on your screen in real time as the cashier rings them up in the shop.
- **Financial KPIs**: Monitor Today's Gross Revenue (LKR / Rs.), Orders Count, Average Basket Value, and Tender Split (Cash vs. Card vs. QR).
- **Top Sellers**: Live ranking of today's best-selling pastries, breads, and drinks.
- **Stock Warnings**: Instant alerts when items are running low (≤ 5) or sold out (0).
- **One-Click Batch Restock**: Rapidly add fresh batches from the oven (`+12 Baked Fresh`, `+24`, or custom).
- **Owner Security PIN**: Protected by a customizable PIN (Default: `1234`) so workers on the shop counter terminal cannot access financial metrics or delete products.

---

### 2. 🎁 Loyalty Rewards: Buy Rs. 300 = Earn 1 Point
- **Accrual Formula**: **Every Rs. 300 spent earns 1 Reward Point** automatically!
  - Spend Rs. 150 ➔ 0 points
  - Spend Rs. 300 ➔ 1 point
  - Spend Rs. 600 ➔ 2 points
  - Spend Rs. 900 ➔ 3 points
  - Spend Rs. 1,500 ➔ 5 points
  - Spend Rs. 3,000 ➔ 10 points
- **Instant Redemption**: Patrons can redeem points at checkout for instant cash discounts (**1 point = Rs. 1.00 off**).
- **Patron Management**:
  - Search patrons by mobile phone or name with instant 3-character autocomplete.
  - Register new patrons on the fly in 5 seconds.
  - Track patron lifetime spending, total visits, and VIP tiers (Bronze, Silver Connoisseur, Gold Ambassador).
  - Owner manual point adjustments in the Owner Portal.

---

### 3. 📁 Main Categories & Custom Category Creation with Images
- **Main Pre-seeded Categories**:
  - 🥐 **Viennoiserie & Pastries** (Croissants, Cruffins, Pain au Chocolat)
  - 🍰 **Cakes & Pâtisserie** (Gateaux, Cheesecakes, Tarts)
  - 🧁 **Macarons & Delicacies** (Gift boxes, Eclairs, Paris-Brest)
  - 🥪 **Savory Bakes & Quiches** (Quiche Lorraine, Galettes)
  - 🥖 **Artisan Sourdough & Bread** (Country Boules, Baguettes, Brioche)
  - ☕ **Specialty Coffee & Drinks** (Flat Whites, Matcha, Hot Chocolate)
  - 🍛 **Hot Meals & Specials** (Breakfast plates, rolls, bowls)
- **Add / Edit Categories**:
  - Upload photos from your phone or computer.
  - Paste any web image URL.
  - Select from curated high-resolution bakery preset photos with one tap.
  - Custom emoji icons and display ordering.

---

### 4. 🥐 Menu Item Management with Images, Prices & Stock
- **Add Items under Any Category**:
  - Item Name & SKU Barcode.
  - Category selector (assign to any created category).
  - Selling Price in Sri Lankan Rupees (Rs.).
  - Wholesale Cost in Rs. (automatically calculates **Owner Profit Margin %**).
  - Available stock quantity.
  - Photo (Upload, URL, or Presets gallery).
  - Highlight Badges (`🔥 Oven Fresh`, `Bestseller`, `Chef's Signature`, `New`).
  - Dietary Tags (`Vegetarian`, `Gluten-Free`, `Contains Nuts`, `Vegan`).
  - Item description and flavor notes.

---

### 5. 🛒 Fast Cashier Register (Worker Terminal)
- **Visual Product Grid**: Touch-friendly cards showing product photos, prices, badges, and stock levels.
- **Fast Modifier Customizer**: Customize serving temperature (Warm in Oven 🔥, Toasted, Chilled), presentation (Bakery Bag, Ribbon Gift Box 🎀, Plate 🍽️), and milk choices (Whole, Oat 🌾, Almond 🌰).
- **Order Modes**: Takeaway, Dine-In (with Table Number), and Delivery.
- **Fast Cash Tender**: Quick chips for Exact, Rs. 500, Rs. 1,000, Rs. 2,000, Rs. 5,000, Rs. 10,000 with real-time Change Due indicator.
- **Print 80mm ESC/POS Thermal Receipt**: Ready for standard thermal receipt printers or standard A4 with full customer rewards summary printed on the slip.

---

### 6. 👨‍🍳 Live Kitchen Order Display (KDS)
- Kitchen tickets display in real-time.
- One-click workflow: `Preparing (In Oven 🔥)` ➔ `Ready for Counter 🔔` ➔ `Handed Over ✅`.

---

## 🚀 How to Run Locally

1. Open a terminal or double-click **`Start.cmd`** in the project folder:
   ```bash
   npm run dev
   ```
2. Open your browser:
   - **Local Machine**: [http://localhost:8787](http://localhost:8787)
   - **Shop Local Network (iPad / Tablets)**: `http://<YOUR_LOCAL_IP>:8787`

---

## 🌐 How the Remote Owner Connects From Anywhere

To supervise the shop from outside (home, car, or another city):

### Option A: Free Cloudflare Tunnel (Zero Hosting Cost, 2-Minute Setup)
Keep the shop PC running, and create a free secure public HTTPS address:
1. Download [cloudflared for Windows](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Run in terminal:
   ```bash
   cloudflared tunnel --url http://localhost:8787
   ```
3. Cloudflare gives you a free secure link (e.g. `https://xxxx-xxxx.trycloudflare.com`).
4. Bookmark that link on your smartphone or laptop. You now have full, encrypted, real-time remote access to the shop POS anytime, anywhere in the world!

### Option B: Cloud Hosting (Vercel / Railway / Render)
Deploy this Next.js app to Vercel or Railway:
1. Push this folder to a GitHub repository.
2. Import the project on [Vercel](https://vercel.com) or [Railway](https://railway.app).
3. Connect a free cloud PostgreSQL database (such as [Neon](https://neon.tech) or [Supabase](https://supabase.com)) by setting the `DATABASE_URL` environment variable.
4. Both the shop worker terminal and remote owner log into the same cloud URL!

---

## 🔐 Owner PIN & Emergency Recovery

### 1. Default Access
- **Default Owner PIN**: `1234`
- You can change your PIN at any time inside **Owner Portal ➔ Security & Access**.

### 2. If You Forget Your PIN (Remote / Online)
- On the PIN unlock popup, click **"Forgot PIN?"**.
- Enter your **Master Emergency Recovery Key** (Default: `EATMI-8899`) or your registered owner mobile phone number.
- Enter your desired new 4-digit PIN and click **"Reset PIN & Unlock"**.

### 3. If You Forget Your PIN (Local Shop Computer)
- Double-click **`ResetPin.cmd`** in this folder.
- It will instantly reset the owner PIN back to `1234`!

---

## 📦 Tech Stack
- **Framework**: Next.js 15 (App Router, Server Actions & API Routes)
- **Frontend**: React 19, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Audio Engine**: Web Audio API (Synthetic Register & Tap Chimes)
- **Database**: SQLite WAL mode via Node's native `DatabaseSync` (or Cloud Postgres)
- **Printing**: 80mm ESC/POS Thermal Receipt `@media print`
