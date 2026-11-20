// Body weight: log it, import it (Apple Health via a Shortcut, or a Bluetooth
// scale), and read the trend.

import { h, fill, icon, sheet, toast, actionSheet, confirmBox, fmtDate } from './ui.js';
import { state, commit, uid, bodyDisplay as toDisplay, bodyFromDisplay as fromDisplay, bodyUnit as unit, LB_PER_KG } from './store.js';
import { importHealth } from './health.js';

export const weights = () => state.body.weights;   // oldest first

export function addWeight(kg, ts = Date.now(), source = 'manual') {
  commit((s) => {
    // Same reading within 2 hours = the same weigh-in (e.g. imported twice)
    const dup = s.body.weights.find((w) => Math.abs(w.ts - ts) < 2 * 36e5 && Math.abs(w.kg - kg) < 0.05);
    if (dup) return;
    s.body.weights.push({ id: uid(), ts, kg, source });
    s.body.weights.sort((a, b) => a.ts - b.ts);
  });
}
export function deleteWeight(id) {
  commit((s) => { s.body.weights = s.body.weights.filter((w) => w.id !== id); });
}
export const latestWeight = () => weights()[weights().length - 1] || null;

/** Smoothed weight: each point averaged with the 7 days before it, so daily water swings don't hide the trend. */
export function trend(list = weights()) {
  // Sliding window over the sorted list: one pass, however long your history
  const out = [];
  let lo = 0, sum = 0;
  for (let i = 0; i < list.length; i++) {
    sum += list[i].kg;
    while (list[lo].ts <= list[i].ts - 7 * 864e5) sum -= list[lo++].kg;
    out.push({ x: list[i].ts, y: sum / (i - lo + 1), raw: list[i].kg, id: list[i].id });
  }
  return out;
}

/** Weight change (kg) over the last `days`, using the smoothed trend. */
export function change(days) {
  const t = trend();
  if (t.length < 2) return null;
  const end = t[t.length - 1];
  const startPt = t.find((p) => p.x >= end.x - days * 864e5);
  if (!startPt || startPt === end) return null;
  return end.y - startPt.y;
}

// ---------- Log weight ----------

export function logWeightSheet() {
  const last = latestWeight();
  const input = h('input.qty-input.wide', { inputmode: 'decimal', placeholder: last ? toDisplay(last.kg) : '0', 'aria-label': `Weight in ${unit()}` });
  const save = () => {
    const kg = fromDisplay(input.value.replace(',', '.'));
    if (!kg || kg < 20 || kg > 400) { toast('Enter your weight'); return; }
    addWeight(kg);
    s.close();
    toast(`Logged ${toDisplay(kg)} ${unit()}`);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Log weight'), h('button.link.strong', { onclick: save }, 'Save')),
    h('div.kcal-wrap', input, h('span.kcal-unit', unit())),
    last ? h('p.fine.center', `Last: ${toDisplay(last.kg)} ${unit()} · ${fmtDate(last.ts, { month: 'short', day: 'numeric' })}`) : null,
    h('button.btn.dark.wide', { onclick: () => { s.close(); importSheet(); } }, 'Import from Apple Health or a scale'),
  ));
  setTimeout(() => input.focus(), 350);
}

// ---------- Import: Apple Health (paste) and Bluetooth scales ----------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** Finds a date in text: ISO, "2026/11/14", "Nov 14, 2026 at 7:30 AM" or "11/14/2026 7:30". Returns { ts, match }. */
export function findDate(text) {
  let m = text.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::\d{2})?(?:[.,]\d+)?(Z|[+-]\d{2}:?\d{2})?)?/);
  if (m) {
    const t = m[6] ? Date.parse(m[0].replace(' ', 'T')) : new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime();
    if (!isNaN(t)) return { ts: t, match: m[0] };
  }
  m = text.match(/([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})(?:,? (?:at )?(\d{1,2}):(\d{2})(?::\d{2})? ?([AaPp]\.?[Mm]\.?)?)?/);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) {
    let hr = +(m[4] || 12);
    if (m[6]) { const pm = /p/i.test(m[6]); if (pm && hr < 12) hr += 12; if (!pm && hr === 12) hr = 0; }
    return { ts: new Date(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2], hr, +(m[5] || 0)).getTime(), match: m[0] };
  }
  m = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:,? (\d{1,2}):(\d{2}))?/) || null;
  if (m) return { ts: new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime(), match: m[0] };
  m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,? (\d{1,2}):(\d{2}) ?([AaPp][Mm])?)?/);
  if (m) {
    let hr = +(m[4] || 12);
    if (m[6]) { const pm = /p/i.test(m[6]); if (pm && hr < 12) hr += 12; if (!pm && hr === 12) hr = 0; }
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return { ts: new Date(y, m[1] - 1, +m[2], hr, +(m[5] || 0)).getTime(), match: m[0] };
  }
  return null;
}


/**
 * Pull weigh-ins out of pasted text. Each line can be "date value" or just a value
 * (which means now). Handles "2026-11-14 182.4", "Nov 14, 2026 at 7:02 AM, 182.4 lb", "82.7 kg".
 */
export function parseWeights(text, defaultUnit = unit()) {
  const out = [];
  for (const raw of text.split(/[\n;]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const u = /\bkg\b/i.test(line) ? 'kg' : /\blbs?\b/i.test(line) ? 'lb' : defaultUnit;
    // Take the date part off before reading the weight
    let ts = Date.now(), rest = line;
    const d = findDate(line);
    if (d) { ts = d.ts; rest = line.replace(d.match, ' '); }
    const nums = [...rest.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => parseFloat(m[0].replace(',', '.')));
    const v = nums.find((n) => (u === 'kg' ? n >= 25 && n <= 300 : n >= 55 && n <= 660));
    if (v == null) continue;
    out.push({ ts, kg: u === 'lb' ? v / LB_PER_KG : v });
  }
  return out;
}

export function importSheet() {
  const box = h('textarea.field.paste-box', { rows: 4, placeholder: 'Paste weights here, e.g.\n2026-11-14 182.4\n2026-11-13 183.0' });
  const bt = 'bluetooth' in navigator;
  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Scale & Health'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),

    h('label.form-label', 'Apple Health'),
    h('button.btn.gold.wide', { onclick: () => { s.close(); import('./healthsync.js').then((m) => m.openHealthSync()); } }, 'Set up automatic sync'),
    h('button.btn.dark.wide', { onclick: () => { s.close(); importHealth(); } }, 'Import a Health export'),
    h('p.fine', 'Health app → your picture → Export All Health Data, save it to Files, then pick it here. Brings in every weigh-in and body-fat reading (Withings, Renpho, Eufy and other smart scales sync to Health), plus steps, sleep and heart data.'),

    h('label.form-label', 'Bluetooth scale'),
    bt
      ? h('button.btn.dark.wide', { onclick: () => { s.close(); connectScale(); } }, icon('scale', 18), 'Connect a scale')
      : h('p.fine', 'Safari on iPhone can’t use Bluetooth in web apps. Scales that use the standard Bluetooth weight or body-composition service (including the Carver scale) connect in Chrome on Android or a computer, or the free Bluefy browser on iPhone. Otherwise, let your scale’s app sync to Apple Health and import above.'),

    h('label.form-label', 'Quick paste'),
    h('p.fine', 'Or copy recent weights with a Shortcut and paste them.'),
    h('button.btn.dark.wide', {
      onclick: async () => {
        try { const t = await navigator.clipboard.readText(); box.value = t; doImport(t); }
        catch { toast('Tap the box and paste instead'); box.focus(); }
      },
    }, 'Paste from Health'),
    box,
    h('button.btn.dark.wide', { onclick: () => doImport(box.value) }, 'Import pasted text'),
    h('details.howto',
      h('summary', 'Set up the Shortcut (2 minutes, once)'),
      h('ol',
        h('li', 'Open the Shortcuts app → + → name it “Carver weight”.'),
        h('li', 'Add Find Health Samples: Type is Weight, sort by Start Date, Latest First, limit 30.'),
        h('li', 'Add Repeat with Each. Inside it add Text with: Repeat Item’s Start Date (format ISO 8601), a space, then Repeat Item’s Value.'),
        h('li', 'After the repeat, add Combine Text (new lines), then Copy to Clipboard.'),
        h('li', 'Run it, open Carver, tap Paste from Health. Add it to your Home Screen or run it after weighing in.'),
      ),
      h('p.fine', 'Weights already in Carver are skipped, so pasting the same list twice is fine.')),
  ), { full: false });

  function doImport(text) {
    const list = parseWeights(text || '');
    if (!list.length) { toast('No weights found in that text'); return; }
    const before = weights().length;
    list.forEach((w) => addWeight(w.kg, w.ts, 'health'));
    const added = weights().length - before;
    toast(added ? `Imported ${added} weigh-in${added > 1 ? 's' : ''}` : 'Those are already in Carver');
    if (added) s.close();
  }
}

/**
 * Standard Bluetooth Weight Scale service (0x181D). Many scales use their own
 * private protocol instead; those need their app + Apple Health.
 */
/**
 * Body Composition Measurement (0x2A9C): body fat %, then optional fields by flag.
 * Returns { fat, muscle (kg), water (%), weight (kg), lean (kg) }.
 */
export function parseBodyComp(d) {
  const flags = d.getUint16(0, true), imperial = flags & 1;
  const mass = (raw) => (imperial ? (raw * 0.01) / LB_PER_KG : raw * 0.005);
  const out = { fat: d.getUint16(2, true) / 10 };
  let p = 4;
  if (flags & 0x2) p += 7;   // time stamp
  if (flags & 0x4) p += 1;   // user id
  if (flags & 0x8) p += 2;   // basal metabolism
  if (flags & 0x10) p += 2;  // muscle %
  if (flags & 0x20) { out.muscle = mass(d.getUint16(p, true)); p += 2; }
  if (flags & 0x40) { out.lean = mass(d.getUint16(p, true)); p += 2; }
  if (flags & 0x80) p += 2;  // soft lean mass
  if (flags & 0x100) { out.waterKg = mass(d.getUint16(p, true)); p += 2; }
  if (flags & 0x200) p += 2; // impedance
  if (flags & 0x400) { out.weight = mass(d.getUint16(p, true)); p += 2; }
  if (out.waterKg && out.weight) out.water = Math.round((out.waterKg / out.weight) * 1000) / 10;
  return out;
}
/** Weight Measurement (0x2A9D): kg. */
export function parseWeight(d) {
  const raw = d.getUint16(1, true);
  return d.getUint8(0) & 1 ? (raw * 0.01) / LB_PER_KG : raw * 0.005;
}

/** Any scale with the standard Bluetooth weight (0x181D) or body composition (0x181B) service. */
export async function connectScale() {
  let dev;
  try {
    dev = await navigator.bluetooth.requestDevice({ filters: [{ services: [0x181d] }, { services: [0x181b] }, { namePrefix: 'Carver' }], optionalServices: [0x181d, 0x181b] });
  } catch (e) { if (e.name !== 'NotFoundError') toast('Bluetooth was cancelled or isn’t available'); return; }
  const status = h('div.scale-status', 'Connecting…');
  const val = h('div.energy-v', '—');
  const extra = h('div.scale-extra');
  let reading = null, compRead = null, timer;
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', dev.name || 'Scale'), h('span')),
    h('div.scale-box', val, h('div.energy-k', unit()), extra, status),
  ), { onClose: () => { clearTimeout(timer); timer = 0; try { dev.gatt.disconnect(); } catch { /* fine */ } } });
  // A reading that stays put for 2.5 seconds is the final one
  const settle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (reading) addWeight(reading, Date.now(), 'scale');
      if (compRead?.fat) commit((st) => { st.body.comp = [...(st.body.comp || []), { id: uid(), ts: Date.now(), source: 'scale', fat: compRead.fat, ...(compRead.muscle ? { muscle: compRead.muscle } : {}), ...(compRead.water ? { water: compRead.water } : {}) }]; });
      status.textContent = 'Saved';
      toast(`Logged ${reading ? `${toDisplay(reading)} ${unit()}` : ''}${compRead?.fat ? `${reading ? ', ' : ''}${compRead.fat}% body fat` : ''} from your scale`);
      setTimeout(() => s.close(), 900);
    }, 2500);
  };
  try {
    const server = await dev.gatt.connect();
    let any = false;
    try {
      const ch = await (await server.getPrimaryService(0x181d)).getCharacteristic(0x2a9d);
      await ch.startNotifications(); any = true;
      ch.addEventListener('characteristicvaluechanged', (e) => {
        const kg = parseWeight(e.target.value);
        if (!kg) return;
        reading = kg; val.textContent = toDisplay(kg); status.textContent = 'Hold still…'; settle();
      });
    } catch { /* no weight service */ }
    try {
      const ch = await (await server.getPrimaryService(0x181b)).getCharacteristic(0x2a9c);
      await ch.startNotifications(); any = true;
      ch.addEventListener('characteristicvaluechanged', (e) => {
        compRead = parseBodyComp(e.target.value);
        if (compRead.weight && !reading) { reading = compRead.weight; val.textContent = toDisplay(reading); }
        fill(extra, [`${compRead.fat}% fat`, compRead.muscle ? `${toDisplay(compRead.muscle)} ${unit()} muscle` : null, compRead.water ? `${compRead.water}% water` : null].filter(Boolean).join(' · '));
        settle();
      });
    } catch { /* no body composition service */ }
    if (!any) throw new Error('none');
    status.textContent = 'Step on the scale';
  } catch {
    status.textContent = 'This scale doesn’t use the standard Bluetooth services. Use its app with Apple Health instead.';
  }
}

// ---------- History list ----------

export function weightRow(w) {
  return h('button.food-line', {
    onclick: () => actionSheet(`${toDisplay(w.kg)} ${unit()} · ${fmtDate(w.ts, { month: 'short', day: 'numeric', year: 'numeric' })}`, [
      { label: 'Delete weigh-in', danger: true, onClick: async () => { if (await confirmBox('Delete this weigh-in?', null, { ok: 'Delete', danger: true })) deleteWeight(w.id); } },
    ]),
  },
  h('span.food-text', h('span.food-name', `${toDisplay(w.kg)} ${unit()}`), h('span.food-sub', `${fmtDate(w.ts, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(w.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`)),
  h('span.food-sub', w.source === 'health' ? 'Health' : w.source === 'scale' ? 'Scale' : ''));
}
