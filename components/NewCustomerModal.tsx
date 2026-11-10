'use client';

import React, { useState } from 'react';
import { UserPlus, X, Phone, User, Mail, Award, CheckCircle2 } from 'lucide-react';
import { Customer } from '@/lib/types';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
  loyaltyRate?: number;
}

export default function NewCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  loyaltyRate = 300
}: NewCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Full Name is compulsory.');
      return;
    }
    if (!cleanPhone) {
      setError('Mobile Phone Number is compulsory.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'customer',
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail
        })
      });

      const data = await res.json();
      if (data.ok && data.customer) {
        setName('');
        setPhone('');
        setEmail('');
        onCustomerCreated(data.customer);
        onClose();
      } else {
        setError(data.error || 'Failed to register customer');
      }
    } catch (err: any) {
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900">Register Loyalty Patron</h3>
              <p className="text-[11px] text-stone-500 font-medium">
                Earn 1 Point for every Rs. {loyaltyRate} spent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Full Name (Compulsory) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>Full Name</span>
                <span className="text-rose-600">*</span>
              </span>
              <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                Compulsory
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kasun Fernando"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
            />
          </div>

          {/* 2. Mobile Phone Number (Compulsory) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-500" />
                <span>Mobile Phone Number</span>
                <span className="text-rose-600">*</span>
              </span>
              <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                Compulsory
              </span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0740546060 or 0771234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono font-bold"
            />
          </div>

          {/* 3. Email Address (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <span>Email Address</span>
              </span>
              <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded font-normal">
                Optional · for e-bills
              </span>
            </label>
            <input
              type="email"
              placeholder="e.g. customer@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
            />
            <p className="text-[10.5px] text-stone-500 mt-1">
              Bill receipts can be sent directly to this email at checkout.
            </p>
          </div>

          {/* Automatic Rewards Notice */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <Award className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Automatic Rewards:</span> The patron earns <b>1 point for every Rs. {loyaltyRate} spent</b> starting on this checkout!
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register & Attach to Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
