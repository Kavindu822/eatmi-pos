'use client';

import React, { useState, useEffect } from 'react';
import { Award, X, AlertCircle } from 'lucide-react';
import { Customer } from '@/lib/types';
import { formatRupees } from '@/lib/utils';

interface CustomerPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaved: () => Promise<void>;
}

export default function CustomerPointsModal({
  isOpen,
  onClose,
  customer,
  onSaved
}: CustomerPointsModalProps) {
  const [points, setPoints] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setPoints(customer.points || 0);
    }
    setError('');
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_customer_points',
          id: customer.id,
          points: Math.max(0, Math.floor(points))
        })
      });

      const data = await res.json();
      if (data.ok) {
        await onSaved();
        onClose();
      } else {
        setError(data.error || 'Failed to update points');
      }
    } catch (err: any) {
      setError('Connection failed. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-900">Adjust Loyalty Points</h3>
              <p className="text-[11px] text-stone-500">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
            <div className="flex justify-between text-stone-500">
              <span>Mobile Phone:</span>
              <span className="font-mono text-stone-900">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex justify-between text-stone-500">
                <span>Email Address:</span>
                <span className="font-mono text-stone-900">{customer.email}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-500">
              <span>Total Lifetime Spent:</span>
              <span className="font-mono text-stone-900">{formatRupees(customer.spent)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Total Visits:</span>
              <span className="font-mono text-stone-900">{customer.visits} times</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Loyalty Points Balance</label>
            <input
              type="number"
              min="0"
              value={points}
              onChange={e => setPoints(Number(e.target.value))}
              className="w-full px-3 py-2 text-lg font-mono font-bold text-amber-900 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Note: 1 Point = Rs. 1.00 redemption discount. Customers earn 1 pt per Rs. 300 spent automatically.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Save Points'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

