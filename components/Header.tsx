'use client';

import React, { useEffect, useState } from 'react';
import { Store, ShieldCheck, ChefHat, Volume2, VolumeX, Wifi, WifiOff, RefreshCw, Clock, Cloud, Banknote } from 'lucide-react';
import { kickCashDrawer } from '@/lib/drawer';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  isCloud: boolean;
  lastSync?: string;
}

interface HeaderProps {
  activeTab: 'register' | 'owner' | 'kds';
  setActiveTab: (tab: 'register' | 'owner' | 'kds') => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  onOpenOwnerPortal: () => void;
  isOwnerUnlocked: boolean;
  onLockOwner: () => void;
  syncStatus?: SyncStatus;
  onTriggerSync?: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  audioEnabled,
  setAudioEnabled,
  onOpenOwnerPortal,
  isOwnerUnlocked,
  onLockOwner,
  syncStatus = { isOnline: true, isSyncing: false, pendingCount: 0, isCloud: false },
  onTriggerSync
}: HeaderProps) {
  const [time, setTime] = useState('');
  const [drawerKicking, setDrawerKicking] = useState(false);

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

          {/* Dynamic Sync & Network Status Badge */}
          <div className="flex items-center pl-2 md:pl-3 border-l border-stone-700/60">
            {syncStatus.isCloud ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Turso Cloud 24/7</span>
                <span className="sm:hidden">Cloud</span>
              </div>
            ) : syncStatus.isSyncing ? (
              <button
                onClick={onTriggerSync}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse"
                title="Synchronizing local SQLite with Turso cloud..."
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Syncing...</span>
              </button>
            ) : !syncStatus.isOnline || syncStatus.pendingCount > 0 ? (
              <button
                onClick={onTriggerSync}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700/80 border border-stone-600/70 text-stone-300 text-xs font-medium transition"
                title={syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} offline sales waiting to sync. Click to retry sync.` : 'Working offline. Click to connect.'}
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {syncStatus.pendingCount > 0 ? `Offline (${syncStatus.pendingCount} pending)` : 'Offline Mode'}
                </span>
                <span className="sm:hidden">
                  {syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} pend` : 'Offline'}
                </span>
                <RefreshCw className="w-3 h-3 text-stone-400 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={onTriggerSync}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition group"
                title="Local SQLite & Turso Cloud 100% synchronized. Click to force check."
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Cloud Synced</span>
                <RefreshCw className="w-3 h-3 text-emerald-500/60 group-hover:rotate-180 transition-transform duration-500 ml-0.5" />
              </button>
            )}
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

        {/* Right Tools: Kick Drawer, Time, Sound Chimes, Lock */}
        <div className="flex items-center gap-2.5">
          {/* Quick Cash Drawer Kick Button */}
          <button
            onClick={async () => {
              setDrawerKicking(true);
              await kickCashDrawer();
              setTimeout(() => setDrawerKicking(false), 1500);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              drawerKicking
                ? 'bg-amber-600 text-white border-amber-500 scale-95'
                : 'bg-stone-800 hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 border-amber-500/40 shadow-xs'
            }`}
            title="Kick open physical cash drawer on cashier desk"
          >
            <Banknote className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{drawerKicking ? 'Opened!' : 'Kick Drawer'}</span>
          </button>

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

