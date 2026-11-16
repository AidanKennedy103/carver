// Barcode scanner: camera → barcode → Open Food Facts (free, open database).
// Uses the browser's own BarcodeDetector where it exists, otherwise the ZXing
// library (loaded only when you first scan). Scanned foods are saved to My foods
// so they work offline and instantly next time.

import { h, sheet, toast } from './ui.js';
import { state, commit } from './store.js';
import { createFood } from './nutrition.js';
import { sharedByBarcode, shareFood } from './cloud.js';

const ZXING = 'https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js';
let zxingLoad;
const loadZXing = () => zxingLoad || (zxingLoad = new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = ZXING; s.onload = () => res(window.ZXing); s.onerror = () => { zxingLoad = null; rej(new Error('Could not load the scanner')); };
  document.head.append(s);
}));

/** Opens the scanner. onFood(food) gets a food ready to log. */
export function scanBarcode(onFood) {
  let stopped = false, stream = null, reader = null, raf = 0, busy = false;
  const video = h('video', { playsinline: true, muted: true, autoplay: true });
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  const status = h('div.scan-status', 'Starting camera…');
  const manual = h('input.field', { placeholder: 'Or type the barcode number', inputmode: 'numeric', enterkeyhint: 'search' });
  manual.addEventListener('keydown', (e) => { if (e.key === 'Enter' && manual.value.trim()) found(manual.value.trim()); });

  const s = sheet(h('div.form.scan',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Scan barcode'), h('span')),
    h('div.scan-view', video, h('div.scan-frame'), status),
    h('div.name-row', manual, h('button.btn.gold.small', { onclick: () => manual.value.trim() && found(manual.value.trim()) }, 'Look up')),
    h('p.fine', 'Food data from Open Food Facts, a free database anyone can add to. Check the numbers against the label.'),
  ), { onClose: stop });

  function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    try { reader?.reset(); } catch { /* fine */ }
    stream?.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'No camera here. Type the barcode instead.'; return; }
    try {
      if ('BarcodeDetector' in window) {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return stop();
        video.srcObject = stream;
        await video.play();
        status.textContent = 'Point at a barcode';
        const loop = async () => {
          if (stopped) return;
          try { const codes = await det.detect(video); if (codes[0]) return found(codes[0].rawValue); } catch { /* keep trying */ }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } else {
        const ZX = await loadZXing();
        if (stopped) return;
        const hints = new Map([[ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E]]]);
        reader = new ZX.BrowserMultiFormatReader(hints, 300);
        status.textContent = 'Point at a barcode';
        await reader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video, (result) => {
          if (result && !stopped) found(result.getText());
        });
      }
    } catch (e) {
      status.textContent = e.name === 'NotAllowedError'
        ? 'Camera access is off. Allow it in Settings → Safari → Camera, or type the barcode.'
        : 'Could not start the camera. Type the barcode instead.';
    }
  }

  async function found(code) {
    if (busy) return;
    busy = true;
    navigator.vibrate?.(60);
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

/** Look a barcode up: your saved foods, then the Carver database, then Open Food Facts. Returns a food or null. */
export async function lookup(code) {
  const mine = state.food.custom.find((f) => f.barcode === code);
  if (mine) return mine;
  const shared = await sharedByBarcode(code);
  if (shared) return shared;
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_size,serving_quantity,nutriments`);
  if (!res.ok && res.status !== 404) throw new Error('lookup failed');
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const f = fromOFF(code, data.product);
  if (!f) return null;
  commit((st) => { st.food.custom.unshift(f); });
  shareFood(f);   // signed in: saves the next person a lookup
  return f;
}

function fromOFF(code, p) {
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
