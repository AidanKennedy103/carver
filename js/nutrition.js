// Nutrition: a Cronometer-style food diary with macros up front. The food
// picker, quick add, recipes and reports live in their own files.

import { h, fill, icon, push, toast, actionSheet, confirmBox, promptBox, navBar, swipe } from './ui.js';
import { state, commit, uid, ymd, addDays, dayStart, dayLog, dayTotals, food, logFood, deleteLog, waterOn, addWater, kcalLook, foodAim } from './store.js';
import { MACROS } from './foods.js';
import { COLORS } from './charts.js';
import { goalsButton } from './goals.js';
import { scanBarcode } from './barcode.js';
import { MEALS, MACRO_COLOR, r0, amountText, dayLabel } from './food-util.js';
import { quickAdd } from './quickadd.js';
import { addFood, amountSheet } from './foodpicker.js';
import { microsScreen, reportScreen } from './nutrition-report.js';
import { foodIcon } from './food-icons.js';
import { copyEntry, copySheet } from './copyfood.js';

let viewDate = ymd();

// ---------- The page ----------

export function nutritionPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  // Swipe the page for the next or previous day; swipe the week strip for a week at a time
  const go = (d) => { viewDate = addDays(viewDate, d); draw(); };
  swipe(body, { left: () => go(1), right: () => go(-1), ignore: '.week-strip' });

  function draw() {
    const t = dayTotals(viewDate);
    const g = state.goals;
    const left = g.kcal - t.kcal;
    const soft = left < 0 && foodAim() === 'build';   // past a minimum while building: that's the goal, so gold, not red
    const entries = dayLog(viewDate);
    const showLeft = !!state.settings.macroLeft;

    fill(body,
      navBar({ title: 'Nutrition', back: false, large: true, right: [goalsButton('nutrition')] }),

      h('div.date-bar',
        h('button.icon-btn', { onclick: () => { viewDate = addDays(viewDate, -1); draw(); }, 'aria-label': 'Previous day' }, icon('back')),
        h('button.date-label', { onclick: () => { viewDate = ymd(); draw(); } }, dayLabel(viewDate)),
        h('button.icon-btn.flip', { onclick: () => { viewDate = addDays(viewDate, 1); draw(); }, 'aria-label': 'Next day' }, icon('back'))),
      swipe(weekStrip(viewDate, (k) => { viewDate = k; draw(); }), { left: () => go(7), right: () => go(-7), target: () => body.querySelector('.week-strip') }),

      // Energy and macros
      h('section.card.energy',
        h('div.energy-top',
          h('div', h('div.energy-v', r0(t.kcal).toLocaleString()), h('div.energy-k', 'kcal eaten')),
          h('div.energy-goal', h('div.energy-v' + (left < 0 ? (soft ? '.soft' : '.over') : ''), Math.abs(r0(left)).toLocaleString()), h('div.energy-k', left < 0 ? (soft ? 'over · goal hit' : 'over goal') : foodAim() === 'build' ? 'to go' : 'left'))),
        bar(t.kcal, g.kcal, COLORS.calories, true, soft),
        // Tap the macros to switch between what you've eaten and what's left
        h('button.macro-rows', { onclick: () => { commit((st) => { st.settings.macroLeft = !st.settings.macroLeft; }); }, 'aria-label': showLeft ? 'Show grams eaten' : 'Show grams left' },
          MACROS.map((m) => {
            const rest = g[m.k] - t[m.k];
            return h('div.macro-row',
              h('div.macro-head', h('span.macro-name', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), m.name),
                h('span.macro-val' + (showLeft && rest < 0 ? '.red-text' : ''), showLeft ? (rest >= 0 ? `${r0(rest)} g left` : `${r0(-rest)} g over`) : `${r0(t[m.k])} / ${g[m.k]} g`)),
              bar(t[m.k], g[m.k], MACRO_COLOR[m.k]));
          })),
        h('div.energy-links',
          h('button.link.micros-link', { onclick: () => push(reportScreen) }, 'Report', icon('back', 16)),
          h('button.link.micros-link', { onclick: () => push(() => microsScreen(viewDate)) }, 'Micronutrients', icon('back', 16)))),


      h('div.add-row',
        h('button.add-tile', { onclick: () => quickAdd({ date: viewDate }) }, h('span.add-ico', icon('bolt', 20)), 'Quick add'),
        h('button.add-tile', { onclick: () => addFood({ date: viewDate }) }, h('span.add-ico', icon('search', 20)), 'Search food'),
        h('button.add-tile', { onclick: () => scanBarcode((f) => amountSheet({ food: f, date: viewDate })) }, h('span.add-ico', '▦'), 'Scan')),

      waterCard(viewDate),

      MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal.id);
        const kcal = list.reduce((n, e) => n + (e.n.kcal || 0), 0);
        return h('section.meal',
          h('div.meal-head',
            h('span.meal-name', meal.name,
              list.length ? h('span.meal-macros', `P ${r0(sumOf(list, 'p'))} · C ${r0(sumOf(list, 'c'))} · F ${r0(sumOf(list, 'f'))}`) : null),
            h('span.meal-kcal', list.length ? `${r0(kcal)} kcal` : ''),
            h('button.icon-btn', { onclick: () => mealMenu(meal, list, viewDate), 'aria-label': `${meal.name} options` }, icon('more', 20)),
            h('button.icon-btn.gold-text', { onclick: () => addFood({ date: viewDate, meal: meal.id }), 'aria-label': `Add to ${meal.name}` }, icon('plus', 20))),
          list.length ? h('div.card.list-card', list.map((e) => h('button.food-line', { onclick: () => editEntry(e) },
            h('span.food-ico', foodIcon((e.foodId && food(e.foodId)?.icon) || e.icon || (e.quick ? '⚡' : '🍽️'))),
            h('span.food-text', h('span.food-name', e.name), h('span.food-sub', e.quick ? `${e.note ? e.note + ' · ' : ''}P ${r0(e.n.p)} · C ${r0(e.n.c)} · F ${r0(e.n.f)} g` : amountText(e))),
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


function mealMenu(meal, list, date) {
  const prev = dayLog(addDays(date, -1)).filter((e) => e.meal === meal.id);
  const kcal = (arr) => r0(arr.reduce((n, e) => n + (e.n.kcal || 0), 0));
  const actions = [];
  const where = (k) => (k === ymd() ? 'today’s' : 'that day’s');
  // Viewing another day: one tap puts this meal into today's
  if (list.length && date !== ymd()) actions.push({ label: `Copy to today’s ${meal.name.toLowerCase()} (${kcal(list)} kcal)`, onClick: () => { list.forEach((e) => logFood(copyEntry(e, ymd(), meal.id))); toast(`Copied ${list.length} item${list.length > 1 ? 's' : ''} to ${where(ymd())} ${meal.name.toLowerCase()}`); } });
  if (list.length) actions.push({ label: 'Copy or move to another meal or day…', onClick: () => copySheet(list, date, { title: `Copy ${meal.name.toLowerCase()}` }) });
  if (prev.length) actions.push({ label: `Copy yesterday’s ${meal.name.toLowerCase()} (${kcal(prev)} kcal)`, onClick: () => { prev.forEach((e) => logFood(copyEntry(e, date, meal.id))); toast(`Copied ${prev.length} item${prev.length > 1 ? 's' : ''}`); } });
  if (list.length) actions.push({ label: 'Save as a meal', onClick: () => saveMeal(list, meal) });
  if (state.food.meals?.length) actions.push({ label: 'Add a saved meal', onClick: () => addFood({ date, meal: meal.id, cat: 'Saved meals' }) });
  if (list.length) actions.push({ label: `Clear ${meal.name.toLowerCase()}`, danger: true, onClick: async () => { if (await confirmBox(`Clear ${meal.name.toLowerCase()}?`, `Removes ${list.length} item${list.length > 1 ? 's' : ''}.`, { ok: 'Clear', danger: true })) commit((s) => { const ids = new Set(list.map((e) => e.id)); s.food.log = s.food.log.filter((e) => !ids.has(e.id)); }); } });
  if (!actions.length) { toast(date === ymd() ? `Nothing in yesterday’s ${meal.name.toLowerCase()} to copy` : 'Nothing here yet'); return; }
  actionSheet(meal.name, actions);
}

async function saveMeal(list, meal) {
  const name = await promptBox('Name this meal', list.length === 1 ? list[0].name : `My ${meal.name.toLowerCase()}`, { placeholder: 'e.g. Usual breakfast' });
  if (!name?.trim()) return;
  commit((s) => { s.food.meals = [...(s.food.meals || []), { id: uid(), name: name.trim(), items: list.map((e) => copyEntry(e, null, null)) }]; });
  toast('Saved. Find it under Saved meals when you add food.');
}

const sumOf = (list, k) => list.reduce((n, e) => n + (e.n?.[k] || 0), 0);

// ---------- The week at a glance ----------

/** Seven days with the one you're viewing in the middle: calories against your goal, tap to jump. */
function weekStrip(key, go) {
  const g = state.goals.kcal;
  const days = Array.from({ length: 7 }, (_, i) => addDays(key, i - 3));
  const today = ymd();
  return h('div.week-strip', days.map((k) => {
    const t = dayTotals(k);
    const pct = g ? Math.min(1, t.kcal / g) : 0;
    const look = kcalLook(t.kcal, g, k);
    const d = new Date(dayStart(k));
    return h('button.wk-day' + (k === key ? '.on' : '') + (k > today ? '.future' : ''), {
      onclick: () => go(k), 'aria-label': `${dayLabel(k)}: ${r0(t.kcal)} kcal`,
    },
    h('span.wk-dow', 'MTWTFSS'[(d.getDay() + 6) % 7]),
    h('span.wk-bar', h('i' + (look ? '.' + look : ''), { style: { height: pct * 100 + '%' } })),
    h('span.wk-num', d.getDate()));
  }));
}

// ---------- Water ----------

const L = (ml) => `${+(ml / 1000).toFixed(2)} L`;   // 0 L, 1.5 L, 1.25 L
export function waterCard(date) {
  const ml = waterOn(date), goal = state.goals.water || 2500;
  const glasses = Math.max(4, Math.round(goal / 250));
  const full = Math.min(glasses, Math.floor(ml / 250));
  return h('section.card.water',
    h('div.water-top',
      h('span.water-title', icon('drop', 16), 'Water'),
      h('span.water-val', `${L(ml)} `, h('span.muted', `/ ${L(goal)}`)),
      ml ? h('button.icon-btn.water-minus', { onclick: () => addWater(date, -250), 'aria-label': 'Remove 250 ml of water' }, '−') : null),
    h('div.water-glasses', { role: 'img', 'aria-label': `${full} of ${glasses} glasses` }, Array.from({ length: glasses }, (_, i) => h('i' + (i < full ? '.on' : '')))),
    h('div.water-btns',
      h('button.chip', { onclick: () => addWater(date, 250) }, '+ 250 ml'),
      h('button.chip', { onclick: () => addWater(date, 500) }, '+ 500 ml'),
      h('button.chip', { onclick: () => addWater(date, 750) }, '+ 750 ml')));
}

function bar(v, goal, color, big = false, soft = false) {
  const pct = goal ? Math.min(100, (v / goal) * 100) : 0;
  return h('div.bar' + (big ? '.big' : ''), h('div.bar-fill', { style: { width: pct + '%', background: color } }), v > goal && goal ? h('div.bar-over' + (soft ? '.soft' : ''), { style: { width: Math.min(100, ((v - goal) / goal) * 100) + '%' } }) : null);
}

function editEntry(e) {
  const f = e.quick ? null : food(e.foodId);
  const edit = e.quick ? () => quickAdd({ entry: e }) : f ? () => amountSheet({ food: f, entry: e }) : null;
  // On another day, offer to log it again today (leftovers, the same lunch…)
  if (e.date !== ymd()) {
    actionSheet(e.name, [
      { label: 'Add to today', onClick: () => { logFood(copyEntry(e, ymd(), e.meal)); toast(`Added ${e.name} to today`); } },
      { label: 'Copy or move…', onClick: () => copySheet([e], e.date) },
      ...(edit ? [{ label: 'Edit', onClick: edit }] : []),
      { label: 'Delete', danger: true, onClick: () => deleteLog(e.id) },
    ]);
    return;
  }
  if (edit) { edit(); return; }
  actionSheet(e.name, [{ label: 'Delete', danger: true, onClick: () => deleteLog(e.id) }]);
}
