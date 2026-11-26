// "Add exercises" picker: search, filter by muscle, pick several, or create your own.

import { h, fill, icon, sheet, toast, confirmBox } from './ui.js';
import { MUSCLES, EQUIPMENT, musclesText, searchExercises } from './exercises.js';
import { allExercises, addCustomExercise, state, exercise, updateExercise, resetExercise, exerciseUse, deleteCustomExercise } from './store.js';

const TYPE_LABEL = { wr: 'Weight & reps', bw: 'Reps only', time: 'Duration' };

/** Opens the picker. onPick(ids[]) is called with the chosen exercise ids. */
export function pickExercises(onPick, { single = false, title = 'Add exercises', filter = null, max = 99, initial = [], addLabel = 'Add', groups = false } = {}) {
  const chosen = initial.slice();
  let kind = null;   // null (separate), 'superset' or 'circuit': done in the order you tapped them
  let muscle = 'All', query = '';

  const list = h('div.ex-list');
  const addBtn = h('button.btn.gold.wide', { disabled: !initial.length && addLabel === 'Add', onclick: () => { s.close(); onPick(chosen.slice(), chosen.length > 1 ? kind : null); } }, addLabel);
  const groupBox = h('div.pick-group');
  const drawGroup = () => {
    if (!groups || chosen.length < 2) { fill(groupBox); kind = null; return; }
    if (kind === 'superset' && chosen.length > 2) kind = 'circuit';
    const opts = [[null, 'Separate'], ...(chosen.length === 2 ? [['superset', 'Superset']] : []), ['circuit', 'Circuit']];
    fill(groupBox,
      h('div.segment.pick-seg', opts.map(([k, l]) => h('button' + (kind === k ? '.on' : ''), { onclick: () => { kind = k; drawGroup(); label(); } }, l))),
      kind ? h('p.fine.pick-hint', `${kind === 'superset' ? 'Superset' : 'Circuit'}: one set of each, in the order you tapped them (${chosen.map((id) => exercise(id).name).join(' → ')}), then rest.`) : null);
  };
  const label = () => {
    if (addLabel !== 'Add') { addBtn.textContent = `${addLabel} (${chosen.length})`; addBtn.disabled = false; return; }
    addBtn.disabled = !chosen.length;
    addBtn.textContent = !chosen.length ? 'Add' : kind ? `Add as ${kind}` : `Add ${chosen.length} exercise${chosen.length > 1 ? 's' : ''}`;
  };
  const search = h('input.search-input', {
    type: 'search', placeholder: 'Search exercises', autocomplete: 'off', enterkeyhint: 'search',
    oninput: (e) => { query = e.target.value.toLowerCase().trim(); draw(); },
  });
  const chips = h('div.chips.no-drag', ['All', 'One side', ...MUSCLES].map((m) => h('button.chip', {
    onclick: (e) => {
      muscle = m;
      chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === e.currentTarget));
      draw();
    },
    class: m === 'All' ? 'on' : '',
  }, m)));

  // Exercises used recently float to the top when not searching
  const recent = new Map();
  state.workouts.slice(0, 20).forEach((w, i) => w.exercises.forEach((e) => { if (!recent.has(e.exId)) recent.set(e.exId, i); }));

  function draw() {
    let items = allExercises().filter((e) => (!filter || filter(e)) &&
      (muscle === 'All' || (muscle === 'One side' ? e.uni : e.muscle === muscle)));
    if (query) items = searchExercises(query, items);
    if (!query) items = items.slice().sort((a, b) => (recent.get(a.id) ?? 999) - (recent.get(b.id) ?? 999));
    fill(list, 
      ...items.map((e) => {
        const n = chosen.indexOf(e.id);
        return h('button.ex-row' + (n >= 0 ? '.on' : ''), {
          onclick: () => {
            if (single) { s.close(); onPick([e.id]); return; }
            const i = chosen.indexOf(e.id);
            if (i >= 0) chosen.splice(i, 1);
            else if (chosen.length >= max) { toast(`Pick up to ${max}`); return; }
            else chosen.push(e.id);
            drawGroup();
            label();
            draw();
          },
        },
        h('span.ex-badge', e.name[0]),
        h('span.ex-text', h('span.ex-name', e.name), h('span.ex-sub', `${musclesText(e)} · ${e.equipment}${e.uni ? ' · One side' : ''}${e.custom ? ' · Custom' : e.edited ? ' · Edited' : ''}`)),
        n >= 0 ? h('span.ex-num', n + 1) : null,
        h('span.ex-edit', { role: 'button', 'aria-label': `Edit ${e.name}`, onclick: (ev) => { ev.stopPropagation(); createExercise(() => draw(), '', e.id); } }, icon('edit', 15)));
      }),
      items.length ? null : h('div.empty-small', 'No exercises match. Create it below.'),
    );
  }

  const s = sheet(h('div.picker',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', title),
      h('button.link', { onclick: () => createExercise((e) => { if (single) { s.close(); onPick([e.id]); } else { if (chosen.length < max) chosen.push(e.id); label(); draw(); } }, query) }, 'Create')),
    h('div.search-wrap', icon('search', 18), search),
    chips,
    list,
    single ? null : h('div.sheet-foot', groupBox, addBtn),
  ), { full: true });
  label();
  draw();
}

/** Form for a custom exercise, or (editId) for changing any exercise: yours, or one from the library. */
export function createExercise(onDone, name = '', editId = null) {
  const was = editId ? exercise(editId) : null;
  let type = was?.type || 'wr', uni = !!was?.uni;
  const helps = new Set(was?.helps || []);
  const nameIn = h('input.field', { placeholder: 'Exercise name', value: was ? was.name : name ? name[0].toUpperCase() + name.slice(1) : '' });
  const muscleSel = h('select.field', MUSCLES.map((m) => h('option', { value: m, selected: was?.muscle === m }, m)));
  const equipSel = h('select.field', EQUIPMENT.map((m) => h('option', { value: m, selected: was?.equipment === m }, m)));
  const typeSeg = h('div.segment', Object.entries(TYPE_LABEL).map(([k, v]) => h('button' + (k === type ? '.on' : ''), {
    onclick: (e) => { type = k; typeSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, v)));
  const helpChips = h('div.chips.tight.no-drag', MUSCLES.filter((m) => m !== 'Full body' && m !== 'Cardio').map((m) => h('button.chip' + (helps.has(m) ? '.on' : ''), {
    onclick: (e) => { if (helps.has(m)) helps.delete(m); else helps.add(m); e.currentTarget.classList.toggle('on', helps.has(m)); },
  }, m)));
  const uniSeg = h('div.segment', [[false, 'Both at once'], [true, 'One side at a time']].map(([v, l]) => h('button' + (v === uni ? '.on' : ''), {
    onclick: (e) => { uni = v; uniSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, l)));
  const use = editId ? exerciseUse(editId) : null;
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', was ? 'Edit exercise' : 'New exercise'),
      h('button.link.strong', {
        onclick: () => {
          const n = nameIn.value.trim();
          if (!n) { toast('Give it a name'); return; }
          const fields = { name: n, muscle: muscleSel.value, equipment: equipSel.value, type, helps: [...helps].filter((m) => m !== muscleSel.value), ...(uni ? { uni: true } : {}) };
          if (was) { updateExercise(editId, fields); s.close(); toast('Exercise saved'); onDone(exercise(editId)); return; }
          const e = addCustomExercise(fields);
          s.close();
          onDone(e);
        },
      }, 'Save')),
    h('label.form-label', 'Name'), nameIn,
    h('label.form-label', 'Main muscle'), muscleSel,
    h('label.form-label', 'Also works (optional)'), helpChips,
    h('label.form-label', 'Equipment'), equipSel,
    h('label.form-label', 'Arms or legs'), uniSeg,
    h('label.form-label', 'What you log'), typeSeg,
    was && type !== was.type && use?.workouts ? h('p.fine', 'Past workouts keep the numbers they have.') : null,
    was && use ? h('p.fine', `Used in ${use.workouts} workout${use.workouts === 1 ? '' : 's'} and ${use.plans} plan${use.plans === 1 ? '' : 's'}. Changes show everywhere.`) : null,
    was?.edited ? h('button.btn.dark.wide.ex-form-btn', { onclick: () => { resetExercise(editId); s.close(); toast('Back to the original'); onDone(exercise(editId)); } }, 'Reset to the original') : null,
    was?.custom ? h('button.btn.wide.danger-soft.ex-form-btn', { onclick: async () => {
      if (use.workouts || use.plans) { toast(`It’s in ${use.workouts + use.plans} workout${use.workouts + use.plans === 1 ? '' : 's'} or plans, so it can’t be deleted. Rename it instead.`); return; }
      if (!(await confirmBox(`Delete ${was.name}?`, null, { ok: 'Delete', danger: true }))) return;
      deleteCustomExercise(editId); s.close(); toast('Exercise deleted'); onDone(null);
    } }, 'Delete exercise') : null,
  ));
  setTimeout(() => nameIn.focus(), 300);
}
