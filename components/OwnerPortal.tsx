'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Layers,
  Award,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  PackagePlus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  Wifi,
  KeyRound,
  ExternalLink,
  Sliders,
  Check,
  HelpCircle,
  Receipt,
  Utensils,
  Mail,
  Send,
  Server,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Database,
  Download
} from 'lucide-react';
import { Category, Product, Customer, Sale, SummaryStats } from '@/lib/types';
import { formatRupees, formatShortRupees, centsToRupees } from '@/lib/utils';
import { playTapSound, playRegisterSound } from '@/lib/sound';
import { generateReceiptHtml, printReceiptHtml } from '@/lib/receipt';
import CategoryModal from './CategoryModal';
import ProductModal from './ProductModal';
import CustomerPointsModal from './CustomerPointsModal';
import NewCustomerModal from './NewCustomerModal';

interface OwnerPortalProps {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  summary: SummaryStats;
  settings: Record<string, string>;
  onRefreshData: () => Promise<void>;
  audioEnabled: boolean;
}

export default function OwnerPortal({
  categories,
  products,
  customers,
  sales,
  summary,
  settings,
  onRefreshData,
  audioEnabled
}: OwnerPortalProps) {
  // Tabs: 'dashboard' | 'categories' | 'products' | 'loyalty' | 'reports' | 'printer' | 'settings'
  const [subTab, setSubTab] = useState<'dashboard' | 'categories' | 'products' | 'loyalty' | 'reports' | 'printer' | 'settings'>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Receipt & Printer Settings State
  const [receiptStoreName, setReceiptStoreName] = useState(settings.receipt_store_name || 'EATmi BAKERY & CAFE');
  const [receiptTagline, setReceiptTagline] = useState(settings.receipt_tagline || 'ARTISAN PÂTISSERIE & ROASTERY');
  const [receiptAddress, setReceiptAddress] = useState(settings.receipt_address || 'No. 07, Eugine Balasuriya Mawatha, Nupe, Matara');
  const [receiptPhone, setReceiptPhone] = useState(settings.receipt_phone || '0740546060');
  const [receiptHeaderNote, setReceiptHeaderNote] = useState(settings.receipt_header_note || 'TAX INVOICE / RECEIPT');
  const [receiptFooter1, setReceiptFooter1] = useState(settings.receipt_footer_1 || '*** THANK YOU FOR VISITING! ***');
  const [receiptFooter2, setReceiptFooter2] = useState(settings.receipt_footer_2 || 'Fresh bakes served with passion daily.');
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<'80mm' | '58mm'>((settings.receipt_paper_width as any) || '80mm');
  const [receiptPrintDensity, setReceiptPrintDensity] = useState<'ultra_dark' | 'normal'>((settings.receipt_print_density as any) || 'ultra_dark');
  const [receiptFontStyle, setReceiptFontStyle] = useState<'sans' | 'mono'>((settings.receipt_font_style as any) || 'sans');
  const [receiptFontSize, setReceiptFontSize] = useState<'large' | 'normal'>((settings.receipt_font_size as any) || 'large');
  const [receiptShowLogo, setReceiptShowLogo] = useState<boolean>(settings.receipt_show_logo !== 'false');
  const [receiptShowLoyalty, setReceiptShowLoyalty] = useState<boolean>(settings.receipt_show_loyalty !== 'false');
  const [receiptShowBarcode, setReceiptShowBarcode] = useState<boolean>(settings.receipt_show_barcode !== 'false');
  const [receiptSavedMessage, setReceiptSavedMessage] = useState('');
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [testPrintStatus, setTestPrintStatus] = useState('');
  const [previewSlipType, setPreviewSlipType] = useState<'customer' | 'kitchen'>('customer');

  // Loyalty Program Accrual Rate (Admin Configurable: Rs. 300 = 1 pt, Rs. 400 = 1 pt, etc.)
  const [loyaltyRate, setLoyaltyRate] = useState<number>(Number(settings.loyalty_rate_rupees) || 300);
  const [loyaltyRateInput, setLoyaltyRateInput] = useState<string>(settings.loyalty_rate_rupees || '300');
  const [isSavingLoyaltyRate, setIsSavingLoyaltyRate] = useState(false);
  const [loyaltyRateMessage, setLoyaltyRateMessage] = useState('');

  // Automated Email & SMTP Settings State
  const [smtpHost, setSmtpHost] = useState(settings.smtp_host || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(settings.smtp_port || '587');
  const [smtpUser, setSmtpUser] = useState(settings.smtp_user || '');
  const [smtpPass, setSmtpPass] = useState(settings.smtp_pass || '');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpFromName, setSmtpFromName] = useState(settings.smtp_from_name || 'EATmi BAKERY & CAFE');
  const [smtpSecure, setSmtpSecure] = useState(settings.smtp_secure === 'true');
  const [emailSettingsMessage, setEmailSettingsMessage] = useState('');
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isBackingUpDb, setIsBackingUpDb] = useState(false);
  const [backupDbStatus, setBackupDbStatus] = useState('');

  React.useEffect(() => {
    if (settings.receipt_store_name) setReceiptStoreName(settings.receipt_store_name);
    if (settings.receipt_tagline) setReceiptTagline(settings.receipt_tagline);
    if (settings.receipt_address) setReceiptAddress(settings.receipt_address);
    if (settings.receipt_phone) setReceiptPhone(settings.receipt_phone);
    if (settings.receipt_header_note) setReceiptHeaderNote(settings.receipt_header_note);
    if (settings.receipt_footer_1) setReceiptFooter1(settings.receipt_footer_1);
    if (settings.receipt_footer_2) setReceiptFooter2(settings.receipt_footer_2);
    if (settings.receipt_paper_width) setReceiptPaperWidth(settings.receipt_paper_width as any);
    if (settings.receipt_print_density) setReceiptPrintDensity(settings.receipt_print_density as any);
    if (settings.receipt_font_style) setReceiptFontStyle(settings.receipt_font_style as any);
    if (settings.receipt_font_size) setReceiptFontSize(settings.receipt_font_size as any);
    if (settings.receipt_show_logo !== undefined) setReceiptShowLogo(settings.receipt_show_logo !== 'false');
    if (settings.receipt_show_loyalty !== undefined) setReceiptShowLoyalty(settings.receipt_show_loyalty !== 'false');
    if (settings.receipt_show_barcode !== undefined) setReceiptShowBarcode(settings.receipt_show_barcode !== 'false');
    if (settings.master_recovery_key) setCustomRecoveryKey(settings.master_recovery_key);
    if (settings.owner_recovery_phone !== undefined) setCustomRecoveryPhone(settings.owner_recovery_phone);
    if (settings.loyalty_rate_rupees) {
      setLoyaltyRate(Number(settings.loyalty_rate_rupees) || 300);
      setLoyaltyRateInput(settings.loyalty_rate_rupees);
    }
    if (settings.smtp_host) setSmtpHost(settings.smtp_host);
    if (settings.smtp_port) setSmtpPort(settings.smtp_port);
    if (settings.smtp_user) setSmtpUser(settings.smtp_user);
    if (settings.smtp_pass) setSmtpPass(settings.smtp_pass);
    if (settings.smtp_from_name) setSmtpFromName(settings.smtp_from_name);
    if (settings.smtp_secure !== undefined) setSmtpSecure(settings.smtp_secure === 'true');
  }, [settings]);

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductCategoryFilter, setSelectedProductCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // PIN Change State
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  // Emergency Recovery State
  const [customRecoveryKey, setCustomRecoveryKey] = useState(settings.master_recovery_key || 'EATMI-8899');
  const [customRecoveryPhone, setCustomRecoveryPhone] = useState(settings.owner_recovery_phone || '');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Restock batch action
  const handleRestock = async (productId: string, qty: number) => {
    playTapSound(audioEnabled);
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restock', id: productId, qty })
      });
      const data = await res.json();
      if (data.ok) {
        await onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the menu catalog?`)) return;
    try {
      await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_product', id: productId })
      });
      await onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete category (PROTECTED: CANNOT DELETE IF ITEMS ARE ASSIGNED)
  const handleDeleteCategory = async (catId: string, name: string, itemCount: number) => {
    if (itemCount > 0) {
      alert(`⚠️ Cannot delete category "${name}"!\n\nIt currently has ${itemCount} assigned item(s). Every menu item must belong to a category (category is mandatory).\n\nPlease reassign or delete these ${itemCount} items first before deleting this category.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the empty category "${name}"?`)) return;

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_category', id: catId })
      });
      const data = await res.json();
      if (data.ok) {
        await onRefreshData();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (e: any) {
      alert('Network error while deleting category');
    }
  };

  // Update PIN
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      setPinMessage('PIN must be at least 4 digits');
      return;
    }
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_pin', pin: newPin })
      });
      const data = await res.json();
      if (data.ok) {
        setPinMessage('Owner PIN successfully updated!');
        setNewPin('');
        await onRefreshData();
      } else {
        setPinMessage(data.error || 'Failed to update PIN');
      }
    } catch (err: any) {
      setPinMessage('Network error');
    }
  };

  // Update Emergency Recovery Settings
  const handleUpdateRecoverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMessage('');
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_recovery_settings',
          master_recovery_key: customRecoveryKey.trim().toUpperCase(),
          owner_recovery_phone: customRecoveryPhone.trim()
        })
      });
      const data = await res.json();
      if (data.ok) {
        setRecoveryMessage('Recovery credentials saved successfully!');
        await onRefreshData();
      } else {
        setRecoveryMessage(data.error || 'Failed to save recovery credentials');
      }
    } catch (err) {
      setRecoveryMessage('Network error saving recovery settings');
    }
  };

  // Save Email & SMTP Server Settings
  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmailSettings(true);
    setEmailSettingsMessage('');
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_email_settings',
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort.trim(),
          smtp_user: smtpUser.trim(),
          smtp_pass: smtpPass.trim(),
          smtp_from_name: smtpFromName.trim(),
          smtp_secure: smtpSecure ? 'true' : 'false'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setEmailSettingsMessage('✅ Email & SMTP configuration saved successfully!');
        await onRefreshData();
      } else {
        setEmailSettingsMessage('❌ ' + (data.error || 'Failed to save email settings'));
      }
    } catch (err: any) {
      setEmailSettingsMessage('❌ Network error saving email settings');
    } finally {
      setIsSavingEmailSettings(false);
      setTimeout(() => setEmailSettingsMessage(''), 6000);
    }
  };

  // Test SMTP Email Connection & Dispatch
  const handleTestEmail = async () => {
    const target = (testEmailAddress || smtpUser).trim();
    if (!target) {
      setTestEmailStatus('⚠️ Please enter an email address to send the test message to.');
      return;
    }
    if (!smtpUser.trim() || !smtpPass.trim()) {
      setTestEmailStatus('⚠️ Please enter your SMTP Username (email) and Password / App Password first.');
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailStatus(`Testing connection and sending test email to ${target}...`);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_smtp',
          to: target,
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort.trim(),
          smtp_user: smtpUser.trim(),
          smtp_pass: smtpPass.trim(),
          smtp_from_name: smtpFromName.trim(),
          smtp_secure: smtpSecure ? 'true' : 'false'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setTestEmailStatus(`✅ ${data.message || 'Success! Test email delivered.'}`);
      } else {
        setTestEmailStatus(`❌ ${data.error || 'SMTP test failed.'}`);
      }
    } catch (err: any) {
      setTestEmailStatus(`❌ Error: ${err.message || 'Failed to test SMTP connection.'}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Email Complete SQLite Database Backup
  const handleEmailDbBackup = async () => {
    const target = (testEmailAddress || smtpUser).trim();
    if (!target) {
      setBackupDbStatus('⚠️ Please enter an email address to receive the database backup.');
      return;
    }
    if (!smtpUser.trim() || !smtpPass.trim()) {
      setBackupDbStatus('⚠️ Please configure and save your Gmail SMTP credentials above first.');
      return;
    }
    setIsBackingUpDb(true);
    setBackupDbStatus(`Attaching counter.sqlite database and emailing to ${target}...`);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'backup_db',
          to: target,
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort.trim(),
          smtp_user: smtpUser.trim(),
          smtp_pass: smtpPass.trim(),
          smtp_from_name: smtpFromName.trim(),
          smtp_secure: smtpSecure ? 'true' : 'false'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setBackupDbStatus(`✅ ${data.message || 'Database backup successfully emailed!'}`);
      } else {
        setBackupDbStatus(`❌ ${data.error || 'Failed to send backup email.'}`);
      }
    } catch (err: any) {
      setBackupDbStatus(`❌ Error: ${err.message || 'Network error sending backup.'}`);
    } finally {
      setIsBackingUpDb(false);
    }
  };

  // Save Receipt & Printer Settings
  const handleSaveReceiptSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingReceipt(true);
    setReceiptSavedMessage('');
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_receipt_settings',
          receipt_store_name: receiptStoreName,
          receipt_tagline: receiptTagline,
          receipt_address: receiptAddress,
          receipt_phone: receiptPhone,
          receipt_header_note: receiptHeaderNote,
          receipt_footer_1: receiptFooter1,
          receipt_footer_2: receiptFooter2,
          receipt_paper_width: receiptPaperWidth,
          receipt_print_density: receiptPrintDensity,
          receipt_font_style: receiptFontStyle,
          receipt_font_size: receiptFontSize,
          receipt_show_logo: String(receiptShowLogo),
          receipt_show_loyalty: String(receiptShowLoyalty),
          receipt_show_barcode: String(receiptShowBarcode),
          loyalty_rate_rupees: String(loyaltyRate)
        })
      });
      const data = await res.json();
      if (data.ok) {
        setReceiptSavedMessage('Receipt and printer settings successfully saved!');
        await onRefreshData();
        setTimeout(() => setReceiptSavedMessage(''), 4000);
      } else {
        setReceiptSavedMessage(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setReceiptSavedMessage('Network error saving settings');
    } finally {
      setIsSavingReceipt(false);
    }
  };

  // Save Loyalty Program Accrual Rule (Spend Rs. X = 1 Point)
  const handleSaveLoyaltyRate = async (customRate?: number) => {
    const targetRate = Math.max(50, Math.floor(customRate !== undefined ? customRate : Number(loyaltyRateInput) || 300));
    setIsSavingLoyaltyRate(true);
    setLoyaltyRateMessage('');
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_loyalty_rate',
          rate: targetRate
        })
      });
      const data = await res.json();
      if (data.ok) {
        setLoyaltyRate(targetRate);
        setLoyaltyRateInput(String(targetRate));
        setLoyaltyRateMessage(`Loyalty rule updated: Spend Rs. ${targetRate} = 1 reward point!`);
        await onRefreshData();
        setTimeout(() => setLoyaltyRateMessage(''), 4000);
      } else {
        setLoyaltyRateMessage(data.error || 'Failed to update loyalty rate');
      }
    } catch (err) {
      setLoyaltyRateMessage('Network error saving loyalty rule');
    } finally {
      setIsSavingLoyaltyRate(false);
    }
  };

  // Test Print (Sample 1-sheet bill or KOT)
  const handleTestPrint = (type: 'customer' | 'kitchen') => {
    setTestPrintStatus(`Sending sample ${type === 'customer' ? 'Customer Bill' : 'Kitchen KOT'} to printer...`);
    const earnedPoints = Math.floor(2940 / loyaltyRate);
    const sampleSale: Sale = {
      id: 'SAMPLE-1001',
      created: new Date().toISOString(),
      customer_id: 'cust-1',
      customer_name: 'Kavindu Anajana',
      items: JSON.stringify([
        { name: 'Almond Frangipane Croissant', qty: 1, price: 69000 },
        { name: 'Opera Gateau Slice', qty: 1, price: 95000 },
        { name: 'Velvety Flat White / Latte', qty: 2, price: 65000 }
      ]),
      subtotal: 294000,
      discount: 0,
      total: 294000,
      earned: earnedPoints,
      redeemed: 0,
      payment: 'Cash',
      tendered: 300000,
      order_type: 'takeaway',
      notes: 'Extra hot, crispy croissant',
      status: 'completed',
      cashier: 'Worker 1'
    };

    const currentSettings = {
      receipt_store_name: receiptStoreName,
      receipt_tagline: receiptTagline,
      receipt_address: receiptAddress,
      receipt_phone: receiptPhone,
      receipt_header_note: receiptHeaderNote,
      receipt_footer_1: receiptFooter1,
      receipt_footer_2: receiptFooter2,
      receipt_paper_width: receiptPaperWidth,
      receipt_print_density: receiptPrintDensity,
      receipt_font_style: receiptFontStyle,
      receipt_font_size: receiptFontSize,
      receipt_show_logo: String(receiptShowLogo),
      receipt_show_loyalty: String(receiptShowLoyalty),
      receipt_show_barcode: String(receiptShowBarcode),
      loyalty_rate_rupees: String(loyaltyRate)
    };

    const html = generateReceiptHtml({
      sale: sampleSale,
      customerPointsBalance: 24,
      settings: currentSettings,
      slipType: type,
      paperWidth: receiptPaperWidth,
      showLogo: receiptShowLogo
    });

    printReceiptHtml(html, () => {
      setTestPrintStatus(`Sample ${type === 'customer' ? 'Bill' : 'KOT'} printed (1 single copy)`);
      setTimeout(() => setTestPrintStatus(''), 3000);
    });
  };

  // Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  // Filtered Products for items tab
  const filteredProducts = products.filter(p => {
    if (selectedProductCategoryFilter !== 'all') {
      if (p.category_id !== selectedProductCategoryFilter && !p.category.toLowerCase().includes(selectedProductCategoryFilter.toLowerCase())) {
        return false;
      }
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Customers for loyalty tab
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden bg-stone-100">
      {/* Sub-Header Navigation */}
      <div className="bg-white border-b border-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {[
            { id: 'dashboard', label: 'Live Shop Monitor', icon: TrendingUp },
            { id: 'categories', label: 'Categories & Images', icon: Layers },
            { id: 'products', label: 'Menu Items & Stock', icon: ShoppingBag },
            { id: 'loyalty', label: `Loyalty (Rs. ${loyaltyRate} = 1pt)`, icon: Award },
            { id: 'reports', label: 'Daily Z-Report & Sales', icon: FileText },
            { id: 'printer', label: 'Receipt & Printer Settings', icon: Printer },
            { id: 'settings', label: 'Email & Security Settings', icon: Mail },
          ].map(tab => {
            const Icon = tab.icon;
            const isCurrent = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSubTab(tab.id as any);
                  playTapSound(audioEnabled);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isCurrent
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Refresh & Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-300 transition"
            title="Fetch latest sales and inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : 'text-stone-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-[1920px] mx-auto w-full">
        {/* ======================================================== */}
        {/* TAB 1: LIVE SHOP MONITOR (REAL-TIME SUPERVISION)         */}
        {/* ======================================================== */}
        {subTab === 'dashboard' && (
          <div className="space-y-4">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Today Revenue */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-semibold text-stone-600">Today's Gross Revenue</span>
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-stone-900">
                  {formatRupees(summary.todayRevenue)}
                </div>
                <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1.5">
                  <span className="font-semibold text-stone-700">{summary.todayOrdersCount} orders</span>
                  <span>·</span>
                  <span>Avg: {formatRupees(summary.avgOrderValue)}</span>
                </div>
              </div>

              {/* Payment Split */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-semibold text-stone-600">Tender Breakdown</span>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                </div>
                <div className="space-y-1 mt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">💵 Cash in Drawer:</span>
                    <span className="font-mono font-bold text-stone-800">{formatShortRupees(summary.cashRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">💳 Card Terminal:</span>
                    <span className="font-mono font-bold text-stone-800">{formatShortRupees(summary.cardRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">📱 QR / Transfers:</span>
                    <span className="font-mono font-bold text-stone-800">{formatShortRupees(summary.qrRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Loyalty Club Stats */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-semibold text-stone-600">Patron Loyalty (Rs. {loyaltyRate} = 1pt)</span>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-900">
                  {summary.totalPointsIssued.toLocaleString()} <span className="text-sm font-normal text-stone-500">pts issued</span>
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Across <span className="font-semibold text-stone-700">{summary.totalCustomers}</span> registered patrons
                </div>
              </div>

              {/* Inventory Alerts */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-semibold text-stone-600">Bakery Inventory Status</span>
                  <div className="p-1.5 rounded-lg bg-stone-100 text-stone-600">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div>
                    <span className="text-xl font-bold font-mono text-amber-600">{summary.lowStockCount}</span>
                    <div className="text-[10px] text-stone-500">Low Stock</div>
                  </div>
                  <div className="h-8 w-px bg-stone-200" />
                  <div>
                    <span className="text-xl font-bold font-mono text-rose-600">{summary.outOfStockCount}</span>
                    <div className="text-[10px] text-stone-500">Sold Out</div>
                  </div>
                  <div className="h-8 w-px bg-stone-200" />
                  <div>
                    <span className="text-xl font-bold font-mono text-stone-800">{summary.totalProducts}</span>
                    <div className="text-[10px] text-stone-500">Total Items</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Row: Live Orders Stream vs Top Selling Pastries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Live Sales Stream (2 Cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">Live Sales Stream</h3>
                    <p className="text-[11px] text-stone-400">Incoming counter orders ringing in right now</p>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-updating
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {sales.slice(0, 15).map(sale => {
                    let items: any[] = [];
                    try {
                      items = JSON.parse(sale.items);
                    } catch (e) {}

                    const timeStr = new Date(sale.created).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });

                    return (
                      <div
                        key={sale.id}
                        className="p-3 rounded-xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/80 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-stone-900">#{sale.id}</span>
                            <span className="text-stone-400 font-mono">{timeStr}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-stone-200 text-stone-700 uppercase">
                              {sale.order_type}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                              {sale.payment}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-600 mt-1 line-clamp-1">
                            {items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Patron: <span className="font-medium text-stone-700">{sale.customer_name}</span>
                            {sale.earned > 0 && (
                              <span className="text-emerald-700 font-semibold ml-2">
                                (+{sale.earned} loyalty pts)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-bold text-sm text-stone-900">
                            {formatRupees(sale.total)}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              sale.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Selling Pastries (1 Col) */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col">
                <div className="pb-3 border-b border-stone-100 mb-3">
                  <h3 className="font-bold text-sm text-stone-900">Today's Top Sellers</h3>
                  <p className="text-[11px] text-stone-400">Most ordered items today</p>
                </div>

                <div className="flex-1 space-y-3">
                  {summary.topPastries.length === 0 ? (
                    <div className="text-center text-xs text-stone-400 py-8">
                      No sales recorded yet today
                    </div>
                  ) : (
                    summary.topPastries.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-stone-800 line-clamp-1 max-w-[150px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-stone-900">{item.count} sold</span>
                          <div className="text-[10px] text-stone-400 font-mono">{formatShortRupees(item.revenue)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Link to Menu */}
                <div className="pt-3 border-t border-stone-100 mt-auto">
                  <button
                    onClick={() => setSubTab('products')}
                    className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <span>Manage Full Menu & Stock</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CATEGORIES & IMAGES                               */}
        {/* ======================================================== */}
        {subTab === 'categories' && (
          <div className="space-y-4">
            {/* Header with Add Category Button */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div>
                <h3 className="font-bold text-base text-stone-900">Categories Management</h3>
                <p className="text-xs text-stone-500">
                  Organize your food & bakery catalog with custom cover images, icons, and display order
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryModalOpen(true);
                  playTapSound(audioEnabled);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Category</span>
              </button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map(cat => {
                const count = products.filter(p => p.category_id === cat.id || p.category.toLowerCase().includes(cat.name.toLowerCase())).length;

                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    {/* Cover Photo */}
                    <div className="relative aspect-[16/9] bg-stone-100 overflow-hidden">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-50 text-3xl">
                          {cat.icon || '🏷️'}
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-xl bg-black/50 p-1.5 rounded-xl backdrop-blur-xs">
                        {cat.icon || '🏷️'}
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {count} items
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">{cat.name}</h4>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                          {cat.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-stone-400">Order: {cat.display_order || 1}</span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(null);
                              setSelectedProductCategoryFilter(cat.id);
                              setProductModalOpen(true);
                              playTapSound(audioEnabled);
                            }}
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg transition"
                            title={`Add new item directly to ${cat.name}`}
                          >
                            <Plus className="w-3 h-3 text-amber-700" />
                            <span>Add Item</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryModalOpen(true);
                              playTapSound(audioEnabled);
                            }}
                            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name, count)}
                            className={`p-1.5 rounded-lg transition ${
                              count > 0
                                ? 'text-stone-300 hover:text-amber-700 hover:bg-amber-50 cursor-pointer'
                                : 'hover:bg-rose-50 text-stone-400 hover:text-rose-600'
                            }`}
                            title={
                              count > 0
                                ? `Protected: Contains ${count} items. Category is mandatory for all items.`
                                : 'Delete Empty Category'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRODUCTS / ITEMS & STOCK                          */}
        {/* ======================================================== */}
        {subTab === 'products' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search menu items or SKU..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedProductCategoryFilter}
                  onChange={e => setSelectedProductCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white text-stone-700"
                >
                  <option value="all">All Categories ({products.length})</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🏷️'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                  playTapSound(audioEnabled);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md transition"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Add Item with Image & Price</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Item & Photo</th>
                      <th className="py-3 px-3">SKU</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Selling Price</th>
                      <th className="py-3 px-3">Cost & Margin</th>
                      <th className="py-3 px-3 text-center">Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredProducts.map(p => {
                      const costRupees = p.cost ? centsToRupees(p.cost) : 0;
                      const priceRupees = centsToRupees(p.price);
                      const profit = priceRupees - costRupees;
                      const marginPct = priceRupees > 0 ? Math.round((profit / priceRupees) * 100) : 0;

                      return (
                        <tr key={p.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-stone-900">{p.name}</div>
                                {p.badge && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                    {p.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-stone-500">{p.sku}</td>

                          <td className="py-2.5 px-3 text-stone-700 font-medium">{p.category}</td>

                          <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                            {formatRupees(p.price)}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-mono text-stone-600">Rs. {costRupees.toLocaleString()}</div>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              +{marginPct}% margin
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                                p.stock <= 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : p.stock <= 5
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-100 text-stone-800'
                              }`}
                            >
                              {p.stock} in stock
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick restock +12 */}
                              <button
                                onClick={() => handleRestock(p.id, 12)}
                                className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-stone-200 transition"
                                title="Quick Restock +12 baked fresh"
                              >
                                +12 Baked
                              </button>

                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductModalOpen(true);
                                  playTapSound(audioEnabled);
                                }}
                                className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: LOYALTY PROGRAM (ADMIN CONFIGURABLE ACCRUAL RULE)  */}
        {/* ======================================================== */}
        {subTab === 'loyalty' && (
          <div className="space-y-4">
            {/* Admin Configurable Loyalty Rule Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-stone-900">
                      Loyalty Program Accrual Rule: <span className="text-amber-700 font-mono">Rs. {loyaltyRate} = 1 Point</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      Configure how many rupees patrons spend to earn 1 reward point (e.g. 300 = 1, 400 = 1). Automatically synchronizes with register checkout and printed bills.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewCustomerModalOpen(true);
                    playTapSound(audioEnabled);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Patron</span>
                </button>
              </div>

              {loyaltyRateMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{loyaltyRateMessage}</span>
                </div>
              )}

              {/* Accrual Rate Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* 1-Click Preset Buttons (5 cols) */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Quick Rate Presets:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[300, 400, 500, 1000].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLoyaltyRateInput(String(preset));
                          handleSaveLoyaltyRate(preset);
                        }}
                        disabled={isSavingLoyaltyRate}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center border ${
                          loyaltyRate === preset
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                        }`}
                      >
                        Rs. {preset}
                        <div className="text-[10px] font-normal opacity-90">= 1 pt</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Number Input & Save Form (4 cols) */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Custom Spend per Point (Rs.):
                  </label>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSaveLoyaltyRate();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">Rs.</span>
                      <input
                        type="number"
                        min="50"
                        step="10"
                        value={loyaltyRateInput}
                        onChange={e => setLoyaltyRateInput(e.target.value)}
                        placeholder="300"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingLoyaltyRate || Number(loyaltyRateInput) === loyaltyRate}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isSavingLoyaltyRate ? 'Saving...' : 'Save Rule'}
                    </button>
                  </form>
                </div>

                {/* Real-time Calculation Badge (3 cols) */}
                <div className="lg:col-span-3 bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                    Live Calculation Preview
                  </div>
                  <div className="text-stone-700 text-[11px] space-y-0.5 font-mono">
                    <div className="flex justify-between">
                      <span>Rs. {loyaltyRate} spent:</span>
                      <b className="text-emerald-700">+1 Point</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Rs. {loyaltyRate * 2} spent:</span>
                      <b className="text-emerald-700">+2 Points</b>
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-500 pt-0.5 border-t border-amber-200/60 font-sans">
                      <span>Redemption:</span>
                      <span>1 pt = Rs. 1.00 off</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customers Search & Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-3.5 border-b border-stone-200 flex items-center justify-between gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search patrons by name or phone..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <span className="text-xs text-stone-500 font-medium">
                  {filteredCustomers.length} registered patrons
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Patron Name</th>
                      <th className="py-3 px-3">Mobile Phone</th>
                      <th className="py-3 px-3">Loyalty Tier</th>
                      <th className="py-3 px-3 font-mono">Current Balance</th>
                      <th className="py-3 px-3 font-mono">Lifetime Spent</th>
                      <th className="py-3 px-3 text-center">Visits</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCustomers.map(cust => {
                      const tier =
                        cust.points >= 1000
                          ? { name: 'Gold Ambassador', color: 'bg-amber-100 text-amber-800 border-amber-300' }
                          : cust.points >= 300
                          ? { name: 'Silver Connoisseur', color: 'bg-stone-200 text-stone-800 border-stone-300' }
                          : { name: 'Bronze Patron', color: 'bg-amber-50 text-amber-900 border-amber-200' };

                      return (
                        <tr key={cust.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-2.5 px-4 font-semibold text-stone-900">
                            <div>{cust.name}</div>
                            {cust.email && (
                              <div className="text-[10px] text-stone-500 font-normal font-mono">{cust.email}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-stone-600">{cust.phone}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${tier.color}`}>
                              {tier.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-800 text-sm">
                            {cust.points} pts
                          </td>
                          <td className="py-2.5 px-3 font-mono text-stone-700">
                            {formatRupees(cust.spent)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-stone-600">
                            {cust.visits}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingCustomer(cust);
                                setPointsModalOpen(true);
                                playTapSound(audioEnabled);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-300 transition"
                            >
                              Adjust Points
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: DAILY Z-REPORT & FINANCIAL SETTLEMENT             */}
        {/* ======================================================== */}
        {subTab === 'reports' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Z-Report Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div>
                  <h3 className="font-bold text-base text-stone-900">End-of-Day Z-Report Settlement</h3>
                  <p className="text-xs text-stone-500">Official cash drawer and revenue reconciliation</p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold shadow-md transition"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Z-Report</span>
                </button>
              </div>

              {/* Settlement Summary Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500">Gross Sales:</span>
                  <div className="font-mono font-bold text-base text-stone-900 mt-1">
                    {formatRupees(summary.todayRevenue)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500">Cash in Drawer:</span>
                  <div className="font-mono font-bold text-base text-emerald-700 mt-1">
                    {formatRupees(summary.cashRevenue)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500">Card Terminals:</span>
                  <div className="font-mono font-bold text-base text-blue-700 mt-1">
                    {formatRupees(summary.cardRevenue)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500">QR / Transfers:</span>
                  <div className="font-mono font-bold text-base text-amber-700 mt-1">
                    {formatRupees(summary.qrRevenue)}
                  </div>
                </div>
              </div>

              {/* Transaction Logs */}
              <div className="pt-2">
                <h4 className="font-semibold text-xs text-stone-700 mb-2">Today's Transactions Log</h4>
                <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 max-h-80 overflow-y-auto">
                  {sales.map(s => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-stone-50">
                      <div>
                        <span className="font-mono font-bold">#{s.id}</span>
                        <span className="text-stone-400 ml-2">{new Date(s.created).toLocaleTimeString()}</span>
                        <span className="text-stone-700 ml-2 font-medium">{s.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px]">
                          {s.payment}
                        </span>
                        <span className="font-mono font-bold text-stone-900">{formatRupees(s.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: RECEIPT & THERMAL PRINTER SETTINGS (POS-80C)      */}
        {/* ======================================================== */}
        {subTab === 'printer' && (
          <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Top Info Banner */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">Thermal Receipt & POS-80C Printer Settings</h3>
                  <p className="text-xs text-stone-500">
                    Customize store branding, auto-adjust paper length, and set ultra-dark thermal contrast (1 copy per print).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestPrint('customer')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold border border-stone-300 transition"
                  title="Test print 1 single copy of customer bill"
                >
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Test Bill (1x)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestPrint('kitchen')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold border border-stone-300 transition"
                  title="Test print 1 single copy of Kitchen Ticket"
                >
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span>Test KOT (1x)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceiptSettings()}
                  disabled={isSavingReceipt}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingReceipt ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            {receiptSavedMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{receiptSavedMessage}</span>
              </div>
            )}

            {testPrintStatus && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{testPrintStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Thermal Hardware & Density Settings (POS-80C) */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">
                      Thermal Hardware & Print Quality (POS-80C)
                    </h4>
                  </div>

                  {/* Print Density / Darkness */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Print Darkness & Density (Ink / Thermal Heat Efficiency)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReceiptPrintDensity('normal')}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          receiptPrintDensity === 'normal'
                            ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Normal Clean (Recommended)
                        </span>
                        <span className="text-[10px] text-stone-500 mt-1">
                          Standard crisp, elegant receipt. Zero "paint" / thermal head burn waste.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReceiptPrintDensity('ultra_dark')}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          receiptPrintDensity === 'ultra_dark'
                            ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs font-bold text-stone-900">High Density (Bolder)</span>
                        <span className="text-[10px] text-stone-500 mt-1">
                          Slightly bolder font weight for older worn printer heads.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Paper Roll Width */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Paper Roll Width
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReceiptPaperWidth('80mm')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          receiptPaperWidth === '80mm'
                            ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs font-bold text-stone-900">80mm Paper (72mm Printable)</span>
                        <span className="block text-[10px] text-stone-500 mt-0.5">
                          Matches POS-80C & standard 80mm restaurant thermal printers.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReceiptPaperWidth('58mm')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          receiptPaperWidth === '58mm'
                            ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs font-bold text-stone-900">58mm Paper (48mm Printable)</span>
                        <span className="block text-[10px] text-stone-500 mt-0.5">
                          Compact slip for mini handheld mobile thermal POS printers.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Font Typography & Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        Font Typography
                      </label>
                      <select
                        value={receiptFontStyle}
                        onChange={e => setReceiptFontStyle(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="sans">Crisp Sans-Serif (Modern & Clear)</option>
                        <option value="mono">Classic Monospace (Courier)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        Font Size
                      </label>
                      <select
                        value={receiptFontSize}
                        onChange={e => setReceiptFontSize(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="large">Large & High-Legibility (12.5px)</option>
                        <option value="normal">Standard (11.5px)</option>
                      </select>
                    </div>
                  </div>

                  {/* Auto-Adjust Height Guarantee */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-700" />
                      <span>Zero-Waste Height Auto-Adjust (Active)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Short bills (1-2 items) use a short piece of paper. Long bills print continuously. Chrome's "3 sheets of paper" overflow has been eliminated so exactly <b>1 sheet</b> prints with zero blank paper waste.
                    </p>
                  </div>
                </div>

                {/* 2. Store Header & Branding */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">
                      Store Branding & Header Info
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={receiptStoreName}
                      onChange={e => setReceiptStoreName(e.target.value)}
                      placeholder="e.g. EATmi BAKERY & CAFE"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tagline / Business Subtitle
                    </label>
                    <input
                      type="text"
                      value={receiptTagline}
                      onChange={e => setReceiptTagline(e.target.value)}
                      placeholder="e.g. ARTISAN PÂTISSERIE & ROASTERY"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Address Line
                      </label>
                      <input
                        type="text"
                        value={receiptAddress}
                        onChange={e => setReceiptAddress(e.target.value)}
                        placeholder="No. 07, Eugine Balasuriya Mawatha, Nupe, Matara"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Phone / Hotline
                      </label>
                      <input
                        type="text"
                        value={receiptPhone}
                        onChange={e => setReceiptPhone(e.target.value)}
                        placeholder="0740546060"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Receipt Type / Tax Badge
                    </label>
                    <input
                      type="text"
                      value={receiptHeaderNote}
                      onChange={e => setReceiptHeaderNote(e.target.value)}
                      placeholder="e.g. TAX INVOICE / RECEIPT"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* 3. Toggles & Footer Messages */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">
                      Receipt Elements & Footer Messages
                    </h4>
                  </div>

                  <div className="space-y-2 py-1">
                    <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer">
                      <span className="text-xs font-semibold text-stone-800">
                        Print Store Logo on Bill
                      </span>
                      <input
                        type="checkbox"
                        checked={receiptShowLogo}
                        onChange={e => setReceiptShowLogo(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer">
                      <div>
                        <span className="text-xs font-semibold text-stone-800">
                          Show Sweet Rewards Loyalty Box
                        </span>
                        <p className="text-[10px] text-stone-400">
                          Prints "Rs. {loyaltyRate} = 1 pt" earned points and current customer balance
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={receiptShowLoyalty}
                        onChange={e => setReceiptShowLoyalty(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer">
                      <span className="text-xs font-semibold text-stone-800">
                        Show Decorative Bottom Barcode Lines
                      </span>
                      <input
                        type="checkbox"
                        checked={receiptShowBarcode}
                        onChange={e => setReceiptShowBarcode(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Footer Thank You Note (Line 1)
                    </label>
                    <input
                      type="text"
                      value={receiptFooter1}
                      onChange={e => setReceiptFooter1(e.target.value)}
                      placeholder="e.g. *** THANK YOU FOR VISITING! ***"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Footer Slogan (Line 2)
                    </label>
                    <input
                      type="text"
                      value={receiptFooter2}
                      onChange={e => setReceiptFooter2(e.target.value)}
                      placeholder="e.g. Fresh bakes served with passion daily."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveReceiptSettings()}
                      disabled={isSavingReceipt}
                      className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {isSavingReceipt ? 'Saving All Settings...' : 'Save All Receipt & Printer Settings'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview & POS-80C Guide (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Live Preview Card */}
                <div className="bg-stone-900 p-4 rounded-2xl shadow-md border border-stone-800 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-400">Live Preview</span>
                      <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full font-mono">
                        {receiptPaperWidth}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewSlipType('customer')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                          previewSlipType === 'customer'
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-800 text-stone-400 hover:text-white'
                        }`}
                      >
                        Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewSlipType('kitchen')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                          previewSlipType === 'kitchen'
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-800 text-stone-400 hover:text-white'
                        }`}
                      >
                        KOT
                      </button>
                    </div>
                  </div>

                  {/* Thermal Slip Simulation Box */}
                  <div className="bg-stone-800 p-3 rounded-xl flex justify-center overflow-x-auto">
                    <div
                      className={`bg-white text-stone-900 p-3 rounded shadow-lg transition-all ${
                        receiptPaperWidth === '58mm' ? 'w-[230px]' : 'w-[280px]'
                      }`}
                      style={{
                        fontFamily: receiptFontStyle === 'mono' ? 'Courier, monospace' : 'Arial, sans-serif',
                        fontWeight: receiptPrintDensity === 'ultra_dark' ? 600 : 400,
                        color: '#000000',
                        fontSize: receiptFontSize === 'large' ? '12px' : '11px',
                        lineHeight: '1.3'
                      }}
                    >
                      {previewSlipType === 'customer' ? (
                        <div className="space-y-1">
                          {/* Header */}
                          <div className="text-center pb-1.5 border-b border-dashed border-stone-300">
                            {receiptShowLogo && (
                              <img
                                src="/receipt-logo.png"
                                alt="Receipt Logo"
                                className="receipt-logo w-10 h-auto max-h-12 mx-auto mb-1 object-contain filter grayscale contrast-200"
                              />
                            )}
                            <div className="font-bold text-xs uppercase tracking-wide text-black">{receiptStoreName}</div>
                            {receiptTagline && (
                              <div className="text-[9px] uppercase text-stone-600">{receiptTagline}</div>
                            )}
                            <div className="text-[9px] text-stone-600">
                              {receiptAddress} {receiptPhone ? `· ${receiptPhone}` : ''}
                            </div>
                            <div className="mt-1 text-[8.5px] inline-block border border-black px-1.5 py-0.5 font-semibold uppercase">
                              {receiptHeaderNote}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="py-1 text-[10px] text-stone-800 border-b border-dashed border-stone-300 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Receipt No:</span>
                              <span className="font-mono font-semibold">SALE-889911</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Order Mode:</span>
                              <span className="font-semibold uppercase">TAKEAWAY</span>
                            </div>
                            <div className="flex justify-between font-semibold text-black">
                              <span>Patron:</span>
                              <span>Kavindu Anajana</span>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="py-1 border-b border-stone-300">
                            <table className="w-full text-[10.5px]">
                              <thead>
                                <tr className="border-b border-black">
                                  <th className="text-left font-semibold pb-0.5 text-[10px]">ITEM</th>
                                  <th className="text-center font-semibold pb-0.5 text-[10px]">QTY</th>
                                  <th className="text-right font-semibold pb-0.5 text-[10px]">AMOUNT</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                <tr>
                                  <td className="py-0.5">Almond Frangipane Croissant</td>
                                  <td className="text-center font-semibold">x1</td>
                                  <td className="text-right font-mono font-semibold">Rs. 690</td>
                                </tr>
                                <tr>
                                  <td className="py-0.5">Opera Gateau Slice</td>
                                  <td className="text-center font-semibold">x1</td>
                                  <td className="text-right font-mono font-semibold">Rs. 950</td>
                                </tr>
                                <tr>
                                  <td className="py-0.5">Velvety Flat White / Latte</td>
                                  <td className="text-center font-semibold">x2</td>
                                  <td className="text-right font-mono font-semibold">Rs. 1,300</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Totals */}
                          <div className="py-1 border-b border-dashed border-stone-300 text-[10.5px] text-stone-800 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-mono">Rs. 2,940.00</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold border-t border-b border-black py-0.5 my-0.5">
                              <span>TOTAL DUE:</span>
                              <span className="font-mono">Rs. 2,940.00</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Paid via:</span>
                              <span className="font-semibold uppercase">CASH</span>
                            </div>
                          </div>

                          {/* Loyalty */}
                          {receiptShowLoyalty && (
                            <div className="border border-dashed border-stone-400 p-1.5 my-1 text-[9px] text-stone-800 space-y-0.5">
                              <div className="text-center font-semibold uppercase text-[8.5px] border-b border-dashed border-stone-300 pb-0.5">
                                *** SWEET REWARDS (Rs. {loyaltyRate} = 1 pt) ***
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span>Points Earned:</span>
                                <span className="font-mono">+{Math.floor(2940 / loyaltyRate)} pts</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-dashed border-stone-300 pt-0.5">
                                <span>New Patron Balance:</span>
                                <span className="font-mono">24 points</span>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="text-center text-[8.5px] text-stone-600 pt-1 space-y-0.5">
                            {receiptFooter1 && <p>{receiptFooter1}</p>}
                            {receiptFooter2 && <p>{receiptFooter2}</p>}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-center pb-1 border-b border-black">
                            <div className="font-bold text-xs uppercase">** KITCHEN TICKET (KOT) **</div>
                            <div className="text-[10px] font-semibold uppercase">🛍️ TAKEAWAY / COUNTER</div>
                          </div>
                          <div className="py-0.5 text-[9.5px] flex justify-between border-b border-dashed border-stone-300">
                            <span>Order: #SAMPLE-1001</span>
                            <span>Worker 1</span>
                          </div>
                          <div className="py-1 border-b border-black space-y-1">
                            <div className="flex gap-2 text-xs">
                              <span className="font-bold">x1</span>
                              <div>
                                <div className="font-semibold">Almond Frangipane Croissant</div>
                                <div className="text-[9px] text-stone-600">⚠️ Extra crispy</div>
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <span className="font-bold">x1</span>
                              <div className="font-semibold">Opera Gateau Slice</div>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <span className="font-bold">x2</span>
                              <div className="font-semibold">Velvety Flat White / Latte</div>
                            </div>
                          </div>
                          <div className="text-center text-[10px] font-semibold pt-1">
                            STATUS: COMPLETED
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions under preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTestPrint('customer')}
                      className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Print Test Bill (1x)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestPrint('kitchen')}
                      className="flex-1 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Print Test KOT (1x)</span>
                    </button>
                  </div>
                </div>

                {/* POS-80C Chrome Setup Guide */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>POS-80C Thermal Printer Settings in Chrome</span>
                  </div>

                  <div className="text-xs text-stone-600 space-y-2">
                    <p>
                      When you click <b>Print</b>, Chrome opens its print dialog. For perfect 1-sheet thermal output without blank paper:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-stone-700">
                      <li>
                        <b>Destination:</b> Select your thermal printer (e.g. <b>POS-80C</b>).
                      </li>
                      <li>
                        <b>Margins:</b> Expand <i>"More settings"</i> and choose <b>"None"</b>. (Default margins add white space at top/bottom).
                      </li>
                      <li>
                        <b>Paper size:</b> Select <b>"RECEIPT(72mm x 150mm)"</b> or <b>"72mm x Continuous"</b>.
                      </li>
                      <li>
                        <b>Single Copy:</b> Keep copies as <b>1</b>. The system automatically prints exactly 1 copy per request.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: SECURITY & ANYTIME REMOTE SUPERVISION ACCESS      */}
        {/* ======================================================== */}
        {subTab === 'settings' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Remote Supervision Guide */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">How Remote Supervision Works</h3>
                  <p className="text-[11px] text-stone-500">Access shop operations anywhere from your mobile phone or laptop</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-2">
                <p>
                  <b>1. Cashier / Worker in Shop:</b> Operates the POS register on the shop computer/tablet to ring up orders and print 80mm receipts.
                </p>
                <p>
                  <b>2. Owner Anytime Remote Access:</b> Open the URL on your personal smartphone or laptop from anywhere to supervise sales in real time, view revenue, add categories & items, and adjust loyalty points.
                </p>
                <p>
                  <b>3. Free Instant Tunnel / Online Hosting:</b> You can deploy this Next.js app to <b>Vercel / Railway / Render</b> or run <b>Cloudflare Tunnel</b> on the shop machine for a 100% free secure HTTPS link accessible worldwide.
                </p>
              </div>
            </div>

            {/* Change Owner PIN */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Change Owner Access PIN</h3>
                  <p className="text-[11px] text-stone-500">Prevents shop workers from modifying financial reports or products</p>
                </div>
              </div>

              {pinMessage && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  {pinMessage}
                </div>
              )}

              <form onSubmit={handleUpdatePin} className="flex items-center gap-2 max-w-sm">
                <input
                  type="password"
                  placeholder="Enter new 4-digit PIN"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shadow-sm"
                >
                  Save PIN
                </button>
              </form>
            </div>

            {/* Emergency PIN Recovery Options */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Emergency PIN Recovery Credentials</h3>
                  <p className="text-[11px] text-stone-500">Use this secret key or phone number if you ever forget your PIN</p>
                </div>
              </div>

              {recoveryMessage && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
                  {recoveryMessage}
                </div>
              )}

              <form onSubmit={handleUpdateRecoverySettings} className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Master Emergency Recovery Key
                  </label>
                  <input
                    type="text"
                    required
                    value={customRecoveryKey}
                    onChange={e => setCustomRecoveryKey(e.target.value)}
                    placeholder="Enter secret recovery key"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Keep this secret key safe. If you forget your PIN, click <b>"Forgot PIN?"</b> on the login screen to reset it.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Owner Recovery Mobile Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customRecoveryPhone}
                    onChange={e => setCustomRecoveryPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                >
                  Save Recovery Credentials
                </button>
              </form>

              {/* Physical Shop Machine Reset Notice */}
              <div className="mt-4 pt-3 border-t border-stone-100 p-3 rounded-xl bg-stone-50 text-[11px] text-stone-600 space-y-1">
                <span className="font-semibold text-stone-800">Shop PC Emergency Reset:</span>
                <p>
                  If you are standing at the shop computer and completely forgot both your PIN and master key, simply double-click <b>`ResetPin.cmd`</b> on the desktop to immediately reset the PIN back to <b className="font-mono text-amber-700">1234</b>.
                </p>
              </div>
            </div>

            {/* Automated Customer Email & SMTP Settings */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">Customer Digital E-Bill & SMTP Settings</h3>
                    <p className="text-[11px] text-stone-500">
                      Configure your email service (e.g. Gmail) to deliver automated HTML tax invoices directly to customers
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    smtpUser && smtpPass ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {smtpUser && smtpPass ? '● SMTP Configured' : '○ Not Configured'}
                </span>
              </div>

              {emailSettingsMessage && (
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold">
                  {emailSettingsMessage}
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-stone-500 text-[11px] font-semibold">1-Click Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSmtpHost('smtp.gmail.com');
                    setSmtpPort('587');
                    setSmtpSecure(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold transition"
                >
                  Gmail (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmtpHost('smtp.office365.com');
                    setSmtpPort('587');
                    setSmtpSecure(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-semibold transition"
                >
                  Outlook / Hotmail
                </button>
              </div>

              <form onSubmit={handleSaveEmailSettings} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Sender Name (Appears on Bills)
                    </label>
                    <input
                      type="text"
                      value={smtpFromName}
                      onChange={e => setSmtpFromName(e.target.value)}
                      placeholder="e.g. EATmi BAKERY & CAFE"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Sender Email (SMTP Username)
                    </label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={e => setSmtpUser(e.target.value)}
                      placeholder="e.g. yourbakery@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                      <span>Google 16-Character App Password</span>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Google App Passwords</span>
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={smtpPass}
                        onChange={e => setSmtpPass(e.target.value.replace(/\s+/g, ''))}
                        placeholder="e.g. abcd efgh ijkl mnop"
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                        title={showSmtpPass ? 'Hide password' : 'Show password'}
                      >
                        {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Port</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value)}
                      placeholder="587 or 465"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      SMTP Host Server
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={e => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtpSecureCheck"
                      checked={smtpSecure}
                      onChange={e => setSmtpSecure(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="smtpSecureCheck" className="text-xs font-medium text-stone-700 cursor-pointer">
                      Use SSL Encryption (Port 465)
                    </label>
                  </div>
                </div>

                {/* Gmail App Password Instructions */}
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900">
                      <HelpCircle className="w-4 h-4 text-blue-700" />
                      Google Requires a 16-Character "App Password" (Not Your Account Password):
                    </span>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-xs transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Generate Password on Google</span>
                    </a>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-blue-900/90 text-[11px]">
                    <li>
                      Ensure <b>2-Step Verification</b> is turned <b>ON</b> on your Google Account (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-semibold">myaccount.google.com/security</a>).
                    </li>
                    <li>
                      Click the button above or visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-semibold">myaccount.google.com/apppasswords</a>.
                    </li>
                    <li>
                      Type <b>"EATmi POS"</b> in the App Name box and click <b>Create</b>.
                    </li>
                    <li>
                      Google will show you a yellow box with a <b>16-letter password</b> (e.g. <span className="font-mono bg-blue-100/70 px-1 py-0.5 rounded font-bold">abcd efgh ijkl mnop</span>).
                    </li>
                    <li>
                      Copy and paste those 16 letters into the password field above, then click <b>Save Email Settings</b>.
                    </li>
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    disabled={isSavingEmailSettings}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isSavingEmailSettings ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Email Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Send Test Email Section */}
              <div className="pt-3 border-t border-stone-200 space-y-2">
                <span className="text-xs font-bold text-stone-800 block">
                  Verify & Test Email Delivery
                </span>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                    placeholder={smtpUser || 'Enter email to receive test'}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={isSendingTestEmail}
                    className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                  >
                    {isSendingTestEmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Test...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </button>
                </div>
                {testEmailStatus && (
                  <div className="text-[11px] p-2.5 rounded-lg bg-stone-50 border border-stone-200 font-medium">
                    {testEmailStatus}
                  </div>
                )}
              </div>

              {/* Cloud Database Backup & Disaster Recovery */}
              <div className="pt-3.5 border-t border-stone-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        Disaster Recovery: Email Complete Database Backup
                      </span>
                      <p className="text-[10.5px] text-stone-500">
                        Sends your full <code>counter.sqlite</code> database file directly to your Gmail as an attachment.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEmailDbBackup}
                    disabled={isBackingUpDb}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                  >
                    {isBackingUpDb ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Backup...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Email DB Backup Now</span>
                      </>
                    )}
                  </button>
                </div>
                {backupDbStatus && (
                  <div className="text-[11px] p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                    {backupDbStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={editingCategory}
        onSaved={onRefreshData}
      />

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        defaultCategoryId={selectedProductCategoryFilter !== 'all' ? selectedProductCategoryFilter : undefined}
        onSaved={onRefreshData}
      />

      <CustomerPointsModal
        isOpen={pointsModalOpen}
        onClose={() => setPointsModalOpen(false)}
        customer={editingCustomer}
        onSaved={onRefreshData}
      />

      <NewCustomerModal
        isOpen={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        loyaltyRate={loyaltyRate}
        onCustomerCreated={async () => {
          await onRefreshData();
        }}
      />
    </div>
  );
}

