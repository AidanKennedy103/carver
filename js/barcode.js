// Barcode scanner: camera → barcode → Open Food Facts (free, open database).
// Uses the browser's own BarcodeDetector where it exists, otherwise the ZXing
// library (loaded only when you first scan). Scanned foods are saved to My foods
// so they work offline and instantly next time.

import { h, sheet, toast, icon } from './ui.js';
import { beep } from './sound.js';
import { state, commit } from './store.js';
import { createFood } from './foodpicker.js';
import { sharedByBarcode, shareFood } from './cloud.js';

const ZXING = 'https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js';
let zxingLoad;
const loadZXing = () => zxingLoad || (zxingLoad = new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = ZXING; s.onload = () => res(window.ZXing); s.onerror = () => { zxingLoad = null; rej(new Error('Could not load the scanner')); };
  document.head.append(s);
}));

/** A real EAN/UPC: right length and the check digit adds up (throws out misreads). */
export function validCode(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const d = code.split('').map(Number), check = d.pop();
  const sum = d.reverse().reduce((n, x, i) => n + x * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
/** The same product written other ways (UPC-A ↔ EAN-13), to try when the first isn't found. */
export const codeVariants = (code) => [...new Set([code, code.length === 12 ? '0' + code : null, code.length === 13 && code[0] === '0' ? code.slice(1) : null].filter(Boolean))];

/** Opens the scanner. onFood(food) gets a food ready to log. */
export function scanBarcode(onFood) {
  let stopped = false, stream = null, track = null, timer = 0, busy = false, torch = false;
  const video = h('video', { playsinline: true, muted: true, autoplay: true });
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  const frame = h('div.scan-frame', h('i.scan-line'));
  const status = h('div.scan-status', 'Starting camera…');
  const torchBtn = h('button.scan-torch', { hidden: true, 'aria-label': 'Torch', onclick: toggleTorch }, icon('bolt', 18));
  const manual = h('input.field', { placeholder: 'Or type the barcode number', inputmode: 'numeric', enterkeyhint: 'search' });
  manual.addEventListener('keydown', (e) => { if (e.key === 'Enter' && manual.value.trim()) found(manual.value.trim().replace(/\D/g, '')); });

  const s = sheet(h('div.form.scan',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Scan barcode'), h('span')),
    h('div.scan-view', video, frame, torchBtn, status),
    h('p.fine.center.scan-tip', 'Fill the gold box with the barcode, about a hand’s length away.'),
    h('div.name-row', manual, h('button.btn.gold.small', { onclick: () => manual.value.trim() && found(manual.value.trim().replace(/\D/g, '')) }, 'Look up')),
    h('p.fine', 'Food data from Open Food Facts, a free database anyone can add to. Check the numbers against the label.'),
  ), { onClose: stop });

  function stop() {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
  }

  async function toggleTorch() {
    torch = !torch;
    try { await track.applyConstraints({ advanced: [{ torch }] }); torchBtn.classList.toggle('on', torch); } catch { torchBtn.hidden = true; }
  }

  /** Sharp, close-up friendly camera: high resolution, continuous focus, a little zoom where the phone allows it. */
  async function openCamera() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities?.() || {};
    const adv = {};
    if (caps.focusMode?.includes('continuous')) adv.focusMode = 'continuous';
    if (caps.zoom) adv.zoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.6));   // newer iPhones can't focus up close without it
    if (Object.keys(adv).length) { try { await track.applyConstraints({ advanced: [adv] }); } catch { /* fine */ } }
    if (caps.torch) torchBtn.hidden = false;
    video.srcObject = stream;
    await video.play();
  }

  // Only the part inside the gold box is read: faster, and the rest of the packet can't confuse it
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  function grab() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return false;
    const view = video.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    const scale = Math.max(view.width / vw, view.height / vh);   // object-fit: cover
    const ox = (vw * scale - view.width) / 2, oy = (vh * scale - view.height) / 2;
    const pad = 0.08;   // a little margin around the box
    let sx = (fr.left - view.left + ox) / scale, sy = (fr.top - view.top + oy) / scale, sw = fr.width / scale, sh = fr.height / scale;
    sx -= sw * pad; sw *= 1 + 2 * pad; sy -= sh * pad; sh *= 1 + 2 * pad;
    sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(vw - sx, sw); sh = Math.min(vh - sy, sh);
    const out = Math.min(1000, sw);
    canvas.width = Math.round(out); canvas.height = Math.round(out * (sh / sw));
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return true;
  }

  let last = null;
  function hit(code) {
    code = String(code).replace(/\D/g, '');
    if (!validCode(code)) return;
    if (last === code) { found(code); return; }   // the same number twice in a row: sure
    last = code;
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'No camera here. Type the barcode instead.'; return; }
    try {
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
      let detect;
      if ('BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats?.() || formats).some((f) => formats.includes(f))) {
        const det = new window.BarcodeDetector({ formats });
        detect = async () => { const codes = await det.detect(canvas); return codes[0]?.rawValue || null; };
      } else {
        const ZX = await loadZXing();
        const hints = new Map([[ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E]], [ZX.DecodeHintType.TRY_HARDER, true]]);
        const reader = new ZX.MultiFormatReader();
        reader.setHints(hints);
        detect = async () => {
          // Two ways of turning the picture into black and white: the second catches glare and low light
          for (const Bin of [ZX.HybridBinarizer, ZX.GlobalHistogramBinarizer]) {
            try { return reader.decode(new ZX.BinaryBitmap(new Bin(new ZX.HTMLCanvasElementLuminanceSource(canvas)))).getText(); } catch { /* next */ } finally { reader.reset(); }
          }
          return null;
        };
      }
      if (stopped) return;
      await openCamera();
      if (stopped) return stop();
      status.textContent = 'Point at a barcode';
      frame.classList.add('live');
      const loop = async () => {
        if (stopped || busy) return;
        try { if (grab()) { const c = await detect(); if (c) hit(c); } } catch { /* keep trying */ }
        timer = setTimeout(loop, 90);
      };
      loop();
    } catch (e) {
      status.textContent = e.name === 'NotAllowedError'
        ? 'Camera access is off. Allow it in Settings → Safari → Camera, or type the barcode.'
        : 'Could not start the camera. Type the barcode instead.';
    }
  }

  async function found(code) {
    if (busy || !code) return;
    busy = true;
    frame.classList.add('got');
    navigator.vibrate?.(60);
    beep();
    status.textContent = `Looking up ${code}…`;
    stop();
    try {
      const f = await lookup(code);
      s.close();
      if (f) onFood(f);
      else {
        toast('Not in the database yet. Add it yourself.');
        createFood((fd) => onFood(fd), { icon: '🏷️', barcode: code });
      }
    } catch {
      busy = false;
      status.textContent = 'No connection. Try again, or use Quick add.';
    }
  }

  start();
}

/**
 * Search Open Food Facts by name. Products sold in Canada come first, then the
 * rest of the world. Returns foods ready to log (not saved until you pick one).
 */
export async function searchOFF(q) {
  const url = (host) => `https://${host}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,serving_size,serving_quantity,nutriments`;
  const get = async (host) => { const r = await fetch(url(host)); if (!r.ok) throw new Error('search failed'); return (await r.json()).products || []; };
  let list = await get('ca');
  if (list.length < 8) list = [...list, ...(await get('world').catch(() => []))];
  const seen = new Set(), out = [];
  for (const p of list) {
    if (!p.code || seen.has(p.code) || !p.product_name) continue;
    seen.add(p.code);
    const f = fromOFF(p.code, p);
    if (f) out.push(f);
  }
  return out.slice(0, 25);
}

/** Keep a food from Open Food Facts in My foods (and share it when signed in). */
export function keepFood(f) {
  if (state.food.custom.some((x) => x.id === f.id)) return state.food.custom.find((x) => x.id === f.id);
  commit((st) => { st.food.custom.unshift(f); });
  shareFood(f);
  return f;
}

/** Look a barcode up: your saved foods, then the Carver database, then Open Food Facts. Returns a food or null. */
export async function lookup(code) {
  const codes = codeVariants(code);
  const mine = state.food.custom.find((f) => codes.includes(f.barcode));
  if (mine) return mine;
  for (const c of codes) { const shared = await sharedByBarcode(c); if (shared) return shared; }
  let data = null;
  for (const c of codes) {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=product_name,brands,serving_size,serving_quantity,nutriments`);
    if (!res.ok && res.status !== 404) throw new Error('lookup failed');
    const d = await res.json();
    if (d.status === 1 && d.product) { data = d; break; }
  }
  if (!data) return null;
  const f = fromOFF(code, data.product);
  if (!f) return null;
  commit((st) => { st.food.custom.unshift(f); });
  shareFood(f);   // signed in: saves the next person a lookup
  return f;
}

export function fromOFF(code, p) {
  const nu = p.nutriments || {};
  const g = (k) => (nu[k] == null || nu[k] === '' ? undefined : +nu[k]);
  let kcal = g('energy-kcal_100g');
  if (kcal == null && g('energy_100g') != null) kcal = g('energy_100g') / 4.184;   // kJ → kcal
  if (kcal == null) return null;
  const mg = (k) => (g(k) == null ? undefined : g(k) * 1000);     // OFF stores grams
  const ug = (k) => (g(k) == null ? undefined : g(k) * 1e6);
  const n = {
    kcal, p: g('proteins_100g') ?? 0, c: g('carbohydrates_100g') ?? 0, f: g('fat_100g') ?? 0,
    fib: g('fiber_100g'), sug: g('sugars_100g'), sat: g('saturated-fat_100g'),
    chol: mg('cholesterol_100g'), na: mg('sodium_100g') ?? (g('salt_100g') != null ? g('salt_100g') * 400 : undefined),
    k: mg('potassium_100g'), ca: mg('calcium_100g'), fe: mg('iron_100g'), mg: mg('magnesium_100g'), zn: mg('zinc_100g'),
    vc: mg('vitamin-c_100g'), va: ug('vitamin-a_100g'), vd: ug('vitamin-d_100g'), b12: ug('vitamin-b12_100g'), fol: ug('folates_100g'),
  };
  Object.keys(n).forEach((k) => (n[k] === undefined || isNaN(n[k])) && delete n[k]);
  const servings = [];
  const sq = parseFloat(p.serving_quantity);
  if (sq > 0) servings.push({ label: p.serving_size ? `1 serving (${p.serving_size})` : `1 serving`, g: sq });
  servings.push({ label: '100 g', g: 100 });
  const brand = (p.brands || '').split(',')[0].trim();
  return {
    id: 'bc-' + code, barcode: code, name: (p.product_name || 'Scanned food').trim(), brand, icon: '🏷️',
    cat: 'My foods', custom: true, scanned: true, servings, n,
  };
}
