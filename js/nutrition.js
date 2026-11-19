// Nutrition: Carver's fuel log. A plate ring (calories, and how they split across
// protein, carbs and fat), every macro as eaten and left, a daily Fuel score, the
// nutrients that matter most for training, and meals as cards. The food picker,
// quick add, recipes and reports live in their own files.

import { h, fill, icon, push, toast, actionSheet, confirmBox, promptBox, navBar, swipe } from './ui.js';
import { state, commit, uid, ymd, addDays, dayStart, dayLog, dayTotals, food, logFood, deleteLog, waterOn, addWater, kcalLook, foodAim, dayPlan, dayGoals } from './store.js';
import { MACROS, MICROS } from './foods.js';
import { latestWeight } from './body.js';
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
      swipe(weekStrip(viewDate, (k) => { viewDate = k; draw(); }), { left: () => go(7), right: () => go(-7), target: () => body.querySelector('.week-strip') }),

      // The plate: calories and the macro split, then every macro as eaten and left
      h('section.card.fuel',
        h('div.fuel-top',
          plateRing(t, g.kcal, left < 0 && !soft),
          h('div.fuel-side',
            h('div.fuel-stat', h('span.fuel-k', 'Eaten'), h('span.fuel-v', r0(t.kcal).toLocaleString())),
            h('div.fuel-stat', h('span.fuel-k', left < 0 ? (soft ? 'Over · goal hit' : 'Over') : foodAim() === 'build' ? 'To go' : 'Left'),
              h('span.fuel-v' + (left < 0 ? (soft ? '.soft' : '.over') : ''), Math.abs(r0(left)).toLocaleString())),
            h('div.fuel-stat', h('span.fuel-k', g.kcal !== state.goals.kcal ? 'Training goal' : 'Goal'), h('span.fuel-v.dim', r0(g.kcal).toLocaleString())))),
        h('div.fuel-macros', MACROS.map((m) => {
          const rest = g[m.k] - t[m.k];
          return h('div.fm',
            h('div.fm-name', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), m.name),
            h('div.fm-eaten', r0(t[m.k]), h('small', ` / ${g[m.k]} g`)),
            bar(t[m.k], g[m.k], MACRO_COLOR[m.k]),
            h('div.fm-left' + (rest < 0 ? '.over' : ''), rest >= 0 ? `${r0(rest)} g left` : `${r0(-rest)} g over`));
        })),
        fuelNote(t, viewDate)),

      // Fuel score and the nutrients that matter most
      fuelStrip(t, viewDate),


      h('div.log-bar',
        h('button.log-main', { onclick: () => addFood({ date: viewDate }) }, icon('search', 18), 'Log food'),
        h('button.log-side', { onclick: () => scanBarcode((f) => amountSheet({ food: f, date: viewDate })), 'aria-label': 'Scan a barcode' }, icon('scan', 20)),
        h('button.log-side', { onclick: () => quickAdd({ date: viewDate }), 'aria-label': 'Quick add' }, icon('bolt', 20))),

      waterCard(viewDate),

      MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal.id);
        const kcal = list.reduce((n, e) => n + (e.n.kcal || 0), 0);
        const mk = sumOf(list, 'p') * 4 + sumOf(list, 'c') * 4 + sumOf(list, 'f') * 9;
        return h('section.card.meal-card' + (list.length ? '' : '.empty'),
          h('div.meal-head',
            h('span.meal-name', meal.name,
              list.length ? h('span.meal-macros', `P ${r0(sumOf(list, 'p'))} · C ${r0(sumOf(list, 'c'))} · F ${r0(sumOf(list, 'f'))} g`) : null),
            h('span.meal-kcal', list.length ? `${r0(kcal)} kcal` : ''),
            h('button.icon-btn', { onclick: () => mealMenu(meal, list, viewDate), 'aria-label': `${meal.name} options` }, icon('more', 20))),
          mk ? h('div.split-bar.meal-split', MACROS.map((m) => h('i', { style: { width: ((sumOf(list, m.k) * m.kcal) / mk) * 100 + '%', background: MACRO_COLOR[m.k] } }))) : null,
          list.map((e) => h('button.food-line', { onclick: () => editEntry(e) },
            h('span.food-ico', foodIcon((e.foodId && food(e.foodId)?.icon) || e.icon || (e.quick ? '⚡' : '🍽️'))),
            h('span.food-text', h('span.food-name', e.name), h('span.food-sub', e.quick ? `${e.note ? e.note + ' · ' : ''}P ${r0(e.n.p)} · C ${r0(e.n.c)} · F ${r0(e.n.f)} g` : amountText(e))),
            h('span.food-kcal', r0(e.n.kcal)))),
          h('button.meal-add', { onclick: () => addFood({ date: viewDate, meal: meal.id }) }, icon('plus', 16), `Add to ${meal.name.toLowerCase()}`));
      }),
      h('div.bottom-space'),
    );
  }

  draw();
  el.append(body);
  return { el, refresh: draw };
}

// ---------- The plate, the Fuel score and key nutrients ----------

/** Ring: calories against the goal; inside, the plate split into protein, carbs and fat by calories. */
function plateRing(t, goal, over) {
  const R = 44, C = 2 * Math.PI * R, pct = goal ? Math.min(1, t.kcal / goal) : 0;
  const kTot = t.p * 4 + t.c * 4 + t.f * 9;
  let a = -Math.PI / 2, slices = '';
  if (kTot) for (const m of MACROS) {
    const share = (t[m.k] * m.kcal) / kTot, a1 = a + share * 2 * Math.PI;
    if (share > 0.999) slices += `<circle cx="60" cy="60" r="31" fill="${MACRO_COLOR[m.k]}"/>`;
    else if (share > 0) slices += `<path d="M60 60L${60 + 31 * Math.cos(a)} ${60 + 31 * Math.sin(a)}A31 31 0 ${share > 0.5 ? 1 : 0} 1 ${60 + 31 * Math.cos(a1)} ${60 + 31 * Math.sin(a1)}Z" fill="${MACRO_COLOR[m.k]}" stroke="#141414" stroke-width="2"/>`;
    a = a1;
  }
  const el = h('div.plate', { role: 'img', 'aria-label': `${r0(t.kcal)} of ${r0(goal)} kcal` });
  el.innerHTML = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="#26262a" stroke-width="9"/>
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="${over ? 'var(--red)' : 'var(--gold)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>
    ${kTot ? slices : '<circle cx="60" cy="60" r="31" fill="#1c1c1f"/>'}
    <circle cx="60" cy="60" r="17" fill="#141414"/></svg>`;
  el.append(h('div.plate-pct', `${Math.round(pct * 100)}%`));
  return el;
}

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

/** One line of advice for the day, aware of training. */
function fuelNote(t, date) {
  const trained = state.workouts.some((w) => ymd(w.start) === date);
  const training = trained || dayPlan(date) === 'planned';
  const kg = latestWeight()?.kg;
  const perKg = kg ? t.p / kg : null;
  const pLeft = dayGoals(date).p - t.p;
  let text = null;
  if (!t.entries) text = training ? 'Training day. Protein and carbs help you recover.' : null;
  else if (pLeft > 0 && date === ymd()) text = `${r0(pLeft)} g protein to go${training ? ' on a training day' : ''}${perKg ? ` · ${perKg.toFixed(1)} g per kg so far` : ''}.`;
  else if (perKg) text = `Protein ${perKg.toFixed(1)} g per kg of body weight${perKg >= 1.6 ? ': right where muscle grows best.' : '.'}`;
  return text ? h('div.fuel-note', training ? h('span.fuel-tag', trained ? 'Trained' : 'Training day') : null, h('span', text)) : null;
}

/** Fuel score plus fiber, sodium, sugar and micronutrients, each a tap from the full list. */
function fuelStrip(t, date) {
  const score = fuelScore(t, dayGoals(date));
  const cover = microCover(t);
  const na = MICROS.find((m) => m.k === 'na');
  const tile = (label, value, sub, tone = '') => h('button.ks' + (tone ? '.' + tone : ''), { onclick: () => push(() => microsScreen(date)) },
    h('span.ks-v', value), h('span.ks-k', label), sub ? h('span.ks-sub', sub) : null);
  return h('div.key-strip',
    h('button.ks.score', { onclick: () => push(reportScreen) },
      h('span.ks-v', score == null ? '–' : score), h('span.ks-k', 'Fuel score'), h('span.ks-sub', score == null ? 'Log food' : score >= 80 ? 'Great' : score >= 60 ? 'Good' : 'Building')),
    tile('Fiber', `${r0(t.fib || 0)} g`, `of 30`, (t.fib || 0) >= 30 ? 'good' : ''),
    tile('Sodium', `${(t.na || 0) >= 1000 ? ((t.na || 0) / 1000).toFixed(1) + ' g' : r0(t.na || 0) + ' mg'}`, (t.na || 0) > na.max ? 'over limit' : 'under 2.3 g', (t.na || 0) > na.max ? 'bad' : ''),
    tile('Sugar', `${r0(t.sug || 0)} g`, null),
    tile('Micros', `${Math.round(cover * 100)}%`, 'covered', cover >= 0.8 ? 'good' : ''));
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
