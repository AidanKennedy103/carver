// Goals: calories and macros, workouts per week, and your own daily goals
// (water, steps, anything). These drive the rings on Home.

import { h, fill, icon, sheet, toast, promptBox, confirmBox } from './ui.js';
import { state, commit, uid, ymd, toDisplay, unit } from './store.js';
import { num } from './food-util.js';

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
    h('button.btn.gold-soft.wide.suggest-btn', { onclick: () => { s.close(); suggestGoals(); } }, '✨ Suggest goals for me'),
    h('div.group', field('Calories', 'kcal', 'kcal', 10), field('Protein', 'p', 'g'), field('Carbs', 'c', 'g'), field('Fat', 'f', 'g')),
    hintEl,
    h('label.form-label', 'Workouts per week'), wkSeg,
    h('p.fine', 'Hit this and the week turns gold on your calendar.'),
    h('label.form-label', 'Your own daily goals (up to 2)'), customList,
    h('p.fine', 'Each one gets its own ring on Home. Tap the ring row to log it.'),
  ));
}

// ---------- Suggested food goals ----------

const AIMS = [
  { id: 'cut', name: 'Lose fat', kcal: -450, note: 'about 0.5 kg (1 lb) a week' },
  { id: 'maintain', name: 'Maintain', kcal: 0, note: 'stay where you are' },
  { id: 'build', name: 'Build muscle', kcal: 250, note: 'a slow, lean gain' },
];

/** Calories from your maintenance estimate (or a rough one from your weight), protein from your weight. */
export async function suggestion(aim) {
  const [{ metabolism }, { latestWeight }] = await Promise.all([import('./trends.js'), import('./body.js')]);
  const m = metabolism(28);
  const kg = latestWeight()?.kg || null;
  const base = m.ready ? m.tdee : kg ? kg * 2.20462 * 15 : null;   // ~15 kcal per lb is a common rough start
  if (!base) return null;
  const kcal = Math.round((base + aim.kcal) / 10) * 10;
  const p = Math.round(kg ? Math.min(kg * 2.2, (kcal * 0.4) / 4) : (kcal * 0.3) / 4);   // ~1 g per lb, capped at 40% of calories
  const f = Math.round((kcal * 0.27) / 9);
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { kcal, p, c, f, from: m.ready ? `your maintenance estimate (${Math.round(m.tdee).toLocaleString()} kcal, ${m.confidence.toLowerCase()} confidence)` : `your weight (a rough start: about 15 kcal per lb; Trends sharpens this after 10 days of logging)`, kg };
}

async function suggestGoals() {
  let aim = AIMS[1];
  const box = h('div');
  const draw = async () => {
    const sug = await suggestion(aim);
    fill(box,
      h('div.segment', AIMS.map((a) => h('button' + (a.id === aim.id ? '.on' : ''), { onclick: () => { aim = a; draw(); } }, a.name))),
      h('p.fine', aim.note[0].toUpperCase() + aim.note.slice(1) + '.'),
      sug ? [
        h('div.group',
          [['Calories', sug.kcal, 'kcal'], ['Protein', sug.p, 'g'], ['Carbs', sug.c, 'g'], ['Fat', sug.f, 'g']].map(([l, v, u]) => h('div.goal-row', h('span', l), h('span.row-val', `${v.toLocaleString()} ${u}`)))),
        h('p.fine', `Calories come from ${sug.from}. Protein is about 1 g per lb of body weight${sug.kg ? ` (${toDisplay(sug.kg)} ${unit()})` : ''}, fat about 27% of calories, and carbs fill the rest.`),
        h('button.btn.gold.wide', { onclick: () => { commit((st) => { Object.assign(st.goals, { kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f }); }); s.close(); toast('Goals updated'); } }, 'Use these goals'),
      ] : h('p.fine', 'Log your weight first (Home → Progress), and Carver can suggest goals.'),
    );
  };
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Suggested goals'), h('span')),
    box));
  draw();
}

/** Add to today's amount for a custom goal. */
export function logCustom(goalId, amount, date = ymd()) {
  commit((s) => {
    s.checks[date] = s.checks[date] || {};
    s.checks[date][goalId] = Math.max(0, (s.checks[date][goalId] || 0) + amount);
  });
}
export const customAmount = (goalId, date = ymd()) => state.checks[date]?.[goalId] || 0;
