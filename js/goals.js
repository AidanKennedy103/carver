// Goals: calories and macros, workouts per week, and your own daily goals
// (water, steps, anything). These drive the rings on Home.

import { h, icon, sheet, toast, promptBox, confirmBox } from './ui.js';
import { state, commit, uid, ymd } from './store.js';

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

export function openGoals() {
  const g = state.goals;
  const field = (label, key, unit, step = 1) => {
    const input = h('input.field.goal-input', { value: g[key] ?? '', inputmode: 'decimal', 'aria-label': label });
    // Save when you leave the field (saving on every keystroke redraws the whole app)
    input.addEventListener('change', () => { const v = num(input.value); if (v != null && v >= 0) { commit((s) => { s.goals[key] = Math.round(v / step) * step; }); hint(); } });
    return h('label.goal-row', h('span', label), h('span.goal-field', input, h('span.goal-unit', unit)));
  };
  const hintEl = h('p.fine');
  const hint = () => {
    const k = Math.round(g.p * 4 + g.c * 4 + g.f * 9);
    hintEl.textContent = `Your macros add up to ${k.toLocaleString()} kcal (protein and carbs 4 kcal/g, fat 9 kcal/g).` +
      (Math.abs(k - g.kcal) > 100 ? ` That's ${Math.abs(k - g.kcal).toLocaleString()} ${k > g.kcal ? 'over' : 'under'} your calorie goal.` : '');
  };
  hint();

  const wkSeg = h('div.segment', [1, 2, 3, 4, 5, 6, 7].map((n) => h('button' + (g.workoutsPerWeek === n ? '.on' : ''), {
    onclick: (e) => { commit((s) => { s.goals.workoutsPerWeek = n; }); wkSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, n)));

  const customList = h('div.group');
  const drawCustom = () => {
    customList.replaceChildren(
      ...state.goals.custom.map((c) => h('div.group-row',
        h('span', `${c.name}`, h('span.muted', ` · ${c.target} ${c.unit}`)),
        h('button.icon-btn', {
          'aria-label': 'Delete goal',
          onclick: async () => {
            if (!(await confirmBox(`Delete “${c.name}”?`, null, { ok: 'Delete', danger: true }))) return;
            commit((s) => { s.goals.custom = s.goals.custom.filter((x) => x.id !== c.id); });
            drawCustom();
          },
        }, icon('trash', 18)))),
      state.goals.custom.length < 2 ? h('button.group-row.gold-text', { onclick: addCustom }, h('span', '+ Add a daily goal')) : null,
    );
  };
  async function addCustom() {
    const name = await promptBox('Daily goal', '', { placeholder: 'e.g. Water, Steps, Stretch' });
    if (!name) return;
    const target = num(await promptBox(`Daily target for ${name}`, '8', { inputmode: 'decimal', placeholder: 'e.g. 8' }));
    if (!target) { toast('Enter a number'); return; }
    const unit = (await promptBox('Unit', 'glasses', { placeholder: 'glasses, steps, min…' })) || '';
    commit((s) => { s.goals.custom.push({ id: uid(), name, target, unit }); });
    drawCustom();
  }
  drawCustom();

  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Goals'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('label.form-label', 'Daily food'),
    h('div.group', field('Calories', 'kcal', 'kcal', 10), field('Protein', 'p', 'g'), field('Carbs', 'c', 'g'), field('Fat', 'f', 'g')),
    hintEl,
    h('label.form-label', 'Workouts per week'), wkSeg,
    h('p.fine', 'Hit this and the week turns gold on your calendar.'),
    h('label.form-label', 'Your own daily goals (up to 2)'), customList,
    h('p.fine', 'Each one gets its own ring on Home. Tap the ring row to log it.'),
  ));
}

/** Add to today's amount for a custom goal. */
export function logCustom(goalId, amount, date = ymd()) {
  commit((s) => {
    s.checks[date] = s.checks[date] || {};
    s.checks[date][goalId] = Math.max(0, (s.checks[date][goalId] || 0) + amount);
  });
}
export const customAmount = (goalId, date = ymd()) => state.checks[date]?.[goalId] || 0;
