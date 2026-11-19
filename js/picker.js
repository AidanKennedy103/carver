// "Add exercises" picker: search, filter by muscle, pick several, or create your own.

import { h, fill, icon, sheet, toast } from './ui.js';
import { MUSCLES, EQUIPMENT, musclesText, searchExercises } from './exercises.js';
import { allExercises, addCustomExercise, state } from './store.js';

const TYPE_LABEL = { wr: 'Weight & reps', bw: 'Reps only', time: 'Duration' };

/** Opens the picker. onPick(ids[]) is called with the chosen exercise ids. */
export function pickExercises(onPick, { single = false, title = 'Add exercises', filter = null, max = 99, initial = [], addLabel = 'Add' } = {}) {
  const chosen = initial.slice();
  let muscle = 'All', query = '';

  const list = h('div.ex-list');
  const addBtn = h('button.btn.gold.wide', { disabled: !initial.length && addLabel === 'Add', onclick: () => { s.close(); onPick(chosen.slice()); } }, addLabel);
  const label = () => {
    if (addLabel !== 'Add') { addBtn.textContent = `${addLabel} (${chosen.length})`; addBtn.disabled = false; return; }
    addBtn.disabled = !chosen.length;
    addBtn.textContent = chosen.length ? `Add ${chosen.length} exercise${chosen.length > 1 ? 's' : ''}` : 'Add';
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
            label();
            draw();
          },
        },
        h('span.ex-badge', e.name[0]),
        h('span.ex-text', h('span.ex-name', e.name), h('span.ex-sub', `${musclesText(e)} · ${e.equipment}${e.uni ? ' · One side' : ''}${e.custom ? ' · Custom' : ''}`)),
        n >= 0 ? h('span.ex-num', n + 1) : null);
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
    single ? null : h('div.sheet-foot', addBtn),
  ), { full: true });
  label();
  draw();
}

/** Form for a custom exercise. */
export function createExercise(onDone, name = '') {
  let type = 'wr', uni = false;
  const helps = new Set();
  const nameIn = h('input.field', { placeholder: 'Exercise name', value: name ? name[0].toUpperCase() + name.slice(1) : '' });
  const muscleSel = h('select.field', MUSCLES.map((m) => h('option', { value: m }, m)));
  const equipSel = h('select.field', EQUIPMENT.map((m) => h('option', { value: m }, m)));
  const typeSeg = h('div.segment', Object.entries(TYPE_LABEL).map(([k, v]) => h('button' + (k === type ? '.on' : ''), {
    onclick: (e) => { type = k; typeSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, v)));
  const helpChips = h('div.chips.tight.no-drag', MUSCLES.filter((m) => m !== 'Full body' && m !== 'Cardio').map((m) => h('button.chip', {
    onclick: (e) => { if (helps.has(m)) helps.delete(m); else helps.add(m); e.currentTarget.classList.toggle('on', helps.has(m)); },
  }, m)));
  const uniSeg = h('div.segment', [[false, 'Both at once'], [true, 'One side at a time']].map(([v, l]) => h('button' + (v === uni ? '.on' : ''), {
    onclick: (e) => { uni = v; uniSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, l)));
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'New exercise'),
      h('button.link.strong', {
        onclick: () => {
          const n = nameIn.value.trim();
          if (!n) { toast('Give it a name'); return; }
          const e = addCustomExercise({ name: n, muscle: muscleSel.value, equipment: equipSel.value, type, helps: [...helps].filter((m) => m !== muscleSel.value), ...(uni ? { uni: true } : {}) });
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
  ));
  setTimeout(() => nameIn.focus(), 300);
}
