// Small helpers shared by the nutrition screens.

import { fmtDate } from './ui.js';
import { ymd, addDays } from './store.js';
import { COLORS } from './charts.js';

export const MEALS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
  { id: 'snacks', name: 'Snacks' },
];
export const mealName = (id) => MEALS.find((m) => m.id === id)?.name || 'Snacks';
export const MACRO_COLOR = { p: COLORS.protein, c: COLORS.carbs, f: COLORS.fat };

/** The meal that fits the time of day. */
export function mealNow() {
  const hr = new Date().getHours() + new Date().getMinutes() / 60;
  return hr < 10.5 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'snacks';
}

export const r0 = (v) => Math.round(v || 0);
export const r1 = (v) => Math.round((v || 0) * 10) / 10;
/** Amounts: whole numbers when big, more decimals when small. */
export const fmtAmt = (v) => (v >= 100 ? r0(v) : v >= 10 ? r1(v) : Math.round(v * 100) / 100).toLocaleString();
/** A number someone typed ("1,5" works too), or null. */
export const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };

/** "2 × 1 cup" or "150 g" for an entry or ingredient. */
export const amountText = (e) => (e.servingLabel === 'g' ? `${fmtAmt(e.qty)} g` : `${fmtAmt(e.qty)} × ${e.servingLabel}`);

export function dayLabel(key) {
  const today = ymd();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = key.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d), { weekday: 'short', month: 'short', day: 'numeric' });
}
