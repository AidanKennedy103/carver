// Nutrition: a Cronometer-style food diary with macros up front and a
// micronutrient page. Quick add ("dinner 1000 calories") with macro sliders
// for when you just know the calories.

import { h, fill, icon, push, navBar, sheet, toast, actionSheet, confirmBox, promptBox, fmtDate } from './ui.js';
import { state, commit, uid, ymd, addDays, dayLog, dayTotals, allFoods, food, nutrientsFor, logFood, updateLog, deleteLog, recentFoods, sharedFoods } from './store.js';
import { enabled as cloudOn, account, shareFood } from './cloud.js';
import { MACROS, MICROS, CATEGORIES } from './foods.js';
import { COLORS } from './charts.js';
import { openGoals } from './goals.js';
import { scanBarcode } from './barcode.js';

export const MEALS = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
  { id: 'snacks', name: 'Snacks' },
];
const MACRO_COLOR = { p: COLORS.protein, c: COLORS.carbs, f: COLORS.fat };

export function mealNow() {
  const hr = new Date().getHours() + new Date().getMinutes() / 60;
  return hr < 10.5 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'snacks';
}
const r0 = (v) => Math.round(v || 0);
const r1 = (v) => Math.round((v || 0) * 10) / 10;
const fmtAmt = (v) => (v >= 100 ? r0(v) : v >= 10 ? r1(v) : Math.round(v * 100) / 100).toLocaleString();

let viewDate = ymd();

function dayLabel(key) {
  const today = ymd();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = key.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d), { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------- The page ----------

export function nutritionPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  function draw() {
    const t = dayTotals(viewDate);
    const g = state.goals;
    const left = g.kcal - t.kcal;
    const entries = dayLog(viewDate);

    fill(body,
      navBar({ title: 'Nutrition', back: false, large: true, right: [h('button.link', { onclick: openGoals }, 'Goals')] }),

      h('div.date-bar',
        h('button.icon-btn', { onclick: () => { viewDate = addDays(viewDate, -1); draw(); }, 'aria-label': 'Previous day' }, icon('back')),
        h('button.date-label', { onclick: () => { viewDate = ymd(); draw(); } }, dayLabel(viewDate)),
        h('button.icon-btn.flip', { onclick: () => { viewDate = addDays(viewDate, 1); draw(); }, 'aria-label': 'Next day' }, icon('back'))),

      // Energy and macros
      h('section.card.energy',
        h('div.energy-top',
          h('div', h('div.energy-v', r0(t.kcal).toLocaleString()), h('div.energy-k', 'kcal eaten')),
          h('div.energy-goal', h('div.energy-v' + (left < 0 ? '.over' : ''), Math.abs(r0(left)).toLocaleString()), h('div.energy-k', left < 0 ? 'over goal' : 'left'))),
        bar(t.kcal, g.kcal, COLORS.calories, true),
        h('div.macro-rows', MACROS.map((m) => h('div.macro-row',
          h('div.macro-head', h('span.macro-name', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), m.name), h('span.macro-val', `${r0(t[m.k])} / ${g[m.k]} g`)),
          bar(t[m.k], g[m.k], MACRO_COLOR[m.k])))),
        h('button.link.micros-link', { onclick: () => push(() => microsScreen(viewDate)) }, 'Micronutrients', icon('back', 16))),

      h('div.add-row',
        h('button.add-tile', { onclick: () => quickAdd({ date: viewDate }) }, h('span.add-ico', '⚡'), 'Quick add'),
        h('button.add-tile', { onclick: () => addFood({ date: viewDate }) }, h('span.add-ico', '🔎'), 'Search food'),
        h('button.add-tile', { onclick: () => scanBarcode((f) => amountSheet({ food: f, date: viewDate })) }, h('span.add-ico', '▦'), 'Scan')),

      MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal.id);
        const kcal = list.reduce((n, e) => n + (e.n.kcal || 0), 0);
        return h('section.meal',
          h('div.meal-head',
            h('span.meal-name', meal.name),
            h('span.meal-kcal', list.length ? `${r0(kcal)} kcal` : ''),
            h('button.icon-btn', { onclick: () => mealMenu(meal, list, viewDate), 'aria-label': `${meal.name} options` }, icon('more', 20)),
            h('button.icon-btn.gold-text', { onclick: () => addFood({ date: viewDate, meal: meal.id }), 'aria-label': `Add to ${meal.name}` }, icon('plus', 20))),
          list.length ? h('div.card.list-card', list.map((e) => h('button.food-line', { onclick: () => editEntry(e) },
            h('span.food-ico', e.icon || (e.quick ? '⚡' : '🍽️')),
            h('span.food-text', h('span.food-name', e.name), h('span.food-sub', e.quick ? `${e.note ? e.note + ' · ' : ''}P ${r0(e.n.p)} · C ${r0(e.n.c)} · F ${r0(e.n.f)} g` : `${fmtAmt(e.qty)} × ${e.servingLabel}`)),
            h('span.food-kcal', r0(e.n.kcal))))) : null);
      }),
      h('div.bottom-space'),
    );
  }

  draw();
  el.append(body);
  return { el, refresh: draw };
}

// ---------- Meal shortcuts: copy yesterday, saved meals ----------

const copyEntry = (e, date, meal) => { const { id, ts, ...rest } = e; return { ...rest, date, meal, n: { ...e.n } }; };

function mealMenu(meal, list, date) {
  const prev = dayLog(addDays(date, -1)).filter((e) => e.meal === meal.id);
  const kcal = (arr) => r0(arr.reduce((n, e) => n + (e.n.kcal || 0), 0));
  const actions = [];
  if (prev.length) actions.push({ label: `Copy yesterday’s ${meal.name.toLowerCase()} (${kcal(prev)} kcal)`, onClick: () => { prev.forEach((e) => logFood(copyEntry(e, date, meal.id))); toast(`Copied ${prev.length} item${prev.length > 1 ? 's' : ''}`); } });
  if (list.length) actions.push({ label: 'Save as a meal', onClick: () => saveMeal(list, meal) });
  if (state.food.meals?.length) actions.push({ label: 'Add a saved meal', onClick: () => addFood({ date, meal: meal.id, cat: 'Saved meals' }) });
  if (list.length) actions.push({ label: `Clear ${meal.name.toLowerCase()}`, danger: true, onClick: async () => { if (await confirmBox(`Clear ${meal.name.toLowerCase()}?`, `Removes ${list.length} item${list.length > 1 ? 's' : ''}.`, { ok: 'Clear', danger: true })) commit((s) => { const ids = new Set(list.map((e) => e.id)); s.food.log = s.food.log.filter((e) => !ids.has(e.id)); }); } });
  if (!actions.length) { toast(`Nothing in yesterday’s ${meal.name.toLowerCase()} to copy`); return; }
  actionSheet(meal.name, actions);
}

async function saveMeal(list, meal) {
  const name = await promptBox('Name this meal', list.length === 1 ? list[0].name : `My ${meal.name.toLowerCase()}`, { placeholder: 'e.g. Usual breakfast' });
  if (!name?.trim()) return;
  commit((s) => { s.food.meals = [...(s.food.meals || []), { id: uid(), name: name.trim(), items: list.map((e) => copyEntry(e, null, null)) }]; });
  toast('Saved. Find it under Saved meals when you add food.');
}

function logMeal(m, date, meal) {
  m.items.forEach((e) => logFood({ ...e, date, meal, n: { ...e.n } }));
  toast(`Added ${m.name}`);
}

function bar(v, goal, color, big = false) {
  const pct = goal ? Math.min(100, (v / goal) * 100) : 0;
  return h('div.bar' + (big ? '.big' : ''), h('div.bar-fill', { style: { width: pct + '%', background: color } }), v > goal && goal ? h('div.bar-over', { style: { width: Math.min(100, ((v - goal) / goal) * 100) + '%' } }) : null);
}

function editEntry(e) {
  if (e.quick) { quickAdd({ entry: e }); return; }
  const f = food(e.foodId);
  if (f) { amountSheet({ food: f, entry: e }); return; }
  actionSheet(e.name, [{ label: 'Delete', danger: true, onClick: () => deleteLog(e.id) }]);
}

// ---------- Quick add: just calories, with macro sliders ----------

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
  const presetRow = h('div.chips.tight', PRESETS.map((p) => h('button.chip', { onclick: () => { st.lock = null; st.p = p.p; st.c = p.c; st.f = p.f; syncSliders(); update(); } }, p.name)));
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

// ---------- Search and add a food ----------

export function addFood({ date = ymd(), meal = null, cat: startCat = null } = {}) {
  let cat = startCat || (recentFoods().length ? 'Recent' : 'All'), q = '';
  const list = h('div.ex-list');
  const search = h('input.search-input', {
    type: 'search', placeholder: 'Search foods', autocomplete: 'off', enterkeyhint: 'search',
    oninput: () => { q = search.value.toLowerCase().trim(); draw(); },
  });
  const chips = h('div.chips.no-drag');
  const drawChips = () => chips.replaceChildren(...['Recent', ...(state.food.meals?.length ? ['Saved meals'] : []), 'All', 'My foods', ...(sharedFoods().length ? ['Community'] : []), ...CATEGORIES].map((c) => h('button.chip' + (c === cat ? '.on' : ''), { onclick: () => { cat = c; drawChips(); draw(); } }, c)));

  function draw() {
    let items;
    if (cat === 'Saved meals' && !q) {
      const meals = state.food.meals || [];
      list.replaceChildren(...meals.map((m) => h('button.ex-row', {
        onclick: () => actionSheet(m.name, [
          { label: `Add to ${MEALS.find((x) => x.id === (meal || mealNow())).name}`, onClick: () => { logMeal(m, date, meal || mealNow()); s.close(); } },
          { label: 'Delete saved meal', danger: true, onClick: () => { commit((st) => { st.food.meals = st.food.meals.filter((x) => x.id !== m.id); }); draw(); } },
        ]),
      },
      h('span.ex-badge.food-badge', '🍱'),
      h('span.ex-text', h('span.ex-name', m.name), h('span.ex-sub', `${m.items.length} item${m.items.length > 1 ? 's' : ''} · ${r0(m.items.reduce((n, e) => n + (e.n.kcal || 0), 0))} kcal · ${m.items.map((e) => e.name).join(', ')}`)))),
      meals.length ? null : h('div.empty-small', 'Save a meal from the ⋯ menu on any meal in your diary.'));
      return;
    }
    // Every word has to match somewhere in the name or brand ("greek yog" finds Greek yogurt)
    const words = q.split(/\s+/).filter(Boolean);
    const hit = (f) => { const t = `${f.name} ${f.brand || ''}`.toLowerCase(); return words.every((w) => t.includes(w)); };
    if (q) items = allFoods().filter(hit);
    else if (cat === 'Recent') items = recentFoods(30);
    else if (cat === 'All') items = allFoods();
    else if (cat === 'My foods') items = state.food.custom;
    else items = allFoods().filter((f) => f.cat === cat);
    list.replaceChildren(
      ...items.map((f) => {
        const sv = f.servings[0];
        return h('button.ex-row', { onclick: () => amountSheet({ food: f, date, meal, onDone: () => s.close() }) },
          h('span.ex-badge.food-badge', f.icon || '🍽️'),
          h('span.ex-text', h('span.ex-name', f.name), h('span.ex-sub', `${f.brand ? f.brand + ' · ' : ''}${sv.label} · ${r0((f.n.kcal * sv.g) / 100)} kcal`)));
      }),
      items.length ? null : h('div.empty-small', q ? 'Nothing matches. Try Quick add or create the food.' : cat === 'My foods' ? 'Foods you create or scan show up here.' : 'Foods you log show up here.'),
    );
  }

  const s = sheet(h('div.picker',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Add food'),
      h('button.link', { onclick: () => createFood((f) => amountSheet({ food: f, date, meal, onDone: () => s.close() })) }, 'Create')),
    h('div.search-wrap', icon('search', 18), search),
    chips,
    h('div.add-row.small',
      h('button.add-tile', { onclick: () => { s.close(); quickAdd({ date, meal }); } }, h('span.add-ico', '⚡'), 'Quick add'),
      h('button.add-tile', { onclick: () => scanBarcode((f) => amountSheet({ food: f, date, meal, onDone: () => s.close() })) }, h('span.add-ico', '▦'), 'Scan barcode')),
    list,
  ), { full: true });
  drawChips();
  draw();
}

/** Choose how much, see the nutrition, add it (or save changes to an entry). */
export function amountSheet({ food: f, date = ymd(), meal = null, entry = null, onDone }) {
  const opts = [...f.servings, { label: 'g', g: 1 }];
  let si = entry ? Math.max(0, opts.findIndex((o) => o.label === entry.servingLabel)) : 0;
  let qty = entry ? entry.qty : (opts[si].g === 1 ? 100 : 1);
  let mealId = entry?.meal || meal || mealNow();

  const qtyIn = h('input.qty-input', { value: qty, inputmode: 'decimal', 'aria-label': 'Amount', oninput: () => { qty = parseFloat(qtyIn.value.replace(',', '.')) || 0; update(); } });
  const step = (d) => { qty = Math.max(0, Math.round((qty + d) * 100) / 100); qtyIn.value = qty; update(); };
  const servSeg = h('div.chips.tight', opts.map((o, i) => h('button.chip' + (i === si ? '.on' : ''), {
    onclick: (e) => {
      const grams = qty * opts[si].g;
      si = i;
      qty = Math.round((grams / opts[si].g) * 100) / 100;   // keep the same amount of food
      if (opts[si].g === 1) qty = Math.round(qty);
      qtyIn.value = qty;
      servSeg.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === e.currentTarget));
      update();
    },
  }, o.label === 'g' ? 'grams' : o.label)));
  const mealRow = h('div.chips.tight');
  const drawMeals = () => mealRow.replaceChildren(...MEALS.map((m) => h('button.chip' + (mealId === m.id ? '.on' : ''), { onclick: () => { mealId = m.id; drawMeals(); } }, m.name)));
  drawMeals();

  const preview = h('div.preview');
  function update() {
    const grams = qty * opts[si].g;
    const n = nutrientsFor(f, grams);
    preview.replaceChildren(
      h('div.preview-kcal', h('b', r0(n.kcal).toLocaleString()), ' kcal', h('span.muted', ` · ${r0(grams)} g`)),
      h('div.preview-macros', MACROS.map((m) => h('div.pm', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), h('b', `${r1(n[m.k])} g`), h('span', m.name)))),
    );
  }

  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', ''),
      entry ? h('button.link.red', { onclick: () => { deleteLog(entry.id); s.close(); } }, 'Delete') : h('span')),
    h('div.amount-food', h('span.amount-ico', f.icon || '🍽️'), h('div', h('div.amount-name', f.name), f.brand ? h('div.muted', f.brand) : null)),
    h('div.qty-row',
      h('button.qty-btn', { onclick: () => step(opts[si].g === 1 ? -10 : -0.5), 'aria-label': 'Less' }, '−'),
      qtyIn,
      h('button.qty-btn', { onclick: () => step(opts[si].g === 1 ? 10 : 0.5), 'aria-label': 'More' }, '+')),
    servSeg,
    preview,
    h('label.form-label', 'Meal'), mealRow,
    h('button.btn.gold.wide', {
      onclick: () => {
        const grams = qty * opts[si].g;
        if (!grams) { toast('Enter an amount'); return; }
        const data = { date: entry?.date || date, meal: mealId, foodId: f.id, name: f.name, icon: f.icon, qty, servingLabel: opts[si].label === 'g' ? 'g' : opts[si].label, grams, n: nutrientsFor(f, grams) };
        if (entry) updateLog(entry.id, data); else logFood(data);
        s.close();
        onDone?.();
        toast(entry ? 'Updated' : `Added ${f.name}`);
      },
    }, entry ? 'Save' : 'Add'),
  ));
  update();
}

// ---------- Create your own food ----------

export function createFood(onDone, prefill = {}) {
  let share = true;
  const v = { name: prefill.name || '', icon: prefill.icon || '🍽️', serving: prefill.serving || '1 serving', g: prefill.g || 100, kcal: '', p: '', c: '', f: '', fib: '', sug: '', na: '' };
  const inp = (key, label, mode = 'decimal', ph = '0') => h('label.goal-row', h('span', label),
    h('span.goal-field', h('input.field.goal-input', { value: v[key], placeholder: ph, inputmode: mode, oninput: (e) => { v[key] = e.target.value; } })));
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'New food'),
      h('button.link.strong', {
        onclick: () => {
          const name = v.name.trim();
          const g = parseFloat(v.g) || 0, kcal = parseFloat(v.kcal);
          if (!name || !g || isNaN(kcal)) { toast('Add a name, serving size and calories'); return; }
          const per = (x, mult = 1) => (x === '' || isNaN(parseFloat(x)) ? undefined : (parseFloat(x) * mult * 100) / g);
          const n = { kcal: per(kcal), p: per(v.p) ?? 0, c: per(v.c) ?? 0, f: per(v.f) ?? 0, fib: per(v.fib), sug: per(v.sug), na: per(v.na) };
          Object.keys(n).forEach((k) => n[k] === undefined && delete n[k]);
          const fd = { id: 'u-' + uid(), name, icon: v.icon || '🍽️', cat: 'My foods', custom: true, servings: [{ label: v.serving || '1 serving', g }], n };
          if (prefill.barcode) fd.barcode = prefill.barcode;
          commit((st) => { st.food.custom.unshift(fd); });
          s.close();
          if (share && account()) shareFood(fd).then((ok) => toast(ok ? 'Added to the Carver food database' : 'Saved to My foods (couldn’t share it)'));
          onDone?.(fd);
        },
      }, 'Save')),
    h('div.name-row',
      h('input.field.emoji-input', { value: v.icon, 'aria-label': 'Icon (emoji)', oninput: (e) => { v.icon = [...e.target.value.trim()].slice(-2).join('') || '🍽️'; } }),
      h('input.field', { value: v.name, placeholder: 'Food name', oninput: (e) => { v.name = e.target.value; } })),
    h('label.form-label', 'Serving'),
    h('div.group',
      h('label.goal-row', h('span', 'Name'), h('span.goal-field', h('input.field.goal-input.wide', { value: v.serving, oninput: (e) => { v.serving = e.target.value; } }))),
      inp('g', 'Grams', 'decimal', '100')),
    h('label.form-label', 'Per serving'),
    h('div.group', inp('kcal', 'Calories'), inp('p', 'Protein (g)'), inp('c', 'Carbs (g)'), inp('f', 'Fat (g)')),
    h('label.form-label', 'Optional'),
    h('div.group', inp('fib', 'Fiber (g)'), inp('sug', 'Sugars (g)'), inp('na', 'Sodium (mg)')),
    cloudOn() ? h('label.goal-row.share-row', h('span', 'Add to the Carver food database'),
      h('input.toggle', { type: 'checkbox', checked: share && !!account(), disabled: !account(), onchange: (e) => { share = e.target.checked; } })) : null,
    cloudOn() ? h('p.fine', account() ? 'Everyone using Carver can then find it. Check the numbers against the label.' : 'Sign in (Home → Settings) to add foods for everyone. It’s saved to My foods either way.') : null,
  ));
}

// ---------- Micronutrients for a day ----------

export function microsScreen(date) {
  const t = dayTotals(date);
  const quick = dayLog(date).filter((e) => e.quick).length;
  const kTot = t.p * 4 + t.c * 4 + t.f * 9;
  const groups = [...new Set(MICROS.map((m) => m.group))];
  const el = h('div.page',
    navBar({ title: dayLabel(date), backLabel: 'Nutrition' }),
    h('div.scroll-body',
      h('h2.detail-title', 'Nutrients'),
      h('div.detail-date', `${r0(t.kcal).toLocaleString()} kcal from ${t.entries} item${t.entries === 1 ? '' : 's'}`),

      h('div.section-head', h('h2.section-title', 'Energy split')),
      h('section.card',
        kTot ? h('div.split-bar.big', MACROS.map((m) => h('i', { style: { width: ((t[m.k] * m.kcal) / kTot) * 100 + '%', background: MACRO_COLOR[m.k] } }))) : h('div.muted', 'Nothing logged yet.'),
        h('div.split-legend', MACROS.map((m) => h('div.pm', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }),
          h('b', kTot ? `${Math.round(((t[m.k] * m.kcal) / kTot) * 100)}%` : '—'), h('span', `${m.name} · ${r0(t[m.k])} g`))))),

      groups.map((gname) => [
        h('div.section-head', h('h2.section-title', gname)),
        h('section.card.list-card', MICROS.filter((m) => m.group === gname).map((m) => {
          const v = t[m.k] || 0;
          const tgt = m.target || m.max;
          const pct = tgt ? (v / tgt) * 100 : null;
          const over = m.max && v > m.max;
          return h('div.micro-row',
            h('div.micro-head', h('span', m.name),
              h('span.micro-val', `${fmtAmt(v)} ${m.unit}`, tgt ? h('span.muted', ` / ${tgt} ${m.unit}${m.max && !m.target ? ' max' : ''}`) : null)),
            tgt ? h('div.bar', h('div.bar-fill', { style: { width: Math.min(100, pct) + '%', background: over ? 'var(--red)' : pct >= 100 ? 'var(--gold)' : 'var(--muted)' } })) : null,
            tgt ? h('div.micro-pct' + (over ? '.red-text' : pct >= 100 ? '.gold-text' : ''), over ? `${Math.round(pct)}% of the limit` : `${Math.round(pct)}%`) : null);
        })),
      ]),
      quick ? h('p.fine', `${quick} quick add${quick > 1 ? 's' : ''} count toward calories and macros only. Pick foods from the list to track vitamins and minerals.`) : null,
      h('p.fine', 'Targets are general adult reference intakes. Values are approximate.'),
      h('div.bottom-space'),
    ),
  );
  return { el };
}
