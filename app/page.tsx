'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import PosRegister from '@/components/PosRegister';
import OwnerPortal from '@/components/OwnerPortal';
import KitchenKds from '@/components/KitchenKds';
import OwnerPinModal from '@/components/OwnerPinModal';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';
import { Category, Product, Customer, Sale, SummaryStats } from '@/lib/types';

export default function PosApp() {
  const [activeTab, setActiveTab] = useState<'register' | 'owner' | 'kds'>('register');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<SummaryStats>({
    todayRevenue: 0,
    todayOrdersCount: 0,
    avgOrderValue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    qrRevenue: 0,
    topPastries: [],
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalCustomers: 0,
    totalPointsIssued: 0
  });

  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [ownerPinModalOpen, setOwnerPinModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [activeCustomerPoints, setActiveCustomerPoints] = useState<number | undefined>(undefined);

  // Load POS Data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pos');
      const data = await res.json();
      if (data && !data.error) {
        setCategories(data.categories || []);
        setProducts(data.products || []);
        setCustomers(data.customers || []);
        setSales(data.sales || []);
        setSettings(data.settings || {});
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Safety timer: Ensure splash screen dismisses even on slow mobile networks
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3500);

    // Check saved audio preference
    if (typeof window !== 'undefined') {
      const savedAudio = localStorage.getItem('pos_audio_enabled');
      if (savedAudio !== null) setAudioEnabled(savedAudio === 'true');
      const savedOwner = sessionStorage.getItem('pos_owner_unlocked');
      if (savedOwner === 'true') setIsOwnerUnlocked(true);
    }
    return () => clearTimeout(safetyTimer);
  }, [fetchData]);

  // Live Background Sync between Cashier PC and Remote Supervisor
  useEffect(() => {
    // 3 seconds on KDS for kitchen tickets, 8 seconds on Register/Owner to sync images, stock, prices & sales
    const intervalMs = activeTab === 'kds' ? 3000 : 8000;
    const timer = setInterval(() => {
      fetchData();
    }, intervalMs);

    // Sync immediately whenever the cashier or supervisor focuses the window
    const onFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeTab, fetchData]);

  // Handle Audio Toggle
  const handleSetAudioEnabled = (val: boolean) => {
    setAudioEnabled(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_audio_enabled', String(val));
    }
  };

  // Open Owner Portal
  const handleOpenOwnerPortal = () => {
    if (isOwnerUnlocked) {
      setActiveTab('owner');
    } else {
      setOwnerPinModalOpen(true);
    }
  };

  // Owner PIN verified
  const handleOwnerUnlocked = () => {
    setIsOwnerUnlocked(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pos_owner_unlocked', 'true');
    }
    setOwnerPinModalOpen(false);
    setActiveTab('owner');
  };

  // Lock Owner Portal
  const handleLockOwner = () => {
    setIsOwnerUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pos_owner_unlocked');
    }
    setActiveTab('register');
  };

  // Sale completed
  const handleSaleCompleted = (sale: Sale, updatedCustomer?: Customer) => {
    setActiveReceiptSale(sale);
    setActiveCustomerPoints(updatedCustomer?.points);
    setReceiptModalOpen(true);
  };

  // Update order status in KDS
  const handleUpdateStatus = async (saleId: string, status: string) => {
    try {
      await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order_status', id: saleId, status })
      });
      await fetchData();
    } catch (e) {
      console.error('Failed to update order status:', e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-900 text-stone-100">
        <img
          src="/logo.png"
          alt="EATmi Logo"
          className="w-16 h-16 rounded-2xl object-cover shadow-xl ring-2 ring-amber-400/40 animate-pulse mb-3"
        />
        <h2 className="text-base font-serif font-bold text-amber-200">EATmi Cloud POS</h2>
        <p className="text-xs text-stone-400 mt-1">Starting up register & online synchronization...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="print-hidden flex flex-col flex-1">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          audioEnabled={audioEnabled}
          setAudioEnabled={handleSetAudioEnabled}
          onOpenOwnerPortal={handleOpenOwnerPortal}
          isOwnerUnlocked={isOwnerUnlocked}
          onLockOwner={handleLockOwner}
        />

        <main className="flex-1 flex flex-col">
          {activeTab === 'register' && (
            <PosRegister
              categories={categories}
              products={products}
              customers={customers}
              settings={settings}
              onSaleCompleted={handleSaleCompleted}
              onRefreshData={fetchData}
              audioEnabled={audioEnabled}
            />
          )}

          {activeTab === 'owner' && (
            <OwnerPortal
              categories={categories}
              products={products}
              customers={customers}
              sales={sales}
              summary={summary}
              settings={settings}
              onRefreshData={fetchData}
              audioEnabled={audioEnabled}
            />
          )}

          {activeTab === 'kds' && (
            <KitchenKds
              sales={sales}
              onUpdateStatus={handleUpdateStatus}
              audioEnabled={audioEnabled}
            />
          )}
        </main>
      </div>

      {/* Owner PIN Verification Modal */}
      <OwnerPinModal
        isOpen={ownerPinModalOpen}
        onClose={() => setOwnerPinModalOpen(false)}
        onSuccess={handleOwnerUnlocked}
      />

      {/* Thermal Receipt & KOT Modal */}
      <ThermalReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        sale={activeReceiptSale}
        customer={customers.find(c => c.id === activeReceiptSale?.customer_id) || null}
        customerPointsBalance={activeCustomerPoints}
        settings={settings}
      />
    </div>
  );
}

