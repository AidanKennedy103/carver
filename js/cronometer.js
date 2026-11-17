// Import your food history from Cronometer.
//
// Cronometer has no way for other apps to read your data, but it can export it:
// on cronometer.com, More → Account → Export Data → "Food & Recipe Entries"
// (servings.csv). Each row becomes a diary entry with its nutrients. The
// "Daily Nutrition" export (dailysummary.csv) also works: one entry per day.

import { state, commit } from './store.js';

/** A small CSV reader that handles quoted fields. */
export function parseCSV(text, sep = ',') {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

// Cronometer column names → Carver nutrient keys (and a multiplier for unit changes)
const COLS = [
  [/^energy \(kcal\)/i, 'kcal'], [/^protein \(g\)/i, 'p'], [/^carbs \(g\)/i, 'c'], [/^net carbs \(g\)/i, 'c'], [/^fat \(g\)/i, 'f'],
  [/^fiber \(g\)/i, 'fib'], [/^sugars \(g\)/i, 'sug'], [/^saturated \(g\)/i, 'sat'], [/^cholesterol \(mg\)/i, 'chol'],
  [/^sodium \(mg\)/i, 'na'], [/^potassium \(mg\)/i, 'k'], [/^calcium \(mg\)/i, 'ca'], [/^iron \(mg\)/i, 'fe'],
  [/^magnesium \(mg\)/i, 'mg'], [/^zinc \(mg\)/i, 'zn'], [/^vitamin a \(µg\)|^vitamin a \(ug\)/i, 'va'], [/^vitamin c \(mg\)/i, 'vc'],
  [/^vitamin d \(iu\)/i, 'vd', 1 / 40], [/^vitamin d \(µg\)|^vitamin d \(ug\)/i, 'vd'], [/^b12 \(cobalamin\) \(µg\)|^b12|^vitamin b12/i, 'b12'],
  [/^folate \(µg\)|^folate/i, 'fol'],
];
export const MEAL_OF = (g) => {
  const t = (g || '').toLowerCase();
  if (t.startsWith('break')) return 'breakfast';
  if (t.startsWith('lunch')) return 'lunch';
  if (t.startsWith('dinner') || t.startsWith('supper')) return 'dinner';
  return 'snacks';
};
export const hash = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); };

/** Turn a Cronometer export into diary entries. Returns { entries, kind } or throws. */
export function readCronometer(text) {
  const rows = parseCSV(text.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('That file is empty.');
  const head = rows[0].map((c) => c.trim());
  const col = (re) => head.findIndex((x) => re.test(x));
  const iDay = col(/^(day|date)$/i), iName = col(/^food name$/i), iGroup = col(/^group$/i), iAmt = col(/^amount$/i), iTime = col(/^time$/i);
  if (iDay < 0 || col(/^energy \(kcal\)/i) < 0) throw new Error('That isn’t a Cronometer export. Use “Food & Recipe Entries” or “Daily Nutrition”.');
  const nut = [];
  COLS.forEach(([re, key, mult = 1]) => { const i = col(re); if (i >= 0 && !nut.some((n) => n.key === key)) nut.push({ i, key, mult }); });
  const entries = [], seen = new Map();
  for (const r of rows.slice(1)) {
    const day = (r[iDay] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const n = {};
    for (const { i, key, mult } of nut) { const v = parseFloat(r[i]); if (!isNaN(v)) n[key] = v * mult; }
    if (!n.kcal) continue;
    const name = iName >= 0 ? (r[iName] || 'Food').trim() : 'Cronometer day total';
    const amount = iAmt >= 0 ? (r[iAmt] || '').trim() : '';
    const key = [day, iTime >= 0 ? r[iTime] : '', name, amount, n.kcal].join('|');
    const nth = (seen.get(key) || 0) + 1;   // the same food twice in one day gets two entries
    seen.set(key, nth);
    entries.push({
      id: 'cr-' + hash(key + '#' + nth),
      date: day, meal: iName >= 0 ? MEAL_OF(iGroup >= 0 ? r[iGroup] : '') : 'snacks',
      name: name.length > 60 ? name.slice(0, 57) + '…' : name, icon: '📥', quick: true, imported: 'cronometer', note: amount, n,
      ts: new Date(day + 'T12:00:00').getTime(),
    });
  }
  return { entries, kind: iName >= 0 ? 'foods' : 'days' };
}

/** Add them to the diary, skipping any already imported. Returns how many were added. */
export function importCronometer(text) {
  const { entries } = readCronometer(text);
  const have = new Set(state.food.log.map((e) => e.id));
  const fresh = entries.filter((e) => !have.has(e.id));
  if (fresh.length) commit((s) => { s.food.log.push(...fresh); s.food.log.sort((a, b) => (a.ts || 0) - (b.ts || 0)); });
  const days = new Set(fresh.map((e) => e.date)).size;
  return { added: fresh.length, days, total: entries.length };
}
