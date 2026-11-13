'use client';

import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

interface ResetSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => Promise<void> | void;
}

export default function ResetSalesModal({
  isOpen,
  onClose,
  onResetComplete
}: ResetSalesModalProps) {
  const [pin, setPin] = useState('');
  const [resetCustomers, setResetCustomers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your 4-digit Owner PIN (default: 1234).');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_all_sales',
          pin: pin.trim(),
          resetCustomers
        })
      });

      const data = await res.json();
      if (data.ok) {
        setSuccess(data.message || 'All test transaction records cleared successfully!');
        setTimeout(async () => {
          setSuccess('');
          setPin('');
          onClose();
          if (onResetComplete) {
            await onResetComplete();
          }
        }, 1200);
      } else {
        setError(data.error || 'Failed to clear sales records. Check your PIN.');
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
              <h3 className="font-bold text-sm text-stone-900">Reset / Clear Test Records</h3>
              <p className="text-[11px] text-stone-500">Wipe testing transactions from PC & Cloud</p>
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
        <form onSubmit={handleReset} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>What this will do:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11.5px] text-amber-800">
              <li>Permanently deletes all historical sales invoices and orders from both your local PC and Turso Cloud.</li>
              <li>Resets today's Gross Sales, Cash in Drawer, and Z-report statistics to <b>Rs. 0.00</b>.</li>
              <li>Your products, prices, stock quantities, and categories are <b>kept completely safe</b>.</li>
            </ul>
          </div>

          {/* Reset Customer Points Option */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 cursor-pointer transition">
            <input
              type="checkbox"
              checked={resetCustomers}
              onChange={e => setResetCustomers(e.target.checked)}
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 border-stone-300"
            />
            <div className="text-xs">
              <span className="font-semibold text-stone-800">
                Also reset customer points, spent, and visits to 0
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Recommended for clean production start. Keeps registered customer names and phone numbers, but clears test points.
              </p>
            </div>
          </label>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              <span>Enter Owner PIN to Confirm (Default: 1234)</span>
            </label>
            <input
              type="password"
              maxLength={10}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

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
              disabled={loading || Boolean(success)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Clearing Records...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Reset & Clear Sales</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

