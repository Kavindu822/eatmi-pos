/**
 * Triggers the physical cash drawer to kick open via ESC/POS pulse on POS-80C.
 * Handles both local POS (http://localhost:8787) and remote Cloud POS (Vercel)
 * by falling back to the local cashier PC loopback daemon.
 */
export async function kickCashDrawer(): Promise<{ ok: boolean; message?: string }> {
  // 1. Try relative URL /api/open-drawer
  try {
    const res = await fetch('/api/open-drawer', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (data.ok) {
      return { ok: true, message: data.message || 'Cash Drawer Kicked Open!' };
    }
  } catch (e) {}

  // 2. If running on Vercel or cloud origin, fallback to local cashier PC daemon
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const localEndpoints = [
      'http://127.0.0.1:8787/api/open-drawer',
      'http://localhost:8787/api/open-drawer'
    ];

    for (const url of localEndpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok) {
          return { ok: true, message: data.message || 'Cash Drawer Kicked Open via Local PC!' };
        }
      } catch (e) {}
    }
  }

  return { ok: false, message: 'Could not connect to physical cash drawer.' };
}
