// "Add exercises" picker: search, filter by muscle, pick several, or create your own.

import { h, fill, icon, sheet, toast } from './ui.js';
import { MUSCLES, EQUIPMENT } from './exercises.js';
import { allExercises, addCustomExercise, state } from './store.js';

const TYPE_LABEL = { wr: 'Weight & reps', bw: 'Reps only', time: 'Duration' };

/** Opens the picker. onPick(ids[]) is called with the chosen exercise ids. */
export function pickExercises(onPick, { single = false, title = 'Add exercises' } = {}) {
  const chosen = [];
  let muscle = 'All', query = '';

  const list = h('div.ex-list');
  const addBtn = h('button.btn.gold.wide', { disabled: true, onclick: () => { s.close(); onPick(chosen.slice()); } }, 'Add');
  const search = h('input.search-input', {
    type: 'search', placeholder: 'Search exercises', autocomplete: 'off', enterkeyhint: 'search',
    oninput: (e) => { query = e.target.value.toLowerCase().trim(); draw(); },
  });
  const chips = h('div.chips.no-drag', ['All', ...MUSCLES].map((m) => h('button.chip', {
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
    let items = allExercises().filter((e) =>
      (muscle === 'All' || e.muscle === muscle) &&
      (!query || e.name.toLowerCase().includes(query) || e.equipment.toLowerCase().includes(query) || e.muscle.toLowerCase().includes(query)));
    if (!query) items = items.slice().sort((a, b) => (recent.get(a.id) ?? 999) - (recent.get(b.id) ?? 999));
    fill(list, 
      ...items.map((e) => {
        const n = chosen.indexOf(e.id);
        return h('button.ex-row' + (n >= 0 ? '.on' : ''), {
          onclick: () => {
            if (single) { s.close(); onPick([e.id]); return; }
            const i = chosen.indexOf(e.id);
            if (i >= 0) chosen.splice(i, 1); else chosen.push(e.id);
            addBtn.disabled = !chosen.length;
            addBtn.textContent = chosen.length ? `Add ${chosen.length} exercise${chosen.length > 1 ? 's' : ''}` : 'Add';
            draw();
          },
        },
        h('span.ex-badge', e.name[0]),
        h('span.ex-text', h('span.ex-name', e.name), h('span.ex-sub', `${e.muscle} · ${e.equipment}${e.custom ? ' · Custom' : ''}`)),
        n >= 0 ? h('span.ex-num', n + 1) : null);
      }),
      items.length ? null : h('div.empty-small', 'No exercises match. Create it below.'),
    );
  }

  const s = sheet(h('div.picker',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', title),
      h('button.link', { onclick: () => createExercise((e) => { if (single) { s.close(); onPick([e.id]); } else { chosen.push(e.id); addBtn.disabled = false; addBtn.textContent = `Add ${chosen.length} exercise${chosen.length > 1 ? 's' : ''}`; draw(); } }, query) }, 'Create')),
    h('div.search-wrap', icon('search', 18), search),
    chips,
    list,
    single ? null : h('div.sheet-foot', addBtn),
  ), { full: true });
  draw();
}

/** Form for a custom exercise. */
export function createExercise(onDone, name = '') {
  let type = 'wr';
  const nameIn = h('input.field', { placeholder: 'Exercise name', value: name ? name[0].toUpperCase() + name.slice(1) : '' });
  const muscleSel = h('select.field', MUSCLES.map((m) => h('option', { value: m }, m)));
  const equipSel = h('select.field', EQUIPMENT.map((m) => h('option', { value: m }, m)));
  const typeSeg = h('div.segment', Object.entries(TYPE_LABEL).map(([k, v]) => h('button' + (k === type ? '.on' : ''), {
    onclick: (e) => { type = k; typeSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, v)));
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'New exercise'),
      h('button.link.strong', {
        onclick: () => {
          const n = nameIn.value.trim();
          if (!n) { toast('Give it a name'); return; }
          const e = addCustomExercise({ name: n, muscle: muscleSel.value, equipment: equipSel.value, type });
          s.close();
          onDone(e);
        },
      }, 'Save')),
    h('label.form-label', 'Name'), nameIn,
    h('label.form-label', 'Main muscle'), muscleSel,
    h('label.form-label', 'Equipment'), equipSel,
    h('label.form-label', 'What you log'), typeSeg,
  ));
  setTimeout(() => nameIn.focus(), 300);
}
