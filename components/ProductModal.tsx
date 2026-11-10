'use client';

import React, { useState, useEffect } from 'react';
import { PackagePlus, X, Upload, Image as ImageIcon, Sparkles, DollarSign, Barcode, Percent } from 'lucide-react';
import { Product, Category } from '@/lib/types';
import { formatRupees, centsToRupees, rupeesToCents } from '@/lib/utils';
import { PRESET_PRODUCT_IMAGES } from '@/lib/presets';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  defaultCategoryId?: string;
  onSaved: () => Promise<void>;
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  categories,
  defaultCategoryId,
  onSaved
}: ProductModalProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceRupees, setPriceRupees] = useState<number>(0);
  const [costRupees, setCostRupees] = useState<number>(0);
  const [stock, setStock] = useState<number>(20);
  const [image, setImage] = useState('');
  const [badge, setBadge] = useState('');
  const [dietary, setDietary] = useState('Vegetarian');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategoryId(product.category_id || categories[0]?.id || '');
      setPriceRupees(centsToRupees(product.price));
      setCostRupees(product.cost ? centsToRupees(product.cost) : 0);
      setStock(product.stock ?? 0);
      setImage(product.image || '');
      setBadge(product.badge || '');
      setDietary(product.dietary || '');
      setDescription(product.description || '');
    } else {
      setName('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategoryId(defaultCategoryId || categories[0]?.id || '');
      setPriceRupees(450);
      setCostRupees(220);
      setStock(24);
      setImage('');
      setBadge('');
      setDietary('Vegetarian');
      setDescription('');
    }
    setError('');
  }, [product, defaultCategoryId, categories, isOpen]);

  if (!isOpen) return null;

  // Profit margin calculation preview
  const profit = Math.max(0, priceRupees - costRupees);
  const marginPct = priceRupees > 0 ? Math.round((profit / priceRupees) * 100) : 0;

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.ok && data.url) {
        setImage(data.url);
      } else {
        setError(data.error || 'Failed to upload photo');
      }
    } catch (err: any) {
      setError('Upload failed. Please check network.');
    } finally {
      setUploading(false);
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!categoryId) {
      setError('Category is mandatory. Every item must be assigned to a category.');
      return;
    }
    if (priceRupees <= 0) {
      setError('Price must be greater than Rs. 0');
      return;
    }

    setSaving(true);
    setError('');

    const targetCat = categories.find(c => c.id === categoryId);
    const categoryName = targetCat ? targetCat.name : (product?.category || 'General');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'product',
          id: product ? product.id : undefined,
          name: name.trim(),
          sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
          category_id: categoryId,
          category: categoryName,
          price: rupeesToCents(priceRupees),
          cost: rupeesToCents(costRupees),
          stock: Math.max(0, Math.floor(stock)),
          image: image.trim(),
          badge: badge.trim(),
          dietary: dietary.trim(),
          description: description.trim(),
          is_active: 1
        })
      });

      const data = await res.json();
      if (data.ok) {
        await onSaved();
        onClose();
      } else {
        setError(data.error || 'Failed to save product');
      }
    } catch (err: any) {
      setError('Connection failed. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-900">
                {product ? 'Edit Menu Item' : 'Add Item to Category'}
              </h3>
              <p className="text-[11px] text-stone-500">Configure photo, pricing, and bakery stock</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Name & SKU */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Normandy Almond Croissant"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-stone-700 mb-1">SKU / Barcode</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Assigned Category *</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium bg-white"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon || '🏷️'} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing & Stock Details */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Selling Price (Rs.) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rs.</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={priceRupees || ''}
                  onChange={e => setPriceRupees(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Unit Cost (Rs.)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={costRupees || ''}
                  onChange={e => setCostRupees(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Available Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Profit Margin Indicator */}
            <div className="col-span-3 pt-1 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500">
              <span>Owner Profit Margin:</span>
              <span className="font-semibold text-emerald-700">
                +Rs. {profit.toLocaleString()} profit per item ({marginPct}% margin)
              </span>
            </div>
          </div>

          {/* Photo Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700">Product Photo</label>

            {/* Preview */}
            {image && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200 group bg-stone-100">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white hover:bg-black text-xs transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* URL Input & File Upload */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="url"
                  placeholder="Paste image URL (https://...)"
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold border border-stone-300 transition">
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preset Food Photos Gallery */}
            <div>
              <p className="text-[11px] text-stone-500 font-medium mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Or pick from preset photos:
              </p>
              <div className="grid grid-cols-6 gap-1.5 max-h-24 overflow-y-auto p-1 bg-stone-50 rounded-xl border border-stone-200">
                {PRESET_PRODUCT_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`relative rounded-lg overflow-hidden border aspect-[4/3] group transition ${
                      image === preset.url ? 'ring-2 ring-amber-600 border-amber-600' : 'border-stone-200'
                    }`}
                    title={preset.title}
                  >
                    <img src={preset.url} alt={preset.title} className="w-full h-full object-cover group-hover:scale-110 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Badges & Dietary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Highlight Badge</label>
              <input
                type="text"
                placeholder="e.g. 🔥 Oven Fresh, Bestseller, Signature"
                value={badge}
                onChange={e => setBadge(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Dietary Tag</label>
              <input
                type="text"
                placeholder="e.g. Vegetarian, Gluten-Free, Halal"
                value={dietary}
                onChange={e => setDietary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Flavor Notes & Description</label>
            <textarea
              rows={2}
              placeholder="Flaky 27-layer butter croissant with Normandy butter..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
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
              {saving ? 'Saving...' : product ? 'Update Item' : 'Add Item to Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

