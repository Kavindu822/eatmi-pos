'use client';

import React, { useState } from 'react';
import { Lock, Delete, X, ShieldAlert, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface OwnerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OwnerPinModal({ isOpen, onClose, onSuccess }: OwnerPinModalProps) {
  const [mode, setMode] = useState<'enter_pin' | 'recover_pin'>('enter_pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery state
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmitPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Please enter your owner PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', pin })
      });
      const data = await res.json();

      if (data.ok) {
        setPin('');
        onSuccess();
      } else {
        setError(data.error || 'Invalid PIN code. Default is 1234.');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryInput.trim()) {
      setError('Please enter your Master Recovery Key or registered phone number.');
      return;
    }
    if (!newPin.trim() || newPin.trim().length < 4) {
      setError('New PIN must be at least 4 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setRecoverySuccess('');

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover_pin',
          recovery_input: recoveryInput.trim(),
          new_pin: newPin.trim()
        })
      });
      const data = await res.json();

      if (data.ok) {
        setRecoverySuccess('PIN successfully reset! Unlocking portal...');
        setTimeout(() => {
          setMode('enter_pin');
          setRecoveryInput('');
          setNewPin('');
          setRecoverySuccess('');
          onSuccess();
        }, 1200);
      } else {
        setError(data.error || 'Invalid recovery key. Default key is EATMI-8899.');
      }
    } catch (err: any) {
      setError('Network error during recovery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              {mode === 'enter_pin' ? <Lock className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-100">
                {mode === 'enter_pin' ? 'Owner Access Required' : 'Emergency PIN Recovery'}
              </h3>
              <p className="text-[11px] text-stone-400">Remote Supervision & Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODE 1: ENTER PIN KEYPAD */}
        {mode === 'enter_pin' ? (
          <div className="p-6 text-center">
            <p className="text-xs text-stone-400 mb-4">
              Enter the Owner PIN to access shop financials, live sales, category & product management.
            </p>

            {/* Dots Indicator */}
            <div className="flex justify-center items-center gap-3 mb-4 h-8">
              {[0, 1, 2, 3].map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    pin.length > idx
                      ? 'bg-amber-500 scale-110 shadow-sm shadow-amber-500/50'
                      : 'bg-stone-800 border border-stone-700'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-900/50 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-12 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-lg font-mono font-semibold text-stone-100 transition border border-stone-700/60 shadow-sm"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-12 rounded-xl bg-stone-800/40 hover:bg-stone-700 text-xs text-stone-400 hover:text-stone-200 transition border border-stone-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-12 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-lg font-mono font-semibold text-stone-100 transition border border-stone-700/60 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-xl bg-stone-800/40 hover:bg-stone-700 active:scale-95 flex items-center justify-center text-stone-400 hover:text-stone-200 transition border border-stone-800"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={() => handleSubmitPin()}
              disabled={loading || pin.length < 4}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-amber-900/30 transition"
            >
              {loading ? 'Verifying...' : 'Unlock Owner Portal'}
            </button>

            {/* Forgot PIN Recovery Link */}
            <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
              <span className="text-stone-500">Default PIN: <b className="text-amber-400">1234</b></span>
              <button
                type="button"
                onClick={() => {
                  setMode('recover_pin');
                  setError('');
                }}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Forgot PIN?</span>
              </button>
            </div>
          </div>
        ) : (
          /* MODE 2: RECOVER PIN FORM */
          <form onSubmit={handleRecoverySubmit} className="p-6 space-y-4">
            <p className="text-xs text-stone-300">
              Forgot your PIN? Enter your <b>Master Emergency Key</b> or registered owner phone number to create a new PIN.
            </p>

            {error && (
              <div className="text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-900/50 py-1.5 px-3 rounded-lg flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {recoverySuccess && (
              <div className="text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 py-1.5 px-3 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Master Recovery Key or Phone
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EATMI-8899 or 077..."
                value={recoveryInput}
                onChange={e => setRecoveryInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Default master emergency key is <span className="font-mono font-bold text-amber-400">EATMI-8899</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Enter New 4-Digit PIN
              </label>
              <input
                type="password"
                required
                maxLength={6}
                placeholder="e.g. 1234"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-amber-900/30 transition flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{loading ? 'Resetting...' : 'Reset PIN & Unlock'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('enter_pin');
                  setError('');
                }}
                className="w-full py-2 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 text-xs flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to PIN Keypad</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
