import { Sale } from './types';

export interface PrintDirectOptions {
  sale: Sale;
  slipType: 'customer' | 'kitchen';
  settings?: Record<string, string>;
  customerPointsBalance?: number;
}

/**
 * Sends ESC/POS print command directly to POS-80C physical printer via local print daemon.
 * Bypasses Chrome print dialog entirely (zero popups / zero tabs).
 */
export async function printDirectThermal(options: PrintDirectOptions): Promise<{ ok: boolean; message?: string }> {
  // 1. Try relative endpoint /api/print-thermal (when running on localhost)
  try {
    const res = await fetch('/api/print-thermal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) {
      return { ok: true, message: data.message || 'Printed directly to thermal printer!' };
    }
  } catch (e) {}

  // 2. If running on Vercel or cloud origin, fallback to local cashier PC daemon on 8787
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const localEndpoints = [
      'http://127.0.0.1:8787/api/print-thermal',
      'http://localhost:8787/api/print-thermal'
    ];

    for (const url of localEndpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          body: JSON.stringify(options)
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok) {
          return { ok: true, message: data.message || 'Printed via local cashier PC!' };
        }
      } catch (e) {}
    }
  }

  return { ok: false, message: 'Could not connect to physical receipt printer.' };
}
