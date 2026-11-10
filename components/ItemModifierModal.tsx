'use client';

import React, { useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { Product } from '@/lib/types';
import { formatRupees } from '@/lib/utils';

interface ItemModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (product: Product, modifiers: string, notes: string) => void;
}

export default function ItemModifierModal({
  isOpen,
  onClose,
  product,
  onConfirm
}: ItemModifierModalProps) {
  const [temp, setTemp] = useState('Room Temp');
  const [packaging, setPackaging] = useState('Bakery Bag');
  const [milk, setMilk] = useState('Whole Milk');
  const [notes, setNotes] = useState('');

  if (!isOpen || !product) return null;

  const isDrink = product.category.toLowerCase().includes('drink') || product.category.toLowerCase().includes('coffee');

  const handleApply = () => {
    const mods: string[] = [];
    if (temp !== 'Room Temp') mods.push(temp);
    if (packaging !== 'Bakery Bag') mods.push(packaging);
    if (isDrink && milk !== 'Whole Milk') mods.push(milk);

    onConfirm(product, mods.join(', '), notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-900">Customize Item</h3>
              <p className="text-[11px] text-stone-500">{product.name} · {formatRupees(product.price)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Temperature / Serving */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">Service Temperature</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Room Temp', icon: '✨' },
                { label: 'Warm in Oven 🔥', icon: '🔥' },
                { label: 'Toasted Crispy 🥪', icon: '🥪' },
                { label: 'Chilled / Iced ❄️', icon: '❄️' },
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setTemp(opt.label)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition ${
                    temp === opt.label
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {temp === opt.label && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Presentation Packaging */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">Presentation & Packaging</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                'Bakery Bag',
                'Gift Box 🎀',
                'Porcelain Plate 🍽️'
              ].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPackaging(opt)}
                  className={`p-2 rounded-xl border text-xs font-medium text-center transition ${
                    packaging === opt
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Barista Milk (if drink) */}
          {isDrink && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">Barista Milk</label>
              <div className="grid grid-cols-3 gap-2">
                {['Whole Milk', 'Oat Milk 🌾', 'Almond Milk 🌰'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMilk(opt)}
                    className={`p-2 rounded-xl border text-xs font-medium text-center transition ${
                      milk === opt
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Kitchen / Barista Instructions</label>
            <input
              type="text"
              placeholder="e.g. Cut into 4 pieces, pack ribbon separately, extra warm"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
            />
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}

