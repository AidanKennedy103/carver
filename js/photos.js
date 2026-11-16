// Progress photos, stored on this phone in IndexedDB (too big for localStorage).
// The list of photos (id + date) also lives in the main store so screens can
// draw instantly; the images load on demand.

import { state, commit, uid } from './store.js';

const DB = 'carver-photos', STORE = 'photos';
let dbp;
function db() {
  return dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => rej(t.error);
  });
};

/** Shrink a photo so a year of them fits comfortably. */
async function resize(file, max) {
  const img = await createImageBitmap(file).catch(async () => {
    const el = new Image();
    el.src = URL.createObjectURL(file);
    await el.decode();
    return el;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
}

export async function addPhoto(file, ts = Date.now()) {
  const [full, thumb] = await Promise.all([resize(file, 1400), resize(file, 360)]);
  const id = uid();
  await tx('readwrite', (s) => s.put({ id, ts, full, thumb }));
  commit((st) => { st.body.photos = [...(st.body.photos || []), { id, ts }].sort((a, b) => b.ts - a.ts); });
  return id;
}

export async function deletePhoto(id) {
  await tx('readwrite', (s) => s.delete(id));
  commit((st) => { st.body.photos = (st.body.photos || []).filter((p) => p.id !== id); });
}

const urls = new Map();
/** Object URL for a photo ('thumb' or 'full'), cached. */
export async function photoURL(id, size = 'thumb') {
  const key = id + size;
  if (urls.has(key)) return urls.get(key);
  const rec = await tx('readonly', (s) => s.get(id));
  if (!rec) return null;
  const url = URL.createObjectURL(rec[size]);
  urls.set(key, url);
  return url;
}

export const photos = () => state.body.photos || [];

/** Fill an <img> once its photo has loaded. */
export function loadInto(img, id, size = 'thumb') {
  photoURL(id, size).then((u) => { if (u) img.src = u; }).catch(() => {});
  return img;
}
