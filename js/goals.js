// Goals: calories and macros, workouts per week, and your own daily goals
// (water, steps, anything). These drive the rings on Home.

import { h, fill, icon, sheet, toast, promptBox, confirmBox, push } from './ui.js';
import { state, commit, uid, ymd, bodyDisplay, bodyFromDisplay, bodyUnit, distUnit, tabOn, DAY_SHORT, foodAim, wtypes, addType } from './store.js';
import { num } from './food-util.js';
import { habits, MAX_HABITS } from './habits.js';

export function openGoals(section = 'all') {
  const g = state.goals;
  const field = (label, key, unit, step = 1) => {
    const input = h('input.field.goal-input', { value: g[key] ?? '', inputmode: 'decimal', 'aria-label': label });
    // Save when you leave the field (saving on every keystroke redraws the whole app)
    input.addEventListener('change', () => { const v = num(input.value); if (v != null && v >= 0) commit((s) => { s.goals[key] = Math.round(v / step) * step; }); });
    return h('label.goal-row', h('span', label), h('span.goal-field', input, h('span.goal-unit', unit)));
  };

  // Calories and the three macros are tied (protein and carbs 4 kcal/g, fat 9): type any
  // three and the one you touched longest ago fills itself in, rounded to a whole number.
  const KCAL = { p: 4, c: 4, f: 9 };
  const energy = {}, order = ['c', 'f', 'p', 'kcal'];   // oldest first: carbs fills in until you choose otherwise
  const energyField = (label, key, unit) => {
    const input = h('input.field.goal-input', { value: g[key] ?? '', inputmode: 'decimal', 'aria-label': label });
    const tag = h('span.auto-tag', 'auto');
    input.addEventListener('input', () => { order.splice(order.indexOf(key), 1); order.push(key); balance(); });
    input.addEventListener('change', save);
    input.addEventListener('focus', () => input.select());
    energy[key] = { input, tag, row: h('label.goal-row', h('span', label, tag), h('span.goal-field', input, h('span.goal-unit', unit))) };
    return energy[key].row;
  };
  const val = (k) => Math.max(0, num(energy[k].input.value) || 0);
  function balance(apply = true) {
    const auto = order[0];
    let v;
    if (auto === 'kcal') v = val('p') * 4 + val('c') * 4 + val('f') * 9;
    else v = (val('kcal') - Object.keys(KCAL).filter((m) => m !== auto).reduce((n, m) => n + val(m) * KCAL[m], 0)) / KCAL[auto];
    if (apply) energy[auto].input.value = Math.max(0, Math.round(v));
    for (const k of Object.keys(energy)) energy[k].row.classList.toggle('auto', k === auto);
    const over = apply && auto !== 'kcal' && v < 0;
    hintEl.textContent = over
      ? 'Those macros already add up to more than your calories. Raise calories or lower a macro.'
      : `${{ kcal: 'Calories', p: 'Protein', c: 'Carbs', f: 'Fat' }[auto]} fills itself in from the other three (protein and carbs are 4 kcal per gram, fat 9).`;
    hintEl.classList.toggle('red-text', over);
  }
  function save() {
    balance();
    commit((s) => { for (const k of Object.keys(energy)) s.goals[k] = Math.round(val(k) / (k === 'kcal' ? 10 : 1)) * (k === 'kcal' ? 10 : 1); });
  }
  const hintEl = h('p.fine');

  // Workouts per week, and (optional) which days. Picking days sets the number;
  // picking a different number clears the days.
  const wkSeg = h('div.segment');
  const dayRow = h('div.day-pick');
  const dayHint = h('p.fine');
  function drawWeek() {
    const n = state.goals.workoutsPerWeek, days = state.goals.workoutDays || [];
    fill(wkSeg, [1, 2, 3, 4, 5, 6, 7].map((k) => h('button' + (n === k ? '.on' : ''), {
      onclick: () => { commit((st) => { st.goals.workoutsPerWeek = k; if ((st.goals.workoutDays || []).length !== k) st.goals.workoutDays = []; }); drawWeek(); },
    }, k)));
    fill(dayRow, DAY_SHORT.map((d, i) => h('button' + (days.includes(i) ? '.on' : ''), {
      'aria-label': d, 'aria-pressed': String(days.includes(i)),
      onclick: () => {
        commit((st) => {
          const cur = st.goals.workoutDays || [];
          st.goals.workoutDays = (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]).sort();
          if (st.goals.workoutDays.length) st.goals.workoutsPerWeek = st.goals.workoutDays.length;
        });
        drawWeek();
      },
    }, d[0])));
    dayHint.textContent = days.length
      ? `${days.map((i) => DAY_SHORT[i]).join(', ')}. Home shows rest days, and the calendar marks the days you planned.`
      : 'Optional. Pick days and Home shows which are workout days and which are rest days. Leave them off to train any day.';
  }
  drawWeek();

  // Your own workout types (Physio…): how many times a week each, apart from the gym goal
  const typeBox = h('div.goal-types');
  function drawTypes() {
    fill(typeBox,
      wtypes().map((t) => [
        h('label.form-label', h('i.type-dot', { style: { background: t.color } }), `${t.name} per week`),
        h('div.segment', [1, 2, 3, 4, 5, 6, 7].map((k) => h('button' + ((t.perWeek || 3) === k ? '.on' : ''), {
          onclick: () => { commit((st) => { const x = st.settings.wtypes.find((y) => y.id === t.id); if (x) x.perWeek = k; }); drawTypes(); },
        }, k)))]),
      wtypes().length ? h('p.fine', 'Counted on their own goal tiles; they don’t count toward your gym workouts.') : null,
      h('button.link.goal-add-type', { onclick: async () => {
        const n = (await promptBox('New workout type', '', { placeholder: 'e.g. Physio, Mobility, Core' }))?.trim();
        if (!n) return;
        if (wtypes().some((t) => t.name.toLowerCase() === n.toLowerCase())) { toast(`You already have ${n}`); return; }
        addType(n); drawTypes(); drawWkLabel();
      } }, icon('plus', 15), wtypes().length ? 'Another workout type' : 'Add a workout type (physio, mobility…)'));
  }
  drawTypes();
  const wkLabel = h('label.form-label');
  const drawWkLabel = () => { wkLabel.textContent = wtypes().length ? 'Gym workouts per week' : 'Workouts per week'; };
  drawWkLabel();

  // Your aim decides how calories off target look: over is fine while building, under while cutting
  const aimSeg = h('div.segment');
  const drawAim = () => fill(aimSeg, AIMS.map((a) => h('button' + (foodAim() === a.id ? '.on' : ''), { onclick: () => { commit((st) => { st.goals.aim = a.id; }); drawAim(); } }, a.name)));
  drawAim();

  const customList = h('div.group');
  const drawCustom = () => {
    const list = habits();
    fill(customList,
      list.map((c) => h('div.group-row',
        h('button.habit-name', { onclick: () => renameHabit(c), 'aria-label': `Rename ${c.name}` }, c.name),
        h('button.icon-btn', {
          'aria-label': `Delete ${c.name}`,
          onclick: async () => {
            if (!(await confirmBox(`Delete “${c.name}”?`, 'Your groups stop hearing about it. Past days stay in your history.', { ok: 'Delete', danger: true }))) return;
            commit((s) => { s.goals.custom = s.goals.custom.filter((x) => x.id !== c.id); });
            drawCustom();
          },
        }, icon('trash', 18)))),
      list.length < MAX_HABITS ? h('button.group-row.gold-text', { onclick: addCustom }, h('span', '+ Add a daily goal')) : null,
    );
  };
  async function addCustom() {
    const name = (await promptBox('Daily goal', '', { placeholder: 'e.g. 50 pushups, Read 10 pages' }))?.trim();
    if (!name) return;
    commit((s) => { s.goals.custom.push({ id: uid(), name: name.slice(0, 40), since: ymd() }); });
    drawCustom();
  }
  async function renameHabit(c) {
    const name = (await promptBox('Rename', c.name))?.trim();
    if (!name) return;
    commit((s) => { const x = s.goals.custom.find((y) => y.id === c.id); if (x) x.name = name.slice(0, 40); });
    drawCustom();
  }
  drawCustom();

  // Fitness (runs, rides, cardio): weekly targets, 0 = no goal. Distance is stored in metres.
  const dKm = distUnit() === 'km' ? 1000 : 1609.344;
  const fitField = (label, key, u, toShow = (v) => v, fromShow = (v) => v) => {
    const input = h('input.field.goal-input', { value: g[key] ? toShow(g[key]) : '', placeholder: 'none', inputmode: 'decimal', 'aria-label': label });
    input.addEventListener('change', () => { const v = num(input.value); commit((st) => { st.goals[key] = v > 0 ? fromShow(v) : 0; }); });
    return h('label.goal-row', h('span', label), h('span.goal-field', input, h('span.goal-unit', u)));
  };

  const sections = {
    workout: () => [
      h('div.goal-section', 'Workout'),
      wkLabel, wkSeg,
      h('label.form-label', 'Which days'), dayRow, dayHint,
      typeBox],
    nutrition: () => [
      h('div.goal-section', 'Nutrition'),
      h('label.form-label', 'Your aim'), aimSeg,
      h('p.fine', 'Build muscle: calories are a minimum. Lose fat: a maximum. Maintain: within 10%.'),
      h('label.form-label', 'Daily food'),
      h('button.btn.gold-soft.wide.suggest-btn', { onclick: () => { s.close(); suggestGoals(); } }, 'Suggest goals for me'),
      h('div.group', energyField('Calories', 'kcal', 'kcal'), energyField('Protein', 'p', 'g'), energyField('Carbs', 'c', 'g'), energyField('Fat', 'f', 'g')),
      hintEl,
      h('div.group', field('Extra on training days', 'trainBoost', 'kcal', 25)),
      h('p.fine', 'Added as carbs on days you train or plan to. Leave at 0 to eat the same every day.'),
      h('div.group', field('Water', 'water', 'ml', 50)),
      h('button.btn.dark.wide.dc-goals', { onclick: () => { s.close(); commit((st) => { delete st.settings.dietCoachHidden; }); import('./dietcoach.js').then((m) => push(m.dietCoachScreen)); } }, 'Diet coach: weekly targets from your trend')],
    fitness: () => [
      h('div.goal-section', 'Fitness'),
      h('label.form-label', 'Each week'),
      h('div.group',
        fitField('Activities', 'fitPerWeek', 'per week'),
        fitField('Active time', 'fitMins', 'min'),
        fitField('Distance', 'fitDist', distUnit(), (m) => Math.round((m / dKm) * 10) / 10, (v) => v * dKm)),
      h('label.form-label', 'Each day'),
      h('div.group',
        fitField('Activity points', 'movePts', 'points'),
        fitField('Steps', 'steps', 'steps'),
        fitField('Max heart rate', 'maxHR', 'bpm')),
      h('p.fine', 'Activity points add up steps, cardio and lifting (about 25 for a 30-minute run or 10,000 steps). 10 a day meets the WHO guideline, 20 is very active, 35 is training hard. Max heart rate sets your zones; blank uses the highest from your workouts.')],
    body: () => {
      const wIn = h('input.field.goal-input', { value: g.weight ? bodyDisplay(g.weight) : '', placeholder: 'none', inputmode: 'decimal', 'aria-label': 'Goal weight' });
      wIn.addEventListener('change', () => { const v = num(wIn.value); commit((st) => { st.goals.weight = v > 0 ? bodyFromDisplay(v) : 0; }); });
      return [
        h('div.goal-section', 'Physical Metrics'),
        h('div.group',
          h('label.goal-row', h('span', 'Goal weight'), h('span.goal-field', wIn, h('span.goal-unit', bodyUnit()))),
          field('Goal body fat', 'bodyFat', '%', 0.5)),
        ];
    },
    recovery: () => [
      h('div.goal-section', 'Recovery'),
      h('div.group', field('Sleep each night', 'sleep', 'h', 0.5)),
      h('p.fine', 'Most adults do best on 7–9 hours.')],
    daily: () => [
      h('div.goal-section', 'Daily goals'),
      h('label.form-label', `Your own (up to ${MAX_HABITS})`), customList,
      h('p.fine', 'Slide one on Home when it’s done.')],
  };
  const shown = ['workout', 'nutrition', 'fitness', 'recovery', 'body', 'daily'].includes(section)
    ? [section] : ['workout', 'nutrition', 'fitness', 'recovery', 'body', 'daily'].filter((k) => k === 'daily' || k === 'body' || tabOn(k));
  const titles = { workout: 'Workout goals', nutrition: 'Nutrition goals', fitness: 'Fitness goals', recovery: 'Recovery goals', body: 'Physical Metrics goals', daily: 'Daily goals' };
  const others = ['workout', 'nutrition', 'fitness', 'recovery', 'body'].filter((k) => k !== section && (k === 'body' || tabOn(k)));

  const s = sheet(h('div.form.goals-form' + (shown.length === 1 ? '.one' : ''),
    h('div.sheet-head', h('span'), h('div.sheet-title', titles[section] || 'Goals'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    shown.map((k) => sections[k]()),
    shown.length === 1 ? h('div.goal-others', others.map((k) => h('button.link', { onclick: () => { s.close(); openGoals(k); } }, `${titles[k]} ›`)),
      h('button.link', { onclick: () => { s.close(); openGoals(); } }, 'All goals ›')) : null,
  ));
  if (shown.includes('nutrition')) balance(false);   // show which one fills in, without changing your saved goals
}

/** The Goals button: top right of every main page, opening that page's goals. */
export const goalsButton = (section = 'all') =>
  h('button.nav-goals', { onclick: () => openGoals(section), 'aria-label': section === 'all' ? 'All goals' : `${section[0].toUpperCase() + section.slice(1)} goals` }, icon('target', 16), 'Goals');

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
  return { kcal, p, c, f, from: m.ready ? `your maintenance estimate (${Math.round(m.tdee).toLocaleString()} kcal, ${m.confidence.toLowerCase()} confidence${m.confidence === 'High' ? '' : ', so treat it as a starting point'})` : `your weight (a rough start: about 15 kcal per lb; Trends sharpens this after 10 days of logging)`, kg };
}

async function suggestGoals() {
  let aim = AIMS.find((a) => a.id === foodAim()) || AIMS[1];
  const box = h('div');
  const draw = async () => {
    const sug = await suggestion(aim);
    fill(box,
      h('div.segment', AIMS.map((a) => h('button' + (a.id === aim.id ? '.on' : ''), { onclick: () => { aim = a; draw(); } }, a.name))),
      h('p.fine', aim.note[0].toUpperCase() + aim.note.slice(1) + '.'),
      sug ? [
        h('div.group',
          [['Calories', sug.kcal, 'kcal'], ['Protein', sug.p, 'g'], ['Carbs', sug.c, 'g'], ['Fat', sug.f, 'g']].map(([l, v, u]) => h('div.goal-row', h('span', l), h('span.row-val', `${v.toLocaleString()} ${u}`)))),
        h('p.fine', `Calories come from ${sug.from}. Protein is about 1 g per lb of body weight${sug.kg ? ` (${bodyDisplay(sug.kg)} ${bodyUnit()})` : ''}, fat about 27% of calories, and carbs fill the rest. A starting point, not medical advice.`),
        h('button.btn.gold.wide', { onclick: () => { commit((st) => { Object.assign(st.goals, { kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f, aim: aim.id }); }); s.close(); toast('Goals updated'); } }, 'Use these goals'),
      ] : h('p.fine', 'Log your weight first and Carver can suggest goals.'),
    );
  };
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Suggested goals'), h('span')),
    box));
  draw();
}
