'use client';

import React, { useState, useEffect } from 'react';
import { FolderPlus, X, Upload, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { Category } from '@/lib/types';
import { PRESET_CATEGORY_IMAGES } from '@/lib/presets';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSaved: () => Promise<void>;
}

export default function CategoryModal({
  isOpen,
  onClose,
  category,
  onSaved
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setSlug(category.slug || '');
      setIcon(category.icon || '🏷️');
      setImage(category.image || '');
      setDescription(category.description || '');
      setDisplayOrder(category.display_order || 1);
    } else {
      setName('');
      setSlug('');
      setIcon('🥐');
      setImage('');
      setDescription('');
      setDisplayOrder(10);
    }
    setError('');
  }, [category, isOpen]);

  if (!isOpen) return null;

  // Auto-fill slug from name if new
  const handleNameChange = (val: string) => {
    setName(val);
    if (!category) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Upload file
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
        setError(data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError('Upload failed. Please check network.');
    } finally {
      setUploading(false);
    }
  };

  // Save category
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'category',
          id: category ? category.id : undefined,
          name: name.trim(),
          slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          icon: icon.trim() || '🏷️',
          image: image.trim(),
          description: description.trim(),
          display_order: Number(displayOrder) || 1
        })
      });

      const data = await res.json();
      if (data.ok) {
        await onSaved();
        onClose();
      } else {
        setError(data.error || 'Failed to save category');
      }
    } catch (err: any) {
      setError('Connection failed. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-900">
                {category ? 'Edit Category' : 'Add New Category'}
              </h3>
              <p className="text-[11px] text-stone-500">Categories organize products on the POS register</p>
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

          {/* Name & Emoji Icon */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-stone-700 mb-1">Emoji / Icon</label>
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="🥐"
                className="w-full px-3 py-2 text-center text-lg rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sourdough & Loaves"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Image Selection Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700">Category Cover Photo</label>

            {/* Image Preview */}
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

            {/* Preset Image Gallery */}
            <div>
              <p className="text-[11px] text-stone-500 font-medium mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Or pick from gourmet presets:
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_CATEGORY_IMAGES.slice(0, 5).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImage(preset.url);
                      setIcon(preset.icon);
                    }}
                    className={`relative rounded-lg overflow-hidden border aspect-[4/3] group transition ${
                      image === preset.url ? 'ring-2 ring-amber-600 border-amber-600' : 'border-stone-200'
                    }`}
                  >
                    <img src={preset.url} alt={preset.title} className="w-full h-full object-cover group-hover:scale-110 transition" />
                    <span className="absolute bottom-1 right-1 text-xs">{preset.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief details about what goes in this category..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
            />
          </div>

          {/* Display Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Display Order</label>
              <input
                type="number"
                min="1"
                max="99"
                value={displayOrder}
                onChange={e => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">URL Identifier (Slug)</label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
              />
            </div>
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
              {saving ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

