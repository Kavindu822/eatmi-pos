'use client';

import React, { useEffect, useState } from 'react';
import { Store, ShieldCheck, ChefHat, Volume2, VolumeX, Wifi, Clock, UserCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'register' | 'owner' | 'kds';
  setActiveTab: (tab: 'register' | 'owner' | 'kds') => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  onOpenOwnerPortal: () => void;
  isOwnerUnlocked: boolean;
  onLockOwner: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  audioEnabled,
  setAudioEnabled,
  onOpenOwnerPortal,
  isOwnerUnlocked,
  onLockOwner
}: HeaderProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 text-stone-100 shadow-md">
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Remote Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="EATmi Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-amber-900/30 ring-2 ring-amber-400/40 flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg tracking-wide text-amber-200">EATmi</h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Cloud POS
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Artisan Food & Bakery · Sri Lanka</p>
            </div>
          </div>

          {/* Online Live Badge */}
          <div className="hidden sm:flex items-center gap-2 pl-3 ml-2 border-l border-stone-700/60">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" /> Full Online
            </span>
          </div>
        </div>

        {/* Navigation Mode Switcher: Register (Worker) | Owner Portal | Kitchen KDS */}
        <nav className="flex items-center gap-1.5 bg-stone-800/80 p-1 rounded-xl border border-stone-700">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'register'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Cashier Register</span>
          </button>

          <button
            onClick={() => setActiveTab('kds')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'kds'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen KDS</span>
          </button>

          <button
            onClick={onOpenOwnerPortal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              activeTab === 'owner'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
            title="Supervise shop, revenue, categories, items, and loyalty from anywhere"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="flex items-center gap-1">
              Owner Portal
              {isOwnerUnlocked && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Unlocked" />
              )}
            </span>
          </button>
        </nav>

        {/* Right Tools: Time, Sound Chimes, Lock */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-stone-300 bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-700/50">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{time || '--:--:--'}</span>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition border border-stone-700"
            title={audioEnabled ? 'Mute sound effects' : 'Enable register sound chimes'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          {isOwnerUnlocked && activeTab === 'owner' && (
            <button
              onClick={onLockOwner}
              className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-1 rounded-lg border border-stone-700 transition"
              title="Lock Owner Portal"
            >
              Lock PIN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

