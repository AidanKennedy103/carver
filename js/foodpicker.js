// Finding a food and choosing how much: search, favorites, recents, your
// own foods and recipes, saved meals; the amount sheet; creating and editing foods.
//
// The picker can also "pick" instead of logging (recipes use that to add
// ingredients): pass onPick and it hands back { food, qty, servingLabel, grams, n }.

import { h, icon, sheet, toast, actionSheet, confirmBox } from './ui.js';
import { state, commit, uid, ymd, allFoods, food, nutrientsFor, logFood, updateLog, deleteLog, recentFoods, sharedFoods } from './store.js';
import { enabled as cloudOn, account, shareFood } from './cloud.js';
import { MACROS, CATEGORIES } from './foods.js';
import { scanBarcode } from './barcode.js';
import { MEALS, mealNow, mealName, MACRO_COLOR, r0, r1, num } from './food-util.js';

export const isFav = (id) => (state.food.favs || []).includes(id);
export function toggleFav(id) {
  commit((s) => { const f = new Set(s.food.favs || []); if (f.has(id)) f.delete(id); else f.add(id); s.food.favs = [...f]; });
  return isFav(id);
}
const isMine = (f) => state.food.custom.some((x) => x.id === f.id);

// How often you've logged each food (counted once per search session)
let counts = null, countsAt = 0;
function useCount() {
  if (!counts || countsAt !== state.food.log.length) {
    counts = new Map();
    for (const e of state.food.log) if (e.foodId) counts.set(e.foodId, (counts.get(e.foodId) || 0) + 1);
    countsAt = state.food.log.length;
  }
  return counts;
}

/** How well a food matches the search words: lower is better, null = no match. */
function score(f, words, q) {
  const name = f.name.toLowerCase(), all = `${name} ${(f.brand || '').toLowerCase()}`;
  if (!words.every((w) => all.includes(w))) return null;
  let s = name.startsWith(q) ? 0 : name.split(/[\s,(]+/).some((w) => w.startsWith(words[0])) ? 1 : 2;
  if (isFav(f.id)) s -= 0.6;
  if (isMine(f)) s -= 0.3;
  s -= Math.min(0.5, (useCount().get(f.id) || 0) * 0.05);   // foods you log often come first
  return s + name.length / 200;   // shorter names first among equals ("Egg" before "Egg white")
}

// ---------- Search and add ----------

export function addFood({ date = ymd(), meal = null, cat: startCat = null, onPick = null, title = 'Add food' } = {}) {
  const tabs = () => [
    ...((state.food.favs || []).length ? ['Favorites'] : []),
    'Recent',
    ...(!onPick && state.food.meals?.length ? ['Saved meals'] : []),
    ...(state.food.custom.some((f) => f.recipe) ? ['Recipes'] : []),
    'All', 'My foods',
    ...(sharedFoods().length ? ['Community'] : []),
    ...CATEGORIES,
  ];
  let cat = startCat || ((state.food.favs || []).length ? 'Favorites' : recentFoods().length ? 'Recent' : 'All');
  let q = '';
  const list = h('div.ex-list');
  const search = h('input.search-input', {
    type: 'search', placeholder: 'Search foods', autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Search foods',
    oninput: () => { q = search.value.toLowerCase().trim(); draw(); },
  });
  const chips = h('div.chips.no-drag');
  const drawChips = () => chips.replaceChildren(...tabs().map((c) => h('button.chip' + (c === cat && !q ? '.on' : ''), { onclick: () => { cat = c; search.value = ''; q = ''; drawChips(); draw(); } }, c)));
  const choose = (f) => amountSheet({ food: f, date, meal, onPick, onDone: () => s.close() });

  function draw() {
    if (cat === 'Saved meals' && !q) { drawMeals(); return; }
    let items;
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      items = allFoods().map((f) => [f, score(f, words, q)]).filter(([, sc]) => sc != null).sort((a, b) => a[1] - b[1]).slice(0, 80).map(([f]) => f);
    } else if (cat === 'Favorites') items = (state.food.favs || []).map(food).filter(Boolean);
    else if (cat === 'Recent') items = recentFoods(30);
    else if (cat === 'All') items = allFoods();
    else if (cat === 'My foods') items = state.food.custom.filter((f) => !f.recipe);
    else if (cat === 'Recipes') items = state.food.custom.filter((f) => f.recipe);
    else items = allFoods().filter((f) => f.cat === cat);
    list.replaceChildren(
      ...items.map((f) => {
        const sv = f.servings[0];
        return h('button.ex-row', { onclick: () => choose(f) },
          h('span.ex-badge.food-badge', f.icon || '🍽️'),
          h('span.ex-text', h('span.ex-name', f.name, isFav(f.id) ? h('span.fav-star', ' ★') : null),
            h('span.ex-sub', `${f.brand ? f.brand + ' · ' : ''}${sv.label} · ${r0((f.n.kcal * sv.g) / 100)} kcal · ${r0((f.n.p * sv.g) / 100)} g protein`)));
      }),
      items.length ? null : h('div.empty-small', q ? 'Nothing matches. Try Quick add or create the food.'
        : cat === 'Favorites' ? 'Tap ☆ on a food to keep it here.'
          : cat === 'My foods' ? 'Foods you create or scan show up here.'
            : cat === 'Recipes' ? 'Recipes you build show up here.' : 'Foods you log show up here.'),
    );
  }

  function drawMeals() {
    const meals = state.food.meals || [];
    list.replaceChildren(...meals.map((m) => h('button.ex-row', {
      onclick: () => actionSheet(m.name, [
        { label: `Add to ${mealName(meal || mealNow())}`, onClick: () => { logMeal(m, date, meal || mealNow()); s.close(); } },
        { label: 'Delete saved meal', danger: true, onClick: () => { commit((st) => { st.food.meals = st.food.meals.filter((x) => x.id !== m.id); }); drawChips(); draw(); } },
      ]),
    },
    h('span.ex-badge.food-badge', '🍱'),
    h('span.ex-text', h('span.ex-name', m.name), h('span.ex-sub', `${m.items.length} item${m.items.length > 1 ? 's' : ''} · ${r0(m.items.reduce((n, e) => n + (e.n.kcal || 0), 0))} kcal · ${m.items.map((e) => e.name).join(', ')}`)))),
    meals.length ? null : h('div.empty-small', 'Save a meal from the ⋯ menu on any meal in your diary.'));
  }

  const create = () => actionSheet('Create', [
    { label: 'New food', onClick: () => createFood((f) => choose(f)) },
    ...(onPick ? [] : [{ label: 'New recipe', onClick: () => { s.close(); import('./recipes.js').then((r) => r.openRecipe()); } }]),
  ]);

  const s = sheet(h('div.picker',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', title), h('button.link', { onclick: create }, 'Create')),
    h('div.search-wrap', icon('search', 18), search),
    chips,
    onPick ? null : h('div.add-row.small',
      h('button.add-tile', { onclick: () => { s.close(); import('./quickadd.js').then((m) => m.quickAdd({ date, meal })); } }, h('span.add-ico', '⚡'), 'Quick add'),
      h('button.add-tile', { onclick: () => scanBarcode((f) => choose(f)) }, h('span.add-ico', '▦'), 'Scan barcode')),
    list,
  ), { full: true });
  drawChips();
  draw();
  return s;
}

export function logMeal(m, date, meal) {
  m.items.forEach((e) => logFood({ ...e, date, meal, n: { ...e.n } }));
  toast(`Added ${m.name}`);
}

// ---------- How much ----------

/** Choose how much, see the nutrition, then add it (or save changes to an entry, or hand it to onPick). */
export function amountSheet({ food: f, date = ymd(), meal = null, entry = null, onDone, onPick = null, start = null }) {
  const opts = [...f.servings, { label: 'g', g: 1 }];
  const from = entry || start;
  let si = from ? Math.max(0, opts.findIndex((o) => o.label === from.servingLabel)) : 0;
  let qty = from ? from.qty : (opts[si].g === 1 ? 100 : 1);
  let mealId = entry?.meal || meal || mealNow();

  const qtyIn = h('input.qty-input', { value: qty, inputmode: 'decimal', 'aria-label': 'Amount', onfocus: (e) => e.target.select(), oninput: () => { qty = num(qtyIn.value) || 0; update(); } });
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
      highlights(n),
    );
  }

  const star = h('button.icon-btn.fav-btn' + (isFav(f.id) ? '.on' : ''), {
    'aria-label': isFav(f.id) ? 'Remove from favorites' : 'Add to favorites',
    onclick: () => { const on = toggleFav(f.id); star.classList.toggle('on', on); star.textContent = on ? '★' : '☆'; star.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites'); },
  }, isFav(f.id) ? '★' : '☆');

  const mine = isMine(f);
  const manage = mine && !onPick ? h('button.link.small-link', {
    onclick: () => actionSheet(f.name, [
      f.recipe
        ? { label: 'Edit recipe', onClick: () => { s.close(); import('./recipes.js').then((r) => r.openRecipe(f)); } }
        : { label: 'Edit food', onClick: () => { s.close(); createFood(null, { edit: f }); } },
      { label: `Delete ${f.recipe ? 'recipe' : 'food'}`, danger: true, onClick: async () => {
        if (!(await confirmBox(`Delete “${f.name}”?`, 'Entries you already logged keep their numbers.', { ok: 'Delete', danger: true }))) return;
        commit((st) => { st.food.custom = st.food.custom.filter((x) => x.id !== f.id); st.food.favs = (st.food.favs || []).filter((x) => x !== f.id); });
        s.close();
      } },
    ]),
  }, f.recipe ? 'Edit recipe' : 'Edit food') : null;

  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', ''),
      entry ? h('button.link.red', { onclick: () => { deleteLog(entry.id); s.close(); } }, 'Delete') : star),
    h('div.amount-food', h('span.amount-ico', f.icon || '🍽️'), h('div', h('div.amount-name', f.name), f.brand ? h('div.muted', f.brand) : null, f.recipe ? h('div.muted', `Recipe · ${f.recipe.servings} serving${f.recipe.servings === 1 ? '' : 's'}`) : null), manage),
    h('div.qty-row',
      h('button.qty-btn', { onclick: () => step(opts[si].g === 1 ? -10 : -0.5), 'aria-label': 'Less' }, '−'),
      qtyIn,
      h('button.qty-btn', { onclick: () => step(opts[si].g === 1 ? 10 : 0.5), 'aria-label': 'More' }, '+')),
    servSeg,
    preview,
    onPick ? null : [h('label.form-label', 'Meal'), mealRow],
    h('button.btn.gold.wide', {
      onclick: () => {
        const grams = qty * opts[si].g;
        if (!grams) { toast('Enter an amount'); return; }
        const pick = { food: f, qty, servingLabel: opts[si].label, grams, n: nutrientsFor(f, grams) };
        if (onPick) { onPick(pick); s.close(); onDone?.(); return; }
        const data = { date: entry?.date || date, meal: mealId, foodId: f.id, name: f.name, icon: f.icon, qty, servingLabel: pick.servingLabel, grams, n: pick.n };
        if (entry) updateLog(entry.id, data); else logFood(data);
        s.close();
        onDone?.();
        toast(entry ? 'Updated' : `Added ${f.name}`);
      },
    }, onPick ? 'Use this amount' : entry ? 'Save' : 'Add'),
  ));
  update();
  return s;
}

/** A line of the vitamins and minerals this amount is rich in (20%+ of a day). */
function highlights(n) {
  const rich = [
    ['fib', 'Fiber', 38], ['ca', 'Calcium', 1000], ['fe', 'Iron', 8], ['k', 'Potassium', 3400], ['mg', 'Magnesium', 400],
    ['vc', 'Vitamin C', 90], ['va', 'Vitamin A', 900], ['vd', 'Vitamin D', 15], ['b12', 'B12', 2.4], ['fol', 'Folate', 400], ['zn', 'Zinc', 11],
  ].filter(([k, , t]) => (n[k] || 0) >= t * 0.2).map(([k, name, t]) => `${name} ${Math.round((n[k] / t) * 100)}%`);
  const salty = (n.na || 0) >= 600;
  if (!rich.length && !salty) return null;
  return h('div.preview-rich', rich.length ? `Rich in ${rich.slice(0, 4).join(', ')}` : '', rich.length && salty ? ' · ' : '', salty ? h('span.red-text', `${r0(n.na)} mg sodium`) : '');
}

// ---------- Create or edit your own food ----------

export function createFood(onDone, prefill = {}) {
  const ed = prefill.edit || null;
  let share = !ed;
  const sv = ed ? ed.servings[0] : null;
  const perServing = (k) => (ed && ed.n[k] != null ? r1((ed.n[k] * sv.g) / 100) : '');
  const v = ed
    ? { name: ed.name, icon: ed.icon || '🍽️', serving: sv.label, g: sv.g, kcal: perServing('kcal'), p: perServing('p'), c: perServing('c'), f: perServing('f'), fib: perServing('fib'), sug: perServing('sug'), na: perServing('na') }
    : { name: prefill.name || '', icon: prefill.icon || '🍽️', serving: prefill.serving || '1 serving', g: prefill.g || 100, kcal: '', p: '', c: '', f: '', fib: '', sug: '', na: '' };
  const inp = (key, label, mode = 'decimal', ph = '0') => h('label.goal-row', h('span', label),
    h('span.goal-field', h('input.field.goal-input', { value: v[key], placeholder: ph, inputmode: mode, 'aria-label': label, oninput: (e) => { v[key] = e.target.value; } })));

  const save = () => {
    const name = v.name.trim();
    const g = num(v.g) || 0, kcal = num(v.kcal);
    if (!name || !g || kcal == null) { toast('Add a name, serving size and calories'); return; }
    const per = (x) => (num(x) == null ? undefined : (num(x) * 100) / g);
    const n = { ...(ed ? ed.n : {}), kcal: per(kcal), p: per(v.p) ?? 0, c: per(v.c) ?? 0, f: per(v.f) ?? 0, fib: per(v.fib), sug: per(v.sug), na: per(v.na) };
    Object.keys(n).forEach((k) => n[k] === undefined && delete n[k]);
    const servings = [{ label: v.serving || '1 serving', g }, ...(ed ? ed.servings.slice(1) : [])];
    const fd = ed ? { ...ed, name, icon: v.icon || '🍽️', servings, n } : { id: 'u-' + uid(), name, icon: v.icon || '🍽️', cat: 'My foods', custom: true, servings, n };
    if (prefill.barcode) fd.barcode = prefill.barcode;
    commit((st) => {
      if (ed) { const i = st.food.custom.findIndex((x) => x.id === ed.id); if (i >= 0) st.food.custom[i] = fd; }
      else st.food.custom.unshift(fd);
    });
    s.close();
    if (share && account()) shareFood(fd).then((ok) => toast(ok ? 'Added to the Carver food database' : 'Saved to My foods (couldn’t share it)'));
    else toast(ed ? 'Food updated' : 'Saved to My foods');
    onDone?.(fd);
  };

  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', ed ? 'Edit food' : 'New food'), h('button.link.strong', { onclick: save }, 'Save')),
    h('div.name-row',
      h('input.field.emoji-input', { value: v.icon, 'aria-label': 'Icon (emoji)', oninput: (e) => { v.icon = [...e.target.value.trim()].slice(-2).join('') || '🍽️'; } }),
      h('input.field', { value: v.name, placeholder: 'Food name', 'aria-label': 'Food name', oninput: (e) => { v.name = e.target.value; } })),
    h('label.form-label', 'Serving'),
    h('div.group',
      h('label.goal-row', h('span', 'Name'), h('span.goal-field', h('input.field.goal-input.wide', { value: v.serving, 'aria-label': 'Serving name', oninput: (e) => { v.serving = e.target.value; } }))),
      inp('g', 'Grams', 'decimal', '100')),
    h('label.form-label', 'Per serving'),
    h('div.group', inp('kcal', 'Calories'), inp('p', 'Protein (g)'), inp('c', 'Carbs (g)'), inp('f', 'Fat (g)')),
    h('label.form-label', 'Optional'),
    h('div.group', inp('fib', 'Fiber (g)'), inp('sug', 'Sugars (g)'), inp('na', 'Sodium (mg)')),
    !ed && cloudOn() ? h('label.goal-row.share-row', h('span', 'Add to the Carver food database'),
      h('input.toggle', { type: 'checkbox', checked: share && !!account(), disabled: !account(), onchange: (e) => { share = e.target.checked; } })) : null,
    !ed && cloudOn() ? h('p.fine', account() ? 'Everyone using Carver can then find it. Check the numbers against the label.' : 'Sign in (Home → Settings) to add foods for everyone. It’s saved to My foods either way.') : null,
    ed ? h('p.fine', 'Entries you already logged keep their old numbers.') : null,
  ));
}
