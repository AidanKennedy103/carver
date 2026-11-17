// Copy or move logged food: a whole meal, or the foods you tick, to any meal
// on the same day, today or tomorrow.

import { h, fill, sheet, toast, fmtDate } from './ui.js';
import { commit, ymd, addDays, logFood } from './store.js';
import { MEALS, mealName, r0 } from './food-util.js';

/** A fresh diary entry from an old one, on another day and meal. */
export const copyEntry = (e, date, meal) => { const { id, ts, ...rest } = e; return { ...rest, date, meal, n: { ...e.n } }; };

const dayName = (k) => (k === ymd() ? 'Today' : k === addDays(ymd(), 1) ? 'Tomorrow' : k === addDays(ymd(), -1) ? 'Yesterday' : fmtDate(new Date(k + 'T12:00:00').getTime()));

/** The copy/move sheet. `list` is the entries to offer (all ticked to start), all from day `from`. */
export function copySheet(list, from, { title } = {}) {
  const fromMeal = list[0]?.meal;
  const days = [...new Set([from, ymd(), addDays(ymd(), 1)])];
  let day = from < ymd() ? ymd() : from;
  let meal = day === from && list.every((e) => e.meal === fromMeal) ? null : fromMeal;   // same day: pick a different meal
  const picked = new Set(list.map((e) => e.id));

  const body = h('div');
  const draw = () => {
    const chosen = list.filter((e) => picked.has(e.id));
    const kcal = r0(chosen.reduce((n, e) => n + (e.n.kcal || 0), 0));
    const sameSpot = day === from && chosen.every((e) => e.meal === meal);
    fill(body,
      list.length > 1 ? h('div.card.list-card.copy-list', list.map((e) => h('button.copy-item' + (picked.has(e.id) ? '.on' : ''), {
        onclick: () => { if (picked.has(e.id)) picked.delete(e.id); else picked.add(e.id); draw(); },
        'aria-pressed': String(picked.has(e.id)),
      }, h('span.copy-box', picked.has(e.id) ? '✓' : ''), h('span.copy-name', e.name), h('span.food-kcal', r0(e.n.kcal))))) : null,
      h('label.form-label', 'Day'),
      h('div.segment', days.map((k) => h('button' + (day === k ? '.on' : ''), { onclick: () => { day = k; draw(); } }, dayName(k)))),
      h('label.form-label', 'Meal'),
      h('div.segment', MEALS.map((m) => h('button' + (meal === m.id ? '.on' : ''), { onclick: () => { meal = m.id; draw(); } }, m.name))),
      h('div.copy-btns',
        h('button.btn.gold.wide', { disabled: !chosen.length || !meal, onclick: () => go(chosen, false) }, chosen.length ? `Copy${chosen.length > 1 ? ` ${chosen.length} foods` : ''} (${kcal.toLocaleString()} kcal)` : 'Pick some food'),
        h('button.btn.dark.wide', { disabled: !chosen.length || !meal || sameSpot, onclick: () => go(chosen, true) }, 'Move instead')),
    );
  };
  function go(chosen, move) {
    const where = `${day === ymd() ? 'today’s' : dayName(day) + '’s'} ${mealName(meal).toLowerCase()}`;
    const ids = new Set(chosen.map((e) => e.id));
    if (move) commit((st) => { for (const e of st.food.log) if (ids.has(e.id)) { e.date = day; e.meal = meal; } });
    else chosen.forEach((e) => logFood(copyEntry(e, day, meal)));
    s.close();
    toast(`${move ? 'Moved' : 'Copied'} ${chosen.length === 1 ? chosen[0].name : `${chosen.length} foods`} to ${where}`);
  }
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', title || 'Copy food'), h('span')),
    body));
}
