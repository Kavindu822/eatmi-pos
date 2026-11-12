'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  UserPlus,
  ShoppingBag,
  UtensilsCrossed,
  Bike,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  AlertTriangle,
  Gift,
  ArrowRight,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Category, Product, Customer, CartItem, Sale } from '@/lib/types';
import { formatRupees, formatShortRupees, calculateLoyaltyPoints } from '@/lib/utils';
import { playTapSound, playRegisterSound } from '@/lib/sound';
import NewCustomerModal from './NewCustomerModal';
import ItemModifierModal from './ItemModifierModal';

interface PosRegisterProps {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  settings?: Record<string, string>;
  onSaleCompleted: (sale: Sale, updatedCustomer?: Customer) => void;
  onRefreshData: () => Promise<void>;
  audioEnabled: boolean;
}

export default function PosRegister({
  categories,
  products,
  customers,
  settings,
  onSaleCompleted,
  onRefreshData,
  audioEnabled
}: PosRegisterProps) {
  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'takeaway' | 'dine_in' | 'delivery'>('takeaway');
  const [tableNo, setTableNo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'QR'>('Cash');
  const [tenderedRupees, setTenderedRupees] = useState<number>(0);
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [modifierModalOpen, setModifierModalOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  // Customer Search Container Ref (to close on outside click / tap)
  const customerSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowCustomerDropdown(false);
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCustomerDropdown]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category match
      if (selectedCategory !== 'all') {
        const catMatch = p.category_id === selectedCategory || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
        if (!catMatch) return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesCategory = p.category.toLowerCase().includes(q);
        const matchesDietary = (p.dietary || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCategory && !matchesDietary) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Customer search list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8);
  }, [customers, customerSearch]);

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  // Loyalty Points Redemption
  // 1 point = Rs. 1.00 (100 cents)
  const maxRedeemablePoints = useMemo(() => {
    if (!selectedCustomer || !redeemPoints) return 0;
    const maxPointsBySubtotal = Math.floor(subtotal / 100);
    return Math.min(selectedCustomer.points, maxPointsBySubtotal);
  }, [selectedCustomer, redeemPoints, subtotal]);

  const pointsDiscount = maxRedeemablePoints * 100; // in cents

  const totalDiscount = Math.min(subtotal, pointsDiscount);
  const total = Math.max(0, subtotal - totalDiscount);

  const loyaltyRate = Math.max(1, Number(settings?.loyalty_rate_rupees) || 300);

  // Loyalty Accrual Rule: 1 Point for every Rs. X spent (customizable by admin)
  const pointsEarned = useMemo(() => {
    if (!selectedCustomer) return 0;
    return calculateLoyaltyPoints(total, loyaltyRate);
  }, [selectedCustomer, total, loyaltyRate]);

  // Cash tendered in cents
  const tenderedCents = paymentMethod === 'Cash' ? (tenderedRupees > 0 ? tenderedRupees * 100 : total) : total;
  const changeDueCents = Math.max(0, tenderedCents - total);

  // Cart actions
  const addToCart = (product: Product, modifiers = '', customNotes = '') => {
    if (product.stock <= 0) return;
    playTapSound(audioEnabled);

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.id === product.id && item.modifiers === modifiers);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const nextQty = updated[existingIndex].qty + 1;
        if (nextQty > product.stock) return prev; // Cannot exceed stock
        updated[existingIndex] = { ...updated[existingIndex], qty: nextQty };
        return updated;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          qty: 1,
          image: product.image || '',
          modifiers,
          notes: customNotes
        }
      ];
    });
  };

  const updateQty = (index: number, delta: number) => {
    playTapSound(audioEnabled);
    setCart(prev => {
      const item = prev[index];
      const prod = products.find(p => p.id === item.id);
      const newQty = item.qty + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      if (prod && newQty > prod.stock) {
        return prev;
      }

      const updated = [...prev];
      updated[index] = { ...item, qty: newQty };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    playTapSound(audioEnabled);
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setRedeemPoints(false);
    setTenderedRupees(0);
    setTenderedInput('');
    setNotes('');
    setTableNo('');
  };

  // Tender shortcuts
  const setQuickTender = (rupees: number) => {
    playTapSound(audioEnabled);
    setTenderedRupees(rupees);
    setTenderedInput(rupees > 0 ? String(rupees) : '');
  };

  // Tender add shortcuts (e.g. +100, +500)
  const addTender = (addRupees: number) => {
    playTapSound(audioEnabled);
    const base = tenderedRupees > 0 ? tenderedRupees : Math.ceil(total / 100);
    const next = base + addRupees;
    setTenderedRupees(next);
    setTenderedInput(String(next));
  };

  // Complete Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Please add items to cart.');
      return;
    }

    if (orderType === 'dine_in' && !tableNo.trim()) {
      setErrorMessage('Please enter Table Number for Dine-In order.');
      return;
    }

    if (paymentMethod === 'Cash' && tenderedCents < total) {
      setErrorMessage('Tendered cash must be greater than or equal to total amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          items: cart,
          customerId: selectedCustomer ? selectedCustomer.id : null,
          redeemed: redeemPoints ? maxRedeemablePoints : 0,
          promoDiscount: 0,
          payment: paymentMethod,
          tendered: tenderedCents,
          order_type: orderType,
          table_no: tableNo.trim(),
          notes: notes.trim(),
          status: 'preparing',
          cashier: 'Cashier 1'
        })
      });

      const data = await res.json();

      if (data.ok && data.sale) {
        // Automatically kick cash drawer for Cash sales
        if (paymentMethod === 'Cash') {
          try {
            fetch('/api/open-drawer', { method: 'POST' }).catch(() => {});
          } catch {}
        }
        playRegisterSound(audioEnabled);
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 }
          });
        } catch (e) {}

        onSaleCompleted(data.sale, data.customer);
        clearCart();
        await onRefreshData();
      } else {
        setErrorMessage(data.error || 'Failed to complete checkout');
      }
    } catch (err: any) {
      setErrorMessage('Checkout failed. Network or server error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-61px)] overflow-hidden bg-stone-100">
      {/* ======================================================== */}
      {/* LEFT PANE: CATEGORIES & PRODUCT GRID                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-stone-200">
        {/* Top Controls: Category Carousel & Search Bar */}
        <div className="p-3 bg-white border-b border-stone-200 space-y-2.5 shadow-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search pastries, cakes, bread, coffee (or scan SKU barcode)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-stone-800 placeholder-stone-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs Carousel with Category Images */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* All Pill */}
            <button
              onClick={() => {
                setSelectedCategory('all');
                playTapSound(audioEnabled);
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-amber-400'
              }`}
            >
              <span>✨</span>
              <span>All Items</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-amber-700/60 text-amber-100' : 'bg-stone-200 text-stone-600'}`}>
                {products.length}
              </span>
            </button>

            {/* Dynamic Categories */}
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id || selectedCategory === cat.slug;
              const count = products.filter(p => p.category_id === cat.id || p.category.toLowerCase().includes(cat.name.toLowerCase())).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    playTapSound(audioEnabled);
                  }}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition group ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-amber-400'
                  }`}
                >
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-5 h-5 rounded-md object-cover flex-shrink-0 ring-1 ring-black/10"
                    />
                  ) : (
                    <span>{cat.icon || '🏷️'}</span>
                  )}
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-amber-700/60 text-amber-100' : 'bg-stone-100 text-stone-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 bg-stone-100/70">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400">
              <ShoppingBag className="w-12 h-12 stroke-[1.5] text-stone-300 mb-2" />
              <p className="text-sm font-semibold text-stone-600">No items found</p>
              <p className="text-xs text-stone-400 max-w-xs mt-1">
                No products match "{searchQuery}" in this category. You can add new items in the Owner Portal anytime!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filteredProducts.map(product => {
                const inCart = cart.find(c => c.id === product.id);
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`relative flex flex-col bg-white rounded-2xl border transition-all duration-150 overflow-hidden select-none ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed border-stone-200'
                        : 'cursor-pointer hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 active:scale-[0.98] border-stone-200/90'
                    }`}
                  >
                    {/* Product Photo */}
                    <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700 font-bold text-2xl">
                          {product.name.charAt(0)}
                        </div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-sm">
                            Sold Out
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                            Only {product.stock} left
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-black/60 text-white backdrop-blur-xs">
                            {product.stock} in stock
                          </span>
                        )}
                      </div>

                      {/* Specialty Badge */}
                      {product.badge && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-sm">
                          {product.badge}
                        </span>
                      )}

                      {/* In Cart Indicator */}
                      {inCart && (
                        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-lg ring-2 ring-white">
                          {inCart.qty}
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-stone-400 mb-0.5">
                          <span className="truncate">{product.category}</span>
                          <span className="font-mono text-[9px]">{product.sku}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-stone-900 line-clamp-2 leading-tight">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="font-mono font-bold text-xs md:text-sm text-stone-900">
                          {formatRupees(product.price)}
                        </span>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setCustomizingProduct(product);
                            setModifierModalOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-amber-600 transition"
                          title="Customize Temperature / Packaging / Notes"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANE: CART & CHECKOUT DRAWER                       */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[420px] 2xl:w-[460px] flex flex-col h-full bg-white border-l border-stone-200 shadow-lg">
        {/* Order Mode Tabs: Takeaway | Dine-In | Delivery */}
        <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-2">
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            <button
              onClick={() => setOrderType('takeaway')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition ${
                orderType === 'takeaway'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>

            <button
              onClick={() => setOrderType('dine_in')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition ${
                orderType === 'dine_in'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>

            <button
              onClick={() => setOrderType('delivery')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition ${
                orderType === 'delivery'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {orderType === 'dine_in' && (
            <input
              type="text"
              placeholder="Table #"
              value={tableNo}
              onChange={e => setTableNo(e.target.value)}
              className="w-20 px-2 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          )}
        </div>

        {/* Customer Loyalty Attachment Section */}
        <div className="p-3 border-b border-stone-200 bg-amber-50/40 relative">
          {selectedCustomer ? (
            /* Selected Customer Badge */
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-100/70 border border-amber-300/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-stone-900">{selectedCustomer.name}</span>
                    <span className="text-[10px] font-mono text-stone-500">{selectedCustomer.phone}</span>
                    {selectedCustomer.email && (
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                        {selectedCustomer.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-amber-900">
                    <span>Balance: <b>{selectedCustomer.points} pts</b></span>
                    <span>·</span>
                    <span className="text-emerald-700 font-bold">
                      +{pointsEarned} pts on this bill (Rs. {loyaltyRate} = 1 pt)
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setRedeemPoints(false);
                }}
                className="text-stone-400 hover:text-stone-700 text-xs font-semibold px-2 py-1"
              >
                Detach
              </button>
            </div>
          ) : (
            /* Search / Attach Customer */
            <div className="relative space-y-1.5" ref={customerSearchRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Attach loyalty patron (Search name or phone)..."
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  />
                  {/* Inline Collapse/Dismiss Button */}
                  {showCustomerDropdown && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerDropdown(false);
                        playTapSound(audioEnabled);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                      title="Close patron list (or tap anywhere outside)"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setNewCustomerModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs shrink-0"
                  title="Register new patron"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New</span>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showCustomerDropdown && (
                <>
                  {/* Invisible Fullscreen Backdrop to dismiss on ANY side click / touch outside */}
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowCustomerDropdown(false)}
                    onTouchStart={() => setShowCustomerDropdown(false)}
                  />

                  <div className="absolute top-11 left-0 right-0 z-30 bg-white rounded-xl shadow-2xl border border-amber-200 divide-y divide-stone-100 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Header with dismiss button */}
                    <div className="px-3 py-1.5 bg-amber-50/80 flex items-center justify-between text-[11px] text-amber-900 font-semibold sticky top-0 z-10 border-b border-amber-100">
                      <span>Select Patron ({filteredCustomers.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowCustomerDropdown(false)}
                        className="flex items-center gap-0.5 text-[10px] text-stone-500 hover:text-stone-800 px-1.5 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-50 transition shadow-xs"
                        title="Close list"
                      >
                        <X className="w-3 h-3" />
                        <span>Close</span>
                      </button>
                    </div>

                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-stone-500">
                        No patrons found.{' '}
                        <button
                          onClick={() => {
                            setShowCustomerDropdown(false);
                            setNewCustomerModalOpen(true);
                          }}
                          className="text-amber-600 font-semibold underline"
                        >
                          Register new
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.map(cust => (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setShowCustomerDropdown(false);
                            setCustomerSearch('');
                            playTapSound(audioEnabled);
                          }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <div className="font-semibold text-stone-900">{cust.name}</div>
                            <div className="text-[10px] text-stone-500 font-mono">{cust.phone}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-700">{cust.points} pts</span>
                            <div className="text-[9px] text-stone-400">{cust.visits} visits</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Points Redemption Toggle */}
          {selectedCustomer && selectedCustomer.points > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={redeemPoints}
                  onChange={e => setRedeemPoints(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-semibold text-amber-950">
                  Redeem {maxRedeemablePoints} points (-{formatRupees(pointsDiscount)})
                </span>
              </label>
              <span className="text-[10px] text-stone-500">1 pt = Rs. 1</span>
            </div>
          )}
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 p-6">
              <ShoppingBag className="w-10 h-10 stroke-[1.5] text-stone-300 mb-2" />
              <p className="text-xs font-semibold text-stone-600">Cart is empty</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Tap pastries or items on the left to add them to this order
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/80 hover:border-stone-300 transition"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {item.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h5 className="font-semibold text-xs text-stone-900 truncate">{item.name}</h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                      <span className="font-mono">{formatShortRupees(item.price)} each</span>
                      {item.modifiers && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                          {item.modifiers}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <div className="text-[9px] text-stone-500 italic truncate">Note: {item.notes}</div>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center bg-white rounded-lg border border-stone-200">
                    <button
                      onClick={() => updateQty(idx, -1)}
                      className="p-1 hover:bg-stone-100 text-stone-600 rounded-l-lg transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-xs text-stone-800">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(idx, 1)}
                      className="p-1 hover:bg-stone-100 text-stone-600 rounded-r-lg transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="w-16 text-right font-mono font-bold text-xs text-stone-900">
                    {formatShortRupees(item.price * item.qty)}
                  </span>

                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-stone-300 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Financial Breakdown & Tender */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 space-y-2.5">
          {/* Subtotal, Discount & Total */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span className="font-mono">{formatRupees(subtotal)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Loyalty Points Discount:</span>
                <span className="font-mono">-{formatRupees(totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-200">
              <span>Total Payable:</span>
              <span className="font-mono text-amber-800 text-lg">{formatRupees(total)}</span>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => {
                setPaymentMethod('Cash');
                playTapSound(audioEnabled);
              }}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                paymentMethod === 'Cash'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash</span>
            </button>

            <button
              onClick={() => {
                setPaymentMethod('Card');
                playTapSound(audioEnabled);
              }}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                paymentMethod === 'Card'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>Card</span>
            </button>

            <button
              onClick={() => {
                setPaymentMethod('QR');
                playTapSound(audioEnabled);
              }}
              className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                paymentMethod === 'QR'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>QR / Transfer</span>
            </button>
          </div>

          {/* Cash Tender Input & Change Due */}
          {paymentMethod === 'Cash' && total > 0 && (
            <div className="space-y-2 pt-1.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              {/* Header: Label + Reset */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customer Given Money (Rs.):</span>
                </span>
                {tenderedRupees > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTenderedInput('');
                      setTenderedRupees(0);
                      playTapSound(audioEnabled);
                    }}
                    className="text-[10px] text-stone-400 hover:text-stone-700 underline font-mono"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Type Given Money Input Box */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold font-mono text-sm">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={tenderedInput}
                  onChange={e => {
                    const val = e.target.value;
                    setTenderedInput(val);
                    const num = parseFloat(val);
                    setTenderedRupees(isNaN(num) ? 0 : Math.max(0, num));
                  }}
                  placeholder={`${(total / 100).toLocaleString()} (e.g. 1600)`}
                  className="w-full pl-10 pr-24 py-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-base text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const exact = Math.ceil(total / 100);
                      setTenderedInput(String(exact));
                      setTenderedRupees(exact);
                      playTapSound(audioEnabled);
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold font-mono transition"
                    title="Fill exact bill amount"
                  >
                    Exact
                  </button>
                </div>
              </div>

              {/* Currency Presets & Quick Add */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {[500, 1000, 1500, 2000, 2500, 5000, 10000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickTender(amt)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono whitespace-nowrap transition border ${
                        tenderedRupees === amt
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      Rs. {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Quick Add Chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-400 font-semibold mr-0.5">+Add:</span>
                  {[50, 100, 500, 1000].map(inc => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => addTender(inc)}
                      className="px-2 py-0.5 rounded-md bg-stone-200/80 hover:bg-stone-300 text-[10px] font-bold font-mono text-stone-700 transition"
                      title={`Add Rs. ${inc} to received amount`}
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Change Indicator */}
              <div className="pt-0.5">
                {tenderedRupees > 0 && tenderedCents < total ? (
                  <div className="flex items-center justify-between bg-rose-950 text-white p-2.5 rounded-xl font-mono shadow-sm border border-rose-800">
                    <div>
                      <span className="text-xs text-rose-300 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Short / Still Due:
                      </span>
                      <span className="text-[10px] text-rose-200/70">
                        Received: {formatRupees(tenderedCents)}
                      </span>
                    </div>
                    <div className="text-right font-extrabold text-rose-400 text-base">
                      -{formatRupees(total - tenderedCents)}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-stone-900 text-white p-2.5 rounded-xl font-mono shadow-sm">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        <span className="text-xs text-stone-300 font-semibold">Change to Give Back:</span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {tenderedRupees > 0 && tenderedRupees * 100 !== total
                          ? `Received: ${formatRupees(tenderedCents)}`
                          : `Exact Payment (${formatRupees(total)})`}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-400 text-lg sm:text-xl">
                        {formatRupees(changeDueCents)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Complete Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <span>Processing Sale...</span>
            ) : (
              <>
                <span>Complete Order ({formatRupees(total)})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      <NewCustomerModal
        isOpen={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        loyaltyRate={loyaltyRate}
        onCustomerCreated={cust => {
          setSelectedCustomer(cust);
          onRefreshData();
        }}
      />

      <ItemModifierModal
        isOpen={modifierModalOpen}
        onClose={() => setModifierModalOpen(false)}
        product={customizingProduct}
        onConfirm={(prod, mods, customNotes) => {
          addToCart(prod, mods, customNotes);
        }}
      />
    </div>
  );
}

