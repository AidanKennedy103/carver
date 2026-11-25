// Nutrition: Carver's fuel log. A plate ring (calories, and how they split across
// protein, carbs and fat), every macro as eaten and left, a daily Fuel score, the
// nutrients that matter most for training, and meals as cards. The food picker,
// quick add, recipes and reports live in their own files.

import { h, fill, icon, push, toast, actionSheet, confirmBox, promptBox, navBar, swipe } from './ui.js';
import { state, commit, uid, ymd, addDays, dayLog, dayTotals, food, logFood, deleteLog, waterOn, addWater, foodAim, dayGoals, kcalLook, setDayCheck } from './store.js';
import { MACROS, MICROS } from './foods.js';
import { goalsButton } from './goals.js';
import { scanBarcode } from './barcode.js';
import { MEALS, MACRO_COLOR, r0, amountText, dayLabel } from './food-util.js';
import { quickAdd } from './quickadd.js';
import { addFood, amountSheet } from './foodpicker.js';
import { microsScreen, reportScreen } from './nutrition-report.js';
import { foodIcon } from './food-icons.js';
import { coachLine } from './dietcoach.js';
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
    const g = dayGoals(viewDate);
    const left = g.kcal - t.kcal;
    const soft = left < 0 && foodAim() === 'build';   // past a minimum while building: that's the goal, so gold, not red
    const entries = dayLog(viewDate);

    fill(body,
      navBar({ title: 'Nutrition', back: false, large: true, right: [goalsButton('nutrition')] }),

      h('div.date-bar',
        h('button.icon-btn', { onclick: () => { viewDate = addDays(viewDate, -1); draw(); }, 'aria-label': 'Previous day' }, icon('back')),
        h('button.date-label', { onclick: () => { viewDate = ymd(); draw(); } }, dayLabel(viewDate)),
        h('button.icon-btn.flip', { onclick: () => { viewDate = addDays(viewDate, 1); draw(); }, 'aria-label': 'Next day' }, icon('back'))),
      weekDots(viewDate, (k) => { viewDate = k; draw(); }),
      // Calories left in the ring; each macro eaten against its goal
      h('section.card.fuel',
        h('div.fuel-top',
          calRing(t.kcal, g.kcal, left, left < 0 && !soft, soft),
          h('div.fuel-macros', MACROS.map((m) => h('div.fm',
            h('div.fm-head', h('span.fm-name', m.name), h('span.fm-val' + (t[m.k] > g[m.k] * 1.1 && m.k !== 'p' ? '.over' : ''), h('b', r0(t[m.k])), ` / ${g[m.k]} g`)),
            bar(t[m.k], g[m.k], MACRO_COLOR[m.k]))))),
        h('div.fuel-foot',
          h('button.link.fuel-link', { onclick: () => push(() => microsScreen(viewDate)) }, `Fuel score ${fuelScore(t, g) ?? '–'}`, h('span.muted', ' · nutrients'), icon('back', 14)),
          h('button.link.fuel-link', { onclick: () => push(reportScreen) }, 'Report', icon('back', 14)))),

      h('div.log-bar',
        h('button.log-main', { onclick: () => addFood({ date: viewDate }) }, icon('search', 18), 'Log food'),
        h('button.log-side', { onclick: () => scanBarcode((f) => amountSheet({ food: f, date: viewDate })), 'aria-label': 'Scan a barcode' }, icon('scan', 20)),
        h('button.log-side', { onclick: () => quickAdd({ date: viewDate }), 'aria-label': 'Quick add' }, icon('bolt', 20))),

      waterRow(viewDate),
      viewDate === ymd() ? coachLine() : null,

      MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal.id);
        const kcal = list.reduce((n, e) => n + (e.n.kcal || 0), 0);
        if (!list.length) return h('div.meal-empty',
          h('span.meal-name', meal.name),
          h('button.icon-btn', { onclick: () => mealMenu(meal, list, viewDate), 'aria-label': `${meal.name} options` }, icon('more', 20)),
          h('button.icon-btn.gold-text', { onclick: () => addFood({ date: viewDate, meal: meal.id }), 'aria-label': `Add to ${meal.name}` }, icon('plus', 20)));
        return h('section.card.meal-card',
          h('div.meal-head',
            h('span.meal-name', meal.name),
            h('span.meal-kcal', `${r0(kcal)} kcal`),
            h('button.icon-btn', { onclick: () => mealMenu(meal, list, viewDate), 'aria-label': `${meal.name} options` }, icon('more', 20))),
          list.map((e) => h('button.food-line', { onclick: () => editEntry(e) },
            h('span.food-ico', foodIcon((e.foodId && food(e.foodId)?.icon) || e.icon || (e.quick ? '⚡' : '🍽️'))),
            h('span.food-text', h('span.food-name', e.name), h('span.food-sub', e.quick ? `${e.note ? e.note + ' · ' : ''}P ${r0(e.n.p)} · C ${r0(e.n.c)} · F ${r0(e.n.f)} g` : amountText(e))),
            h('span.food-kcal', r0(e.n.kcal)))),
          h('button.meal-add', { onclick: () => addFood({ date: viewDate, meal: meal.id }) }, icon('plus', 16), `Add to ${meal.name.toLowerCase()}`));
      }),
      dayDone(viewDate, entries.length, draw),
      h('div.bottom-space'),
    );
  }

  draw();
  el.append(body);
  return { el, refresh: draw, onShow: draw };
}

// ---------- "I logged everything" ----------

/** Mark a day fully tracked: the diet coach and trends trust it, even if it looks unusual. */
function dayDone(k, n, redraw) {
  if (k > ymd()) return null;
  const on = !!state.food.keep?.[k];
  if (!n && !on) return null;
  return h('div.day-done-wrap',
    h('button.day-done' + (on ? '.on' : ''), {
      'aria-pressed': String(on),
      onclick: () => { setDayCheck(k, on ? null : 'keep'); if (!on) { navigator.vibrate?.(15); toast('Marked as fully tracked'); } redraw(); },
    }, h('span.day-done-box', on ? icon('check', 16) : null), h('span', on ? `${k === ymd() ? 'Today' : 'This day'} is fully tracked` : `I logged everything ${k === ymd() ? 'today' : 'this day'}`)),
    h('p.fine.day-done-note', on ? 'The diet coach counts this day as complete.' : 'Tick it once the day’s food is all in. The diet coach trusts days you tick.'));
}

// ---------- The week ----------

/** Mon–Sun of the week you're viewing: a dot per day. Gold = hit, red = over, outline = logged but short. */
function weekDots(key, go) {
  const d0 = new Date(key + 'T12:00'), mon = addDays(key, -((d0.getDay() + 6) % 7)), today = ymd();
  return h('div.wdots', Array.from({ length: 7 }, (_, i) => {
    const k = addDays(mon, i), t = dayTotals(k);
    const look = k > today ? 'future' : !t.entries ? 'none' : kcalLook(t.kcal, dayGoals(k).kcal, k) || 'short';
    return h('button.wdot' + (k === key ? '.on' : '') + (state.food.keep?.[k] && t.entries ? '.full' : ''), { onclick: () => go(k), 'aria-label': `${dayLabel(k)}: ${look === 'hit' ? 'goal hit' : look === 'over' ? 'over' : look === 'short' ? `${r0(t.kcal)} kcal` : 'nothing logged'}` },
      h('span', 'MTWTFSS'[i]), h('i.' + look));
  }));
}

// ---------- The calorie ring, water ----------

/** Calories as a ring, with what's left (or over) in the middle. */
function calRing(eaten, goal, left, over, soft) {
  const R = 44, C = 2 * Math.PI * R, pct = goal ? Math.min(1, eaten / goal) : 0;
  const el = h('div.plate', { role: 'img', 'aria-label': `${r0(eaten)} of ${r0(goal)} kcal` });
  el.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--line)" stroke-width="8"/>
    ${pct > 0 ? `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${over ? 'var(--red)' : 'var(--gold)'}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/>` : ''}</svg>`;
  el.append(h('div.plate-mid',
    h('b' + (over ? '.over' : ''), Math.abs(r0(left)).toLocaleString()),
    h('span', left < 0 ? (soft ? 'over · goal hit' : 'kcal over') : 'kcal left'),
    h('small', `${r0(eaten).toLocaleString()} of ${r0(goal).toLocaleString()}`)));
  return el;
}

/** Water: a glass that fills, the amount, a drop per 250 ml (tap one to set it), and +250. */
function waterRow(date) {
  const ml = waterOn(date), goal = state.goals.water || 2500;
  const pct = Math.min(1, ml / goal), n = Math.min(12, Math.max(4, Math.round(goal / 250))), full = Math.floor(ml / 250);
  const L = (v) => +(v / 1000).toFixed(2);
  return h('section.card.wtr' + (ml >= goal ? '.done' : ''),
    h('div.wtr-glass', { 'aria-hidden': 'true' }, h('i', { style: { height: `${pct * 100}%` } })),
    h('div.wtr-mid',
      h('div.wtr-top', h('b', `${L(ml)} L`), h('span', ml >= goal ? ' · goal hit' : ` of ${L(goal)} L`)),
      h('div.wtr-drops', Array.from({ length: n }, (_, i) => h('button.wtr-drop' + (i < full ? '.on' : ''), {
        onclick: () => addWater(date, (i + 1) * 250 === ml ? -250 : (i + 1) * 250 - ml), 'aria-label': `Set water to ${L((i + 1) * 250)} L`,
      })))),
    h('div.wtr-btns',
      h('button.wtr-add', { onclick: () => addWater(date, 250), 'aria-label': 'Add 250 ml of water' }, '+250 ml'),
      h('button.wtr-add.minus', { onclick: () => addWater(date, -250), disabled: !ml, 'aria-label': 'Remove 250 ml of water' }, '−250 ml')));
}

// ---------- Fuel score ----------

/** Micronutrients with a daily target: how much of them, on average, you've covered (0–1). */
function microCover(t) {
  const list = MICROS.filter((m) => m.target && !m.max);
  return list.reduce((n, m) => n + Math.min(1, (t[m.k] || 0) / m.target), 0) / list.length;
}

/** Fuel score, 0–100: calories near the goal, protein hit, fiber, and micronutrient coverage. */
export function fuelScore(t, g = state.goals) {
  if (!t.entries) return null;
  const kcalPart = g.kcal ? Math.max(0, 1 - Math.abs(t.kcal - g.kcal) / (g.kcal * 0.25)) : 0;
  const pPart = g.p ? Math.min(1, t.p / g.p) : 0;
  const fibPart = Math.min(1, (t.fib || 0) / 30);
  return Math.round(kcalPart * 35 + pPart * 30 + fibPart * 15 + microCover(t) * 20);
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
