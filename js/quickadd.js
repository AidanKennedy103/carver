// Quick add: when you just know the calories ("dinner 1000 calories"), with
// macro sliders that always add up, and a lock to fix one macro in grams.

import { h, fill, icon, sheet, toast } from './ui.js';
import { copySheet } from './copyfood.js';
import { state, ymd, dayTotals, logFood, updateLog, deleteLog } from './store.js';
import { MACROS } from './foods.js';
import { MEALS, mealNow, MACRO_COLOR, r0 } from './food-util.js';

const PRESETS = [
  { name: 'Balanced', p: 30, c: 40, f: 30 },
  { name: 'High protein', p: 40, c: 35, f: 25 },
  { name: 'Low carb', p: 35, c: 15, f: 50 },
];

/** "dinner 1000 calories", "chipotle bowl 850", "1200 cal lunch" → { meal, kcal, name } */
export function parseQuick(text) {
  const t = text.toLowerCase();
  const out = { meal: null, kcal: null, name: '' };
  // A number with a calorie word wins; otherwise the last number ("2 eggs and toast 350")
  const withUnit = /(\d+(?:[.,]\d+)?)\s*(?:calories|calorie|kcals?|cals?)\b/i;
  const all = [...t.matchAll(/\d+(?:[.,]\d+)?/g)];
  const m = t.match(withUnit) || (all.length ? [all[all.length - 1][0], all[all.length - 1][0]] : null);
  if (m) out.kcal = Math.round(parseFloat(m[1].replace(',', '.')));
  for (const meal of MEALS) if (new RegExp(`\\b${meal.id.replace(/s$/, '')}s?\\b`).test(t)) out.meal = meal.id;
  if (/\bsnack/.test(t)) out.meal = 'snacks';
  let name = text;
  if (t.match(withUnit)) name = name.replace(withUnit, '');
  else if (all.length) { const last = all[all.length - 1]; name = name.slice(0, last.index) + name.slice(last.index + last[0].length); }
  name = name.replace(/\s+/g, ' ').trim();
  out.name = name ? name[0].toUpperCase() + name.slice(1) : '';
  return out;
}

export function quickAdd({ date = ymd(), meal = null, entry = null } = {}) {
  const st = entry
    ? { kcal: r0(entry.n.kcal), meal: entry.meal, name: entry.name, ...pctFrom(entry.n) }
    : { kcal: null, meal: meal || mealNow(), name: '', p: 30, c: 40, f: 30 };

  const text = h('input.field', {
    placeholder: 'e.g. dinner 1000 calories', value: entry ? `${entry.name}` : '', enterkeyhint: 'done', autocomplete: 'off',
    oninput: () => {
      const q = parseQuick(text.value);
      if (q.kcal != null) { st.kcal = q.kcal; kcalIn.value = q.kcal; }
      if (q.meal) { st.meal = q.meal; drawMeals(); }
      st.name = q.name;
      update();
    },
  });
  const kcalIn = h('input.kcal-input', {
    value: st.kcal ?? '', placeholder: '0', inputmode: 'numeric', 'aria-label': 'Calories',
    oninput: () => { st.kcal = parseInt(kcalIn.value, 10) || 0; update(); },
  });
  const mealRow = h('div.chips.tight');
  const drawMeals = () => mealRow.replaceChildren(...MEALS.map((m) => h('button.chip' + (st.meal === m.id ? '.on' : ''), { onclick: () => { st.meal = m.id; drawMeals(); } }, m.name)));
  drawMeals();

  // A locked macro keeps its grams; the other two share whatever calories are left.
  st.lock = null; st.lockG = 0;
  const sliders = {}, gramIn = {}, lockBtn = {};
  const pctOf = (k, g) => (st.kcal ? Math.min(100, (g * MACROS.find((m) => m.k === k).kcal * 100) / st.kcal) : 0);
  const gramsOf = (k) => (st.lock === k ? st.lockG : ((st.kcal || 0) * st[k]) / 100 / MACROS.find((m) => m.k === k).kcal);
  const macroBox = h('div.sliders', MACROS.map((m) => {
    const input = h('input.slider', { type: 'range', min: 0, max: 100, step: 1, value: st[m.k], style: { '--c': MACRO_COLOR[m.k] }, 'aria-label': `${m.name} share of calories` });
    input.addEventListener('input', () => rebalance(m.k, +input.value));
    sliders[m.k] = input;
    gramIn[m.k] = h('input.gram-in', {
      inputmode: 'decimal', 'aria-label': `${m.name} grams`,
      oninput: () => { const g = parseFloat(gramIn[m.k].value.replace(',', '.')); setLock(m.k, isNaN(g) ? 0 : g); },
      onfocus: () => gramIn[m.k].select(),
    });
    lockBtn[m.k] = h('button.lock-btn', { 'aria-label': `Lock ${m.name}`, onclick: () => (st.lock === m.k ? setLock(null) : setLock(m.k, Math.round(gramsOf(m.k)))) });
    return h('div.slider-row',
      h('div.slider-head', h('span.macro-name', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), m.name),
        h('span.slider-g', gramIn[m.k], h('span', '\u00a0g'), h('span.slider-pct'), lockBtn[m.k])),
      input);
  }));
  // "Fits my day": split these calories like the protein, carbs and fat you still have left today
  const fitsDay = () => {
    const g = state.goals, t = dayTotals(entry?.date || date);
    const left = { p: Math.max(0, g.p - t.p) * 4, c: Math.max(0, g.c - t.c) * 4, f: Math.max(0, g.f - t.f) * 9 };
    const sum = left.p + left.c + left.f;
    if (!sum) { toast('You’ve already hit all your macros today'); return null; }
    return { name: 'Fits my day', p: (left.p / sum) * 100, c: (left.c / sum) * 100, f: (left.f / sum) * 100 };
  };
  const apply = (p) => { if (!p) return; st.lock = null; st.p = p.p; st.c = p.c; st.f = p.f; syncSliders(); update(); };
  const presetRow = h('div.chips.tight',
    h('button.chip.gold-chip', { onclick: () => apply(fitsDay()) }, 'Fits my day'),
    PRESETS.map((p) => h('button.chip', { onclick: () => apply(p) }, p.name)));
  const bal = h('div.split-bar');
  const lockNote = h('p.fine.lock-note');

  function setLock(k, g = 0) {
    st.lock = k; st.lockG = Math.max(0, g);
    applyLock();
    syncSliders();
    update(true);
  }
  // Recompute the locked share from its grams, and give the rest to the other two by their ratio
  function applyLock() {
    if (!st.lock) return;
    const v = pctOf(st.lock, st.lockG);
    const [a, b] = MACROS.map((m) => m.k).filter((x) => x !== st.lock);
    const rest = 100 - v, sum = st[a] + st[b];
    if (sum === 0) { st[a] = rest / 2; st[b] = rest / 2; } else { st[a] = (rest * st[a]) / sum; st[b] = (rest * st[b]) / sum; }
    st[st.lock] = v;
  }

  // Moving one slider shares the rest between the others, so the three always add up to 100%.
  // With a macro locked, only the third one moves.
  function rebalance(k, v) {
    if (st.lock && st.lock !== k) {
      const other = MACROS.map((m) => m.k).find((x) => x !== k && x !== st.lock);
      const room = 100 - st[st.lock];
      st[k] = Math.min(v, room); st[other] = room - st[k];
    } else {
      const others = MACROS.map((m) => m.k).filter((x) => x !== k);
      const rest = 100 - v;
      const a = st[others[0]], b = st[others[1]];
      if (a + b === 0) { st[others[0]] = rest / 2; st[others[1]] = rest / 2; }
      else { st[others[0]] = (rest * a) / (a + b); st[others[1]] = (rest * b) / (a + b); }
      st[k] = v;
    }
    syncSliders(k);
    update();
  }
  function syncSliders(except) { for (const m of MACROS) if (m.k !== except) sliders[m.k].value = Math.round(st[m.k]); }
  function update(fromGrams = false) {
    if (st.lock && !fromGrams) { applyLock(); syncSliders(); }
    const k = st.kcal || 0;
    for (const m of MACROS) {
      const locked = st.lock === m.k;
      if (document.activeElement !== gramIn[m.k]) gramIn[m.k].value = r0(gramsOf(m.k));
      gramIn[m.k].parentNode.querySelector('.slider-pct').textContent = `\u00a0· ${Math.round(st[m.k])}%`;
      sliders[m.k].disabled = locked;
      sliders[m.k].closest('.slider-row').classList.toggle('locked', locked);
      lockBtn[m.k].classList.toggle('on', locked);
      fill(lockBtn[m.k], icon(locked ? 'lock' : 'unlock', 16));
    }
    const lockedM = MACROS.find((m) => m.k === st.lock);
    const over = lockedM && k && st.lockG * lockedM.kcal > k;
    lockNote.textContent = lockedM
      ? (over ? `${r0(st.lockG)} g of ${lockedM.name.toLowerCase()} is more than ${k} kcal.` : `${lockedM.name} is locked at ${r0(st.lockG)} g. The other sliders share the rest.`)
      : 'Type grams or tap a lock to fix one macro.';
    lockNote.classList.toggle('red', !!over);
    bal.replaceChildren(...MACROS.map((m) => h('i', { style: { width: st[m.k] + '%', background: MACRO_COLOR[m.k] } })));
    saveBtn.disabled = !k;
  }

  const saveBtn = h('button.btn.gold.wide', {
    onclick: () => {
      const k = st.kcal || 0;
      if (!k) return;
      const n = { kcal: k };
      for (const m of MACROS) n[m.k] = gramsOf(m.k);
      const mealName = MEALS.find((m) => m.id === st.meal).name;
      const data = { date: entry?.date || date, meal: st.meal, name: st.name || mealName, quick: true, icon: '⚡', n };
      if (entry) updateLog(entry.id, data); else logFood(data);
      s.close();
      toast(entry ? 'Updated' : `Added ${k.toLocaleString()} kcal`);
    },
  }, entry ? 'Save' : 'Add');

  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Quick add'),
      entry ? h('button.link.red', { onclick: () => { deleteLog(entry.id); s.close(); } }, 'Delete') : h('span')),
    entry ? h('button.link.small-link.copy-link', { onclick: () => { s.close(); copySheet([entry], entry.date); } }, 'Copy or move to another meal or day') : null,
    text,
    h('div.kcal-wrap', kcalIn, h('span.kcal-unit', 'kcal')),
    mealRow,
    h('label.form-label', 'Macros (share of calories)'),
    bal, macroBox, lockNote, presetRow,
    saveBtn,
  ));
  update();
  if (!entry) setTimeout(() => text.focus(), 350);
}

function pctFrom(n) {
  const k = (n.p || 0) * 4 + (n.c || 0) * 4 + (n.f || 0) * 9;
  if (!k) return { p: 30, c: 40, f: 30 };
  return { p: ((n.p || 0) * 400) / k, c: ((n.c || 0) * 400) / k, f: ((n.f || 0) * 900) / k };
}
