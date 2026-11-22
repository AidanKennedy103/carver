// One exercise card with its sets table. Used by the live workout ('live')
// and the plan editor ('plan').

import { h, icon, actionSheet, fmtSecs, parseSecs, toast } from './ui.js';
import { exercise, toDisplay, fromDisplay, unit, uid } from './store.js';
import { pickExercises } from './picker.js';
import { musclesText } from './exercises.js';

export const REST_CHOICES = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const SET_TYPES = { n: 'Normal set', d: 'Drop set', f: 'Failure set' };   // no warm-up sets in Carver

export const newSet = (from = {}) => ({ id: uid(), type: from.type || 'n', weight: null, reps: null, secs: null, done: false,
  tWeight: from.weight ?? from.tWeight ?? null, tReps: from.reps ?? from.tReps ?? null, tSecs: from.secs ?? from.tSecs ?? null });

/**
 * opts: {
 *   ex, index, count, mode: 'live'|'plan', prev: [sets],
 *   redraw(), save(), onSetDone(ex, set), onMove(dir), onRemove(), onReplace(id)
 * }
 */
export function exerciseCard(opts) {
  const { ex, mode, prev = [] } = opts;
  const info = exercise(ex.exId);
  const live = mode === 'live';
  const type = info.type;

  const restBtn = h('button.rest-chip', {
    onclick: () => actionSheet('Rest timer for ' + info.name, REST_CHOICES.map((sec) => ({
      label: sec ? fmtSecs(sec) : 'Off',
      onClick: () => { ex.rest = sec; opts.save(); restBtn.lastChild.textContent = ex.rest ? `Rest ${fmtSecs(ex.rest)}` : 'Rest off'; },
    }))),
  }, icon('timer', 13), h('span', ex.rest ? `Rest ${fmtSecs(ex.rest)}` : 'Rest off'));

  const doneN = ex.sets.filter((x) => x.done).length;
  const complete = live && ex.sets.length > 0 && doneN === ex.sets.length;
  const head = h('div.card-head',
    h('div.card-title-wrap',
      h('button.ex-title.ex-title-btn', { onclick: () => import('./howto.js').then((m) => m.howTo(ex.exId)), 'aria-label': `How to do ${info.name}` }, info.name, h('span.ex-howto', '?')),
      h('div.ex-meta', h('span.ex-helps', musclesText(info, 2) + (info.uni ? ' · each side' : '')), restBtn)),
    live && ex.sets.length ? h('span.ex-count' + (complete ? '.all' : ''), complete ? icon('check', 14) : null, `${doneN}/${ex.sets.length}`) : null,
    h('button.icon-btn', {
      'aria-label': 'Exercise options',
      onclick: () => actionSheet(info.name, [
        { label: 'How to do it', onClick: () => import('./howto.js').then((m) => m.howTo(ex.exId)) },
        opts.index > 0 && { label: 'Move up', onClick: () => opts.onMove(-1) },
        opts.index < opts.count - 1 && { label: 'Move down', onClick: () => opts.onMove(1) },
        { label: 'Replace exercise', onClick: () => pickExercises(([id]) => opts.onReplace(id), { single: true, title: 'Replace with' }) },
        { label: 'Remove exercise', danger: true, onClick: () => opts.onRemove() },
      ].filter(Boolean)),
    }, icon('more')),
  );

  const note = h('textarea.ex-note', {
    rows: 1, placeholder: live ? 'Add a note' : 'Note for this exercise (optional)', value: ex.note || '',
    oninput: (e) => { ex.note = e.target.value; autoGrow(e.target); opts.save(); },
  });
  requestAnimationFrame(() => autoGrow(note));

  const valueCols = type === 'wr' ? [unit().toUpperCase(), 'REPS'] : type === 'bw' ? ['REPS'] : ['TIME'];
  const cols = ['SET', ...(live ? ['PREVIOUS'] : []), ...valueCols, ...(live ? [''] : [''])];
  const grid = `grid-${live ? 'l' : 'p'}${valueCols.length}`;

  const table = h('div.sets ' + grid,
    h('div.set-row.head', cols.map((c, i) => h('div.c' + i, c === '' && live ? icon('check', 16) : c))),
  );

  let normalN = 0;
  const nextIdx = live && opts.current ? ex.sets.findIndex((x) => !x.done) : -1;   // the set to do next
  ex.sets.forEach((set, si) => {
    const label = set.type === 'n' ? String(++normalN) : set.type.toUpperCase();
    const p = prev[si];
    const prevText = p ? (type === 'wr' ? `${toDisplay(p.weight)} × ${p.reps ?? 0}` : type === 'bw' ? `${p.reps ?? 0} reps` : fmtSecs(p.secs || 0)) : '—';

    // Placeholders: last time's numbers first, then the plan's targets
    const phW = p?.weight != null ? toDisplay(p.weight) : set.tWeight != null ? toDisplay(set.tWeight) : '';
    const phR = p?.reps != null ? String(p.reps) : set.tReps != null ? String(set.tReps) : '';
    const phS = p?.secs != null ? fmtSecs(p.secs) : set.tSecs != null ? fmtSecs(set.tSecs) : '';

    const row = h('div.set-row' + (set.done ? '.done' : si === nextIdx ? '.next' : ''));
    const num = h('button.set-num.t-' + set.type, {
      'aria-label': `Set ${label}: change set type`,
      onclick: () => actionSheet('Set ' + label, [
        ...Object.entries(SET_TYPES).map(([k, v]) => ({ label: (set.type === k ? '✓ ' : '') + v, onClick: () => { set.type = k; opts.redraw(); } })),
        { label: 'Delete set', danger: true, onClick: () => { ex.sets.splice(si, 1); opts.redraw(); } },
      ]),
    }, label);

    const mkInput = (field, ph, mode2) => {
      const v = field === 'weight' ? (live ? set.weight : set.weight ?? set.tWeight)
        : field === 'reps' ? (live ? set.reps : set.reps ?? set.tReps)
          : (live ? set.secs : set.secs ?? set.tSecs);
      const shown = v == null ? '' : field === 'weight' ? toDisplay(v) : field === 'secs' ? fmtSecs(v) : String(v);
      return h('input.set-input', {
        value: shown, placeholder: ph, inputmode: mode2, enterkeyhint: 'next', autocomplete: 'off',
        'aria-label': `Set ${label} ${field === 'weight' ? `weight (${unit()})` : field === 'secs' ? 'time' : 'reps'}`,
        onfocus: (e) => e.target.select(),
        oninput: (e) => {
          const t = e.target.value.replace(',', '.');
          const val = field === 'weight' ? fromDisplay(t) : field === 'secs' ? parseSecs(t) : (t === '' || isNaN(+t) ? null : Math.round(+t));
          if (live) set[field] = val;
          else { set[field] = null; set['t' + field[0].toUpperCase() + field.slice(1)] = val; }
          opts.save();
        },
      });
    };

    const cells = [num];
    if (live) cells.push(h('button.prev', {
      onclick: () => {   // tap "previous" to copy it in
        if (!p) return;
        set.weight = p.weight; set.reps = p.reps; set.secs = p.secs; opts.redraw();
      },
    }, prevText));
    if (type === 'wr') cells.push(mkInput('weight', phW || '0', 'decimal'), mkInput('reps', phR || '0', 'numeric'));
    else if (type === 'bw') cells.push(mkInput('reps', phR || '0', 'numeric'));
    else cells.push(mkInput('secs', phS || '0:00', 'text'));

    if (live) {
      cells.push(h('button.set-check' + (set.done ? '.on' : ''), {
        'aria-label': set.done ? 'Mark set not done' : 'Mark set done',
        onclick: () => {
          if (!set.done) {
            // Fill blanks from the placeholders, like crossing off what you planned
            if (type === 'wr') {
              if (set.weight == null && phW !== '') set.weight = fromDisplay(phW);
              if (set.reps == null && phR !== '') set.reps = +phR;
              if (set.reps == null) { toast('Enter reps first'); return; }
              if (set.weight == null) set.weight = 0;
            } else if (type === 'bw') {
              if (set.reps == null && phR !== '') set.reps = +phR;
              if (set.reps == null) { toast('Enter reps first'); return; }
            } else {
              if (set.secs == null && phS !== '') set.secs = parseSecs(phS);
              if (set.secs == null) { toast('Enter a time first'); return; }
            }
            set.done = true;
            opts.redraw();
            opts.onSetDone?.(ex, set);
          } else {
            set.done = false;
            opts.redraw();
          }
        },
      }, icon('check', 18)));
    } else {
      cells.push(h('button.set-del', { 'aria-label': 'Delete set', onclick: () => { ex.sets.splice(si, 1); opts.redraw(); } }, icon('close', 16)));
    }
    cells.forEach((c, i) => c.classList.add('c' + i));
    row.append(...cells);
    table.append(row);
  });

  const addSet = h('button.add-set', {
    onclick: () => {
      const last = ex.sets[ex.sets.length - 1];
      // New set copies the last one's numbers as a starting point
      const s = newSet(last ? {
        type: last.type === 'w' ? 'n' : last.type,
        weight: last.weight ?? last.tWeight, reps: last.reps ?? last.tReps, secs: last.secs ?? last.tSecs,
      } : {});
      ex.sets.push(s);
      opts.redraw();
    },
  }, icon('plus', 16), 'Add set');

  return h('section.ex-card' + (live ? '.live' : '') + (complete ? '.complete' : ''), head, note, table, addSet);
}

function autoGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
