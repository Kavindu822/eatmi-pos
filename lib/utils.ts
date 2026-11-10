import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert cents (stored in DB) to formatted Rs.
export function formatRupees(cents: number | undefined | null): string {
  const val = Number(cents || 0) / 100;
  return 'Rs. ' + val.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatShortRupees(cents: number | undefined | null): string {
  const val = Math.round(Number(cents || 0) / 100);
  return 'Rs. ' + val.toLocaleString('en-LK');
}

export function centsToRupees(cents: number | undefined | null): number {
  return (Number(cents || 0) / 100);
}

export function rupeesToCents(rupees: number | undefined | null): number {
  return Math.round(Number(rupees || 0) * 100);
}

/**
 * LOYALTY FORMULA:
 * 1 point for every Rs. X spent (customizable by admin, default Rs. 300)!
 * e.g., buy 300 -> 1 pt, buy 600 -> 2 pts, buy 900 -> 3 pts...
 */
export function calculateLoyaltyPoints(totalCents: number, rateRupees: number = 300): number {
  const rate = Math.max(1, rateRupees || 300);
  const rupees = Math.floor(totalCents / 100);
  return Math.floor(rupees / rate);
}

