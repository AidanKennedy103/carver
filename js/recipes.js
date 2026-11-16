// Recipes: build a dish from foods, say how many servings it makes, and log a
// serving like any other food. Carver adds up every nutrient, vitamins included.
// Saved recipes live with your own foods (they have a `recipe` field).

import { h, fill, icon, push, pop, navBar, toast, confirmBox, actionSheet } from './ui.js';
import { state, commit, uid, food } from './store.js';
import { MACROS, NUTRIENT_KEYS } from './foods.js';
import { addFood, amountSheet } from './foodpicker.js';
import { MACRO_COLOR, r0, r1, num, amountText } from './food-util.js';
import { foodIcon } from './food-icons.js';

/** Add up the nutrients of the ingredients. */
function totals(items) {
  const t = { grams: 0 };
  for (const k of NUTRIENT_KEYS) t[k] = 0;
  for (const it of items) { t.grams += it.grams; for (const k of NUTRIENT_KEYS) if (it.n[k] != null) t[k] += it.n[k]; }
  return t;
}

/** Turn a recipe into a food (nutrients per 100 g, a serving and the whole dish). */
export function recipeFood(r, id = 'r-' + uid()) {
  const t = totals(r.items);
  const weight = r.cookedG || t.grams || 1;
  const n = {};
  for (const k of NUTRIENT_KEYS) if (t[k]) n[k] = (t[k] * 100) / weight;
  n.kcal = n.kcal || 0; n.p = n.p || 0; n.c = n.c || 0; n.f = n.f || 0;
  return {
    id, name: r.name, icon: r.icon || '🍲', cat: 'Recipes', custom: true, n,
    servings: [{ label: '1 serving', g: weight / r.servings }, { label: 'Whole recipe', g: weight }],
    recipe: { items: r.items, servings: r.servings, cookedG: r.cookedG || null },
  };
}

export function openRecipe(existing = null) {
  push(() => recipeScreen(existing));
}

function recipeScreen(existing) {
  const r = existing
    ? { name: existing.name, icon: existing.icon, servings: existing.recipe.servings, cookedG: existing.recipe.cookedG, items: structuredClone(existing.recipe.items) }
    : { name: '', icon: '🍲', servings: 4, cookedG: null, items: [] };
  const el = h('div.page');
  const body = h('div.scroll-body');

  const nameIn = h('input.field', { value: r.name, placeholder: 'Recipe name', 'aria-label': 'Recipe name', oninput: (e) => { r.name = e.target.value; } });
  const iconIn = h('input.field.emoji-input', { value: r.icon, 'aria-label': 'Icon (emoji)', oninput: (e) => { r.icon = [...e.target.value.trim()].slice(-2).join('') || '🍲'; } });
  const cookedIn = h('input.field.goal-input', { value: r.cookedG ?? '', placeholder: 'optional', inputmode: 'decimal', 'aria-label': 'Cooked weight in grams', onchange: (e) => { r.cookedG = num(e.target.value) || null; draw(); } });

  const addIngredient = () => addFood({
    title: 'Add ingredient',
    onPick: (p) => { r.items.push(item(p)); draw(); },
  });
  const item = (p) => ({ foodId: p.food.id, name: p.food.name, icon: p.food.icon, qty: p.qty, servingLabel: p.servingLabel, grams: p.grams, n: p.n });
  const editItem = (i) => {
    const it = r.items[i];
    const f = food(it.foodId);
    actionSheet(it.name, [
      ...(f ? [{ label: 'Change amount', onClick: () => amountSheet({ food: f, start: it, onPick: (p) => { r.items[i] = item(p); draw(); } }) }] : []),
      { label: 'Remove', danger: true, onClick: () => { r.items.splice(i, 1); draw(); } },
    ]);
  };
  const setServings = (d) => { r.servings = Math.max(1, Math.min(50, r.servings + d)); draw(); };

  function draw() {
    const t = totals(r.items);
    const weight = r.cookedG || t.grams;
    const per = (k) => t[k] / r.servings;
    fill(body,
      navBar({
        title: existing ? 'Edit recipe' : 'New recipe', backLabel: 'Cancel',
        right: [h('button.link.strong', { onclick: save }, 'Save')],
      }),
      h('div.name-row', iconIn, nameIn),

      h('div.section-head', h('h2.section-title', 'Ingredients'), r.items.length ? h('span.section-count', `${r.items.length}`) : null),
      r.items.length
        ? h('section.card.list-card', r.items.map((it, i) => h('button.food-line', { onclick: () => editItem(i) },
          h('span.food-ico', foodIcon((it.foodId && food(it.foodId)?.icon) || it.icon)),
          h('span.food-text', h('span.food-name', it.name), h('span.food-sub', it.servingLabel === 'g' ? `${r0(it.grams)} g` : `${amountText(it)} · ${r0(it.grams)} g`)),
          h('span.food-kcal', r0(it.n.kcal)))))
        : h('div.empty-small', 'Add each ingredient and how much of it goes in.'),
      h('button.btn.gold.wide', { onclick: addIngredient }, icon('plus', 18), 'Add ingredient'),

      h('label.form-label', 'Makes'),
      h('div.group',
        h('div.goal-row', h('span', 'Servings'),
          h('span.stepper',
            h('button', { 'aria-label': 'Fewer servings', onclick: () => setServings(-1) }, '−'),
            h('span', String(r.servings)),
            h('button', { 'aria-label': 'More servings', onclick: () => setServings(1) }, '+'))),
        h('label.goal-row', h('span', 'Cooked weight'), h('span.goal-field', cookedIn, h('span.goal-unit', 'g')))),
      h('p.fine', `Ingredients weigh ${r0(t.grams)} g raw. If you weigh the finished dish, enter it as the cooked weight, so logging by grams stays right when water cooks off.`),

      r.items.length ? [
        h('div.section-head', h('h2.section-title', 'Per serving')),
        h('section.card.recipe-total',
          h('div.energy-top',
            h('div', h('div.energy-v', r0(per('kcal')).toLocaleString()), h('div.energy-k', `kcal · ${r0(weight / r.servings)} g`)),
            h('div.energy-goal', h('div.recipe-whole', `${r0(t.kcal).toLocaleString()} kcal`), h('div.energy-k', 'whole recipe'))),
          h('div.preview-macros', MACROS.map((m) => h('div.pm', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), h('b', `${r1(per(m.k))} g`), h('span', m.name)))),
        )] : null,

      existing ? h('button.link.red-text.leave', {
        onclick: async () => {
          if (!(await confirmBox(`Delete “${existing.name}”?`, 'Entries you already logged keep their numbers.', { ok: 'Delete', danger: true }))) return;
          commit((s) => { s.food.custom = s.food.custom.filter((x) => x.id !== existing.id); });
          pop();
        },
      }, 'Delete recipe') : null,
      h('div.bottom-space'),
    );
  }

  function save() {
    r.name = r.name.trim();
    if (!r.name) { toast('Name your recipe'); nameIn.focus(); return; }
    if (!r.items.length) { toast('Add at least one ingredient'); return; }
    const f = recipeFood(r, existing?.id);
    commit((s) => {
      const i = s.food.custom.findIndex((x) => x.id === f.id);
      if (i >= 0) s.food.custom[i] = f; else s.food.custom.unshift(f);
    });
    pop();
    toast(existing ? 'Recipe saved' : 'Recipe saved. Find it under Recipes when you add food.');
  }

  draw();
  el.append(body);
  return { el };
}

/** Recipes you've saved, newest first. */
export const recipes = () => state.food.custom.filter((f) => f.recipe);
