'use client';

import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Loader2, PackageCheck, RotateCcw } from 'lucide-react';
import { Sale } from '@/lib/types';
import { formatRupees } from '@/lib/utils';

interface DeleteSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onDeleted: () => Promise<void> | void;
}

export default function DeleteSaleModal({
  isOpen,
  onClose,
  sale,
  onDeleted
}: DeleteSaleModalProps) {
  const [restoreStock, setRestoreStock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !sale) return null;

  let items: any[] = [];
  try {
    items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
  } catch (e) {
    items = [];
  }

  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  const dateFormatted = new Date(sale.created).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_sale',
          id: sale.id,
          restoreStock
        })
      });

      const data = await res.json();
      if (data.ok) {
        if (onDeleted) {
          await onDeleted();
        }
        onClose();
      } else {
        setError(data.error || 'Failed to delete wrong bill.');
      }
    } catch (err: any) {
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-200 bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900">Delete Wrong Bill</h3>
              <p className="text-[11px] text-stone-500 font-mono">#{sale.id} · {dateFormatted}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDelete} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Revenue Deduction Warning */}
          <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-800">Bill Total to Deduct:</span>
              <span className="font-mono font-extrabold text-base text-rose-700">{formatRupees(sale.total)}</span>
            </div>
            <p className="text-[11px] text-rose-700/90 pt-0.5">
              This amount will be immediately removed from Today's Gross Revenue and {sale.payment} totals to balance your counter register.
            </p>
          </div>

          {/* Items & Stock Return Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Items in this bill ({items.length} items, {totalQty} pcs):</span>
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-stone-50 border border-stone-200 divide-y divide-stone-100 text-xs">
              {items.map((it, idx) => (
                <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-stone-900">{it.name}</span>
                    <span className="text-[11px] text-stone-400 ml-1.5">x{it.qty}</span>
                  </div>
                  {restoreStock && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      +{it.qty} restored to stock
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Points Info (if present) */}
          {sale.customer_name && sale.customer_name !== 'Walk-in Patron' && sale.customer_name !== 'Walk-in Customer' && (
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-amber-800">Customer:</span>
                <span className="font-semibold text-amber-950">{sale.customer_name}</span>
              </div>
              {sale.earned > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Earned Points Reversal:</span>
                  <span className="font-semibold text-rose-700">-{sale.earned} pts</span>
                </div>
              )}
              {sale.redeemed > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Redeemed Points Refund:</span>
                  <span className="font-semibold text-emerald-700">+{sale.redeemed} pts (refunded)</span>
                </div>
              )}
            </div>
          )}

          {/* Restore Stock Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/80 cursor-pointer transition">
            <input
              type="checkbox"
              checked={restoreStock}
              onChange={e => setRestoreStock(e.target.checked)}
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 border-stone-300"
            />
            <div className="text-xs">
              <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Return item quantities back into product stock</span>
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Adds the {totalQty} ordered unit(s) back into your product inventory so stock counts stay accurate.
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Bill...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bill & Balance Revenue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

