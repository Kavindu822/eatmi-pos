'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Receipt,
  Utensils,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  Sliders,
  Mail,
  Send,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Phone,
  User,
  Loader2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { formatRupees, formatShortRupees } from '@/lib/utils';
import { Sale, Customer } from '@/lib/types';
import { generateReceiptHtml, printReceiptHtml } from '@/lib/receipt';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customer?: Customer | null;
  customerPointsBalance?: number;
  settings?: Record<string, string>;
}

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  sale,
  customer,
  customerPointsBalance,
  settings = {}
}: ThermalReceiptModalProps) {
  const [activeSlip, setActiveSlip] = useState<'customer' | 'kitchen' | 'send'>('customer');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(
    (settings?.receipt_paper_width as any) || '80mm'
  );
  const [showLogo, setShowLogo] = useState<boolean>(settings?.receipt_show_logo !== 'false');
  const [printStatus, setPrintStatus] = useState<string>('');

  // Send E-Bill State
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sendFeedback, setSendFeedback] = useState('');
  const [sendFeedbackType, setSendFeedbackType] = useState<'success' | 'warning' | 'error' | 'info'>('info');
  const [copiedText, setCopiedText] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showWebmailOptions, setShowWebmailOptions] = useState(false);

  useEffect(() => {
    if (customer) {
      setSendEmail(customer.email || '');
      setSendPhone(customer.phone || '');
    } else {
      setSendEmail('');
      setSendPhone('');
    }
    setSendFeedback('');
    setCopiedText(false);
    setShowWebmailOptions(false);
  }, [customer, sale, isOpen]);

  if (!isOpen || !sale) return null;

  let items: any[] = [];
  try {
    items = JSON.parse(sale.items);
  } catch (e) {
    items = [];
  }

  // 1. Print Customer Bill (Exact 1 Single Copy)
  const handlePrintCustomerBill = () => {
    setPrintStatus('Printing Customer Bill...');
    const html = generateReceiptHtml({
      sale,
      customerPointsBalance,
      settings,
      slipType: 'customer',
      paperWidth,
      showLogo
    });
    printReceiptHtml(html, () => {
      setPrintStatus('Customer Bill Sent to Printer');
      setTimeout(() => setPrintStatus(''), 2500);
    });
  };

  // 2. Print Kitchen Ticket (Exact 1 Single Copy)
  const handlePrintKitchenKot = () => {
    setPrintStatus('Printing Kitchen Ticket (KOT)...');
    const html = generateReceiptHtml({
      sale,
      customerPointsBalance,
      settings,
      slipType: 'kitchen',
      paperWidth,
      showLogo: false
    });
    printReceiptHtml(html, () => {
      setPrintStatus('Kitchen Ticket Sent to Printer');
      setTimeout(() => setPrintStatus(''), 2500);
    });
  };

  const formattedDate = new Date(sale.created).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const storeName = settings?.receipt_store_name || 'EATmi BAKERY & CAFE';
  const tagline = settings?.receipt_tagline || 'ARTISAN PÂTISSERIE & ROASTERY';
  const address = settings?.receipt_address || 'No. 07, Eugine Balasuriya Mawatha, Nupe, Matara';
  const phone = settings?.receipt_phone || '0740546060';
  const headerNote = settings?.receipt_header_note || 'TAX INVOICE / RECEIPT';
  const footer1 = settings?.receipt_footer_1 || '*** THANK YOU FOR VISITING! ***';
  const footer2 = settings?.receipt_footer_2 || 'Fresh bakes served with passion daily.';
  const loyaltyRate = Math.max(1, Number(settings?.loyalty_rate_rupees) || 300);
  const showLoyaltyBox = settings?.receipt_show_loyalty !== 'false';
  const showBarcode = settings?.receipt_show_barcode !== 'false';

  // Generate Formatted Plain-Text Receipt (for Email, WhatsApp, and SMS)
  const generateReceiptPlainText = () => {
    const divider = '------------------------------------------';
    const doubleDivider = '==========================================';

    const lines = [
      doubleDivider,
      storeName,
      tagline,
      address,
      `Tel: ${phone}`,
      'TAX INVOICE / RECEIPT',
      doubleDivider,
      `Receipt No:  ${sale.id}`,
      `Date & Time: ${formattedDate}`,
      `Order Mode:  ${(sale.order_type || 'takeaway').toUpperCase()}`,
      `Patron:      ${sale.customer_name || 'Walk-in Guest'}`,
      `Cashier:     ${sale.cashier || 'Worker 1'}`,
      divider,
      'ITEMS ORDERED:',
      divider
    ];

    items.forEach(it => {
      lines.push(`${it.name} x${it.qty} - ${formatRupees(it.price * it.qty)}`);
      if (it.notes) {
        lines.push(`  * ${it.notes}`);
      }
    });

    lines.push(divider);
    lines.push(`Subtotal:    ${formatRupees(sale.subtotal)}`);
    if (sale.discount > 0) {
      lines.push(`Discount:   -${formatRupees(sale.discount)}`);
    }
    lines.push(`TOTAL DUE:   ${formatRupees(sale.total)}`);
    lines.push(`Paid via:    ${(sale.payment || 'CASH').toUpperCase()}`);
    if (sale.tendered > 0) {
      lines.push(`Cash Paid:   ${formatRupees(sale.tendered)}`);
      lines.push(`Change:      ${formatRupees(Math.max(0, sale.tendered - sale.total))}`);
    }

    if (showLoyaltyBox) {
      lines.push(divider);
      lines.push(`*** SWEET REWARDS (Rs. ${loyaltyRate} = 1 pt) ***`);
      if (sale.earned > 0) {
        lines.push(`Points Earned on this bill: +${sale.earned} pts`);
      } else {
        lines.push(`Points Earned: 0 pts (Spend Rs. ${loyaltyRate}+ to earn)`);
      }
      if (customerPointsBalance !== undefined) {
        lines.push(`New Patron Balance: ${customerPointsBalance} points`);
      }
    }

    lines.push(doubleDivider);
    if (footer1) lines.push(footer1);
    if (footer2) lines.push(footer2);
    lines.push(doubleDivider);

    return lines.join('\n');
  };

  // 4. Send via Email (Direct Server-side Dispatch + Webmail Fallback)
  const handleSendEmail = async () => {
    const targetEmail = sendEmail.trim();
    if (!targetEmail) {
      setSendFeedback('Please enter customer email address.');
      setSendFeedbackType('error');
      return;
    }

    setIsSendingEmail(true);
    setSendFeedback(`Sending digital bill directly to ${targetEmail}...`);
    setSendFeedbackType('info');
    setShowWebmailOptions(false);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale,
          to: targetEmail,
          customerPointsBalance
        })
      });

      const data = await res.json();
      if (data.ok) {
        setSendFeedback(data.message || `Email bill successfully sent to ${targetEmail}!`);
        setSendFeedbackType('success');
      } else if (data.notConfigured) {
        setSendFeedback('Server SMTP is not configured yet. You can send instantly via Webmail below:');
        setSendFeedbackType('warning');
        setShowWebmailOptions(true);
      } else {
        setSendFeedback(data.error || 'Failed to send email bill. You can send via Webmail below:');
        setSendFeedbackType('error');
        setShowWebmailOptions(true);
      }
    } catch (err: any) {
      setSendFeedback('Connection error. You can send instantly via Webmail below:');
      setSendFeedbackType('error');
      setShowWebmailOptions(true);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 5. Send via WhatsApp
  const handleSendWhatsApp = () => {
    const targetPhone = sendPhone.trim();
    if (!targetPhone) {
      setSendFeedback('Please enter customer mobile phone number.');
      return;
    }
    let cleaned = targetPhone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '94' + cleaned.substring(1);
    } else if (!cleaned.startsWith('94')) {
      cleaned = '94' + cleaned;
    }
    const receiptText = generateReceiptPlainText();
    const waUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(receiptText)}`;

    window.open(waUrl, '_blank');
    setSendFeedback(`Opening WhatsApp for +${cleaned}...`);
    setTimeout(() => setSendFeedback(''), 4000);
  };

  // 6. Copy plain text to clipboard
  const handleCopyText = async () => {
    try {
      const receiptText = generateReceiptPlainText();
      await navigator.clipboard.writeText(receiptText);
      setCopiedText(true);
      setSendFeedback('Receipt text copied to clipboard!');
      setTimeout(() => {
        setCopiedText(false);
        setSendFeedback('');
      }, 3000);
    } catch (e) {
      setSendFeedback('Failed to copy to clipboard');
    }
  };

  return (
    <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="receipt-modal-card bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-stone-200">
        {/* Top Control Bar (Hidden during print) */}
        <div className="print-hidden p-3 border-b border-stone-200 bg-stone-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSlip('customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSlip === 'customer'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Customer Bill</span>
              </button>

              <button
                onClick={() => setActiveSlip('kitchen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSlip === 'kitchen'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Kitchen Ticket (KOT)</span>
              </button>

              <button
                onClick={() => setActiveSlip('send')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSlip === 'send'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Bill to Customer</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Thermal Controls (Hidden during print) */}
          {activeSlip !== 'send' ? (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200 text-stone-600">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-500">Roll:</span>
                <button
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    paperWidth === '80mm' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                  title="80mm Thermal Paper (72mm printable - POS-80C)"
                >
                  80mm (72mm POS-80C)
                </button>
                <button
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    paperWidth === '58mm' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                  title="58mm Mini Roll (48mm printable)"
                >
                  58mm
                </button>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-stone-700">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={e => setShowLogo(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                <span>Logo</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200 text-stone-600">
              <span className="font-semibold text-stone-700">Digital Delivery Options:</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  📧 Email
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  📱 WhatsApp
                </span>
              </div>
            </div>
          )}

          {printStatus && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{printStatus}</span>
            </div>
          )}
        </div>

        {/* Scrollable Receipt Area */}
        <div className="receipt-modal-scroll-area flex-1 overflow-y-auto p-3 sm:p-5 bg-stone-200 flex justify-center items-start">
          {activeSlip === 'send' ? (
            <div className="w-full max-w-md bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">Send Digital E-Bill to Customer</h4>
                    <p className="text-[11px] text-stone-500">
                      Deliver itemized tax invoice & loyalty rewards directly to patron.
                    </p>
                  </div>
                </div>
              </div>

              {sendFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 animate-in fade-in ${
                    sendFeedbackType === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : sendFeedbackType === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : sendFeedbackType === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  {sendFeedbackType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : sendFeedbackType === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : sendFeedbackType === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{sendFeedback}</span>
                </div>
              )}

              {/* Patron & Order Overview */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Patron:</span>
                  <span className="font-bold text-stone-900">{sale.customer_name || 'Walk-in Guest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Receipt No:</span>
                  <span className="font-mono font-semibold text-stone-800">{sale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Total Amount:</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">{formatRupees(sale.total)}</span>
                </div>
                {sale.earned > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-stone-200">
                    <span>Points Earned on this Bill:</span>
                    <span className="font-mono">+{sale.earned} pts</span>
                  </div>
                )}
              </div>

              {/* 1. Email Sender */}
              <div className="space-y-2 p-3.5 rounded-xl border border-stone-200 hover:border-blue-300 transition bg-white">
                <label className="block text-xs font-bold text-stone-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Email Address</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={sendEmail}
                    onChange={e => setSendEmail(e.target.value)}
                    placeholder="e.g. customer@gmail.com"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send E-Bill</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10.5px] text-stone-500">
                  Sends full branded HTML tax invoice directly to customer inbox with rewards breakdown.
                </p>

                {/* Instant 1-Click Webmail Fallback Options */}
                {showWebmailOptions && (
                  <div className="mt-2.5 pt-2.5 border-t border-stone-200 space-y-2">
                    <span className="text-[11px] font-semibold text-stone-700 block">
                      Choose an instant webmail service to send now:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const su = encodeURIComponent(`Tax Invoice / Receipt: ${sale.id} - ${storeName}`);
                          const body = encodeURIComponent(generateReceiptPlainText());
                          window.open(
                            `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(sendEmail)}&su=${su}&body=${body}`,
                            '_blank'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-semibold flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Gmail Web</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const su = encodeURIComponent(`Tax Invoice / Receipt: ${sale.id} - ${storeName}`);
                          const body = encodeURIComponent(generateReceiptPlainText());
                          window.open(
                            `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(sendEmail)}&subject=${su}&body=${body}`,
                            '_blank'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-semibold flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Outlook Web</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const su = encodeURIComponent(`Tax Invoice / Receipt: ${sale.id} - ${storeName}`);
                          const body = encodeURIComponent(generateReceiptPlainText());
                          window.open(`mailto:${encodeURIComponent(sendEmail)}?subject=${su}&body=${body}`, '_blank');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-[11px] font-semibold flex items-center gap-1.5 transition"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Default Mail App</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      💡 Tip: For 100% automated background email sending without clicking, save your Gmail SMTP in <b>Owner Portal &gt; Settings</b>.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. WhatsApp Sender */}
              <div className="space-y-1.5 p-3.5 rounded-xl border border-stone-200 hover:border-emerald-300 transition bg-white">
                <label className="block text-xs font-bold text-stone-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mobile Phone / WhatsApp Number</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.2 rounded">
                    Instant
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={sendPhone}
                    onChange={e => setSendPhone(e.target.value)}
                    placeholder="e.g. 0740546060"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-stone-500">
                  Opens WhatsApp with the formatted bill ready to send with 1 click.
                </p>
              </div>

              {/* 3. Copy Plain Text Receipt */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied to Clipboard!' : 'Copy Bill Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSlip('customer')}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  ← Back to Thermal Slip
                </button>
              </div>

              {/* 4. Formatted Message Preview */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wide">
                  Formatted Digital Bill Preview:
                </span>
                <pre className="bg-stone-900 text-stone-200 p-3 rounded-xl text-[10px] font-mono whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed border border-stone-800">
                  {generateReceiptPlainText()}
                </pre>
              </div>
            </div>
          ) : (
            /* Printable Thermal Receipt Container */
            <div
              id="thermal-receipt-print-area"
              className={`bg-white text-stone-900 p-4 rounded-lg shadow-sm border border-stone-200 font-sans text-xs leading-snug w-full transition-all ${
                paperWidth === '58mm' ? 'max-w-[270px] paper-58mm' : 'max-w-[340px]'
              }`}
              style={{
                color: '#000000',
                WebkitTextFillColor: '#000000',
                height: 'auto',
                fontWeight: 400
              }}
            >
              {activeSlip === 'customer' ? (
              /* ==================================================== */
              /* 1. CUSTOMER RECEIPT (1 COPY / AUTO-FIT HEIGHT)       */
              /* ==================================================== */
              <div>
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-stone-300">
                  {showLogo && (
                    <img
                      src="/receipt-logo.png"
                      alt="Logo"
                      className="receipt-logo w-10 h-auto max-h-12 mx-auto mb-1 object-contain"
                    />
                  )}
                  <h2 className="font-bold text-sm uppercase tracking-wide text-black">
                    {storeName}
                  </h2>
                  {tagline && (
                    <p className="text-[10px] text-stone-600 uppercase tracking-wide">
                      {tagline}
                    </p>
                  )}
                  <p className="text-[10px] text-stone-600">
                    {address} {phone ? `· Tel: ${phone}` : ''}
                  </p>
                  <div className="mt-1 text-[9px] inline-block border border-black px-2 py-0.5 font-semibold uppercase text-black">
                    {headerNote}
                  </div>
                </div>

                {/* Metadata */}
                <div className="py-1.5 text-[11px] text-stone-800 border-b border-dashed border-stone-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span className="font-mono font-semibold">{sale.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{sale.cashier || 'Cashier 1'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Mode:</span>
                    <span className="font-semibold uppercase">
                      {sale.order_type} {sale.table_no ? `(${sale.table_no})` : ''}
                    </span>
                  </div>
                  {sale.customer_name && sale.customer_name !== 'Walk-in Patron' && (
                    <div className="flex justify-between font-semibold text-black pt-0.5">
                      <span>Patron:</span>
                      <span>{sale.customer_name}</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="py-1.5 border-b border-stone-300">
                  <table className="w-full text-left text-xs text-stone-900">
                    <thead>
                      <tr className="border-b border-black pb-0.5">
                        <th className="font-semibold pb-1 text-black text-[10.5px]">ITEM</th>
                        <th className="font-semibold text-center pb-1 text-black text-[10.5px]">QTY</th>
                        <th className="font-semibold text-right pb-1 text-black text-[10.5px]">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {items.map((it, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="py-1 pr-1">
                            <div className="font-normal text-stone-900">{it.name}</div>
                            {it.modifiers && (
                              <div className="text-[10px] text-stone-500">
                                * {it.modifiers}
                              </div>
                            )}
                          </td>
                          <td className="py-1 text-center font-semibold text-black">
                            x{it.qty}
                          </td>
                          <td className="py-1 text-right font-semibold font-mono text-black">
                            {formatShortRupees(it.price * it.qty)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Totals */}
                <div className="py-1.5 border-b border-dashed border-stone-300 text-xs text-stone-800 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatRupees(sale.subtotal)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Discount / Loyalty:</span>
                      <span className="font-mono">-{formatRupees(sale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm sm:text-base font-bold border-t border-b border-black py-1 my-1">
                    <span>TOTAL DUE:</span>
                    <span className="font-mono">{formatRupees(sale.total)}</span>
                  </div>
                </div>

                {/* Payment & Change */}
                <div className="py-1 text-xs text-stone-800 border-b border-dashed border-stone-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Paid via:</span>
                    <span className="font-semibold uppercase">{sale.payment}</span>
                  </div>
                  {sale.payment === 'Cash' && (
                    <>
                      <div className="flex justify-between">
                        <span>Cash Tendered:</span>
                        <span className="font-mono">{formatRupees(sale.tendered)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-xs sm:text-sm pt-0.5">
                        <span>Change Given:</span>
                        <span className="font-mono">{formatRupees(sale.tendered - sale.total)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Customer Rewards Box */}
                {showLoyaltyBox && (
                  <div className="border border-dashed border-stone-400 p-2 my-2 text-xs text-stone-800 space-y-0.5">
                    <div className="text-center font-semibold uppercase text-[9.5px] tracking-wide pb-0.5 border-b border-dashed border-stone-300">
                      *** SWEET REWARDS (Rs. {loyaltyRate} = 1 pt) ***
                    </div>
                    {sale.earned > 0 ? (
                      <div className="flex justify-between font-semibold text-[11px] pt-0.5">
                        <span>Points Earned on this bill:</span>
                        <span className="font-mono">+{sale.earned} pts</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[10px] text-stone-600">
                        <span>Points Earned:</span>
                        <span>0 pts (Spend Rs. {loyaltyRate}+ to earn)</span>
                      </div>
                    )}
                    {sale.redeemed > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span>Points Redeemed:</span>
                        <span>-{sale.redeemed} pts</span>
                      </div>
                    )}
                    {customerPointsBalance !== undefined && (
                      <div className="flex justify-between font-semibold text-xs pt-0.5 border-t border-dashed border-stone-300">
                        <span>New Patron Balance:</span>
                        <span className="font-mono">{customerPointsBalance} points</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Notes */}
                <div className="text-center pt-1.5 text-[10px] text-stone-600 space-y-0.5">
                  {footer1 && <p>{footer1}</p>}
                  {footer2 && <p>{footer2}</p>}
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* 2. KITCHEN ORDER TICKET (1 COPY / AUTO-FIT HEIGHT)   */
              /* ==================================================== */
              <div>
                <div className="text-center pb-2 border-b border-black">
                  <h2 className="font-bold text-sm uppercase tracking-wide text-black">
                    ** KITCHEN ORDER TICKET **
                  </h2>
                  <p className="text-xs font-semibold uppercase mt-0.5 text-black">
                    {sale.order_type === 'dine_in'
                      ? `🍽️ DINE-IN · ${sale.table_no || 'Table ?'}`
                      : '🛍️ TAKEAWAY / COUNTER'}
                  </p>
                </div>

                <div className="py-1 border-b border-dashed border-stone-300 text-xs flex justify-between text-stone-800">
                  <span>Order: <b>#{sale.id}</b></span>
                  <span>{formattedDate}</span>
                </div>

                <div className="py-2 border-b border-black">
                  <table className="w-full text-left text-xs text-stone-900">
                    <thead>
                      <tr className="border-b border-black">
                        <th className="pb-1 font-semibold text-[10.5px]">QTY</th>
                        <th className="pb-1 font-semibold text-[10.5px] pl-2">ITEM & INSTRUCTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {items.map((it, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="py-1 font-bold text-sm">x{it.qty}</td>
                          <td className="py-1 pl-2">
                            <div className="text-xs font-semibold">{it.name}</div>
                            {it.modifiers && (
                              <div className="text-[10px] text-stone-600 mt-0.5">
                                ⚠️ {it.modifiers}
                              </div>
                            )}
                            {it.notes && (
                              <div className="text-[10px] text-stone-500 mt-0.5">
                                Note: {it.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {sale.notes && (
                  <div className="py-1.5 border border-dashed border-stone-400 p-1.5 my-1.5 text-xs text-stone-800">
                    Instructions: <b>{sale.notes}</b>
                  </div>
                )}

                <div className="text-center pt-1 text-xs font-semibold text-stone-800">
                  STATUS: {sale.status.toUpperCase()}
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Modal Bottom Actions (Hidden during print) */}
        <div className="print-hidden p-3 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition"
          >
            Close / Next Sale
          </button>

          <div className="flex items-center gap-1.5">
            {/* Send Digital E-Bill to Customer Button */}
            <button
              onClick={() => setActiveSlip(activeSlip === 'send' ? 'customer' : 'send')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition border ${
                activeSlip === 'send'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200'
              }`}
              title="Send digital receipt directly to customer via Email or WhatsApp"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeSlip === 'send' ? 'View Bill Slip' : 'Send E-Bill'}</span>
            </button>

            {/* Print KOT (1x) */}
            <button
              onClick={handlePrintKitchenKot}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 text-xs font-bold shadow-xs transition"
              title="Prints 1 single Kitchen Ticket (auto-adjusted length)"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-600" />
              <span>Print KOT (1x)</span>
            </button>

            {/* Print Bill (1x) */}
            <button
              onClick={handlePrintCustomerBill}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-md transition"
              title="Prints 1 single Customer Receipt (auto-adjusted length)"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Bill (1x)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
