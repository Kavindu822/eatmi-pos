export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  display_order?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  category: string;
  price: number; // in cents (e.g. 45000 = Rs. 450.00)
  cost?: number; // in cents
  stock: number;
  image?: string;
  badge?: string;
  dietary?: string;
  description?: string;
  is_active?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  spent: number; // in cents
  visits: number;
  created_at?: string;
}

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number; // in cents
  qty: number;
  image?: string;
  modifiers?: string;
  notes?: string;
}

export interface Sale {
  id: string;
  created: string;
  customer_id: string | null;
  customer_name: string;
  items: string; // JSON string of CartItem[]
  subtotal: number;
  discount: number;
  total: number;
  earned: number; // points earned: 1 point per Rs. 300 spent
  redeemed: number; // points redeemed
  payment: 'Cash' | 'Card' | 'QR';
  tendered: number;
  order_type: 'takeaway' | 'dine_in' | 'delivery';
  table_no?: string;
  notes?: string;
  status: 'completed' | 'preparing' | 'ready' | 'cancelled';
  cashier?: string;
}

export interface SummaryStats {
  todayRevenue: number;
  todayOrdersCount: number;
  avgOrderValue: number;
  cashRevenue: number;
  cardRevenue: number;
  qrRevenue: number;
  topPastries: { name: string; count: number; revenue: number }[];
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  totalPointsIssued: number;
}

