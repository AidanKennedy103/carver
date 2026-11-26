// One exercise card with its sets table. Used by the live workout ('live')
// and the plan editor ('plan').

import { h, icon, actionSheet, fmtSecs, parseSecs, toast, swipeRow } from './ui.js';
import { exercise, toDisplay, fromDisplay, unit, uid, state, save } from './store.js';
import { holdToDrag } from './ui.js';
import { pickExercises } from './picker.js';
import { musclesText } from './exercises.js';

export const REST_CHOICES = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const SET_TYPES = { w: 'Warm-up set', n: 'Normal set', d: 'Drop set', f: 'Failure set' };   // warm-ups only when you add them; they don't count toward volume or PRs

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
      h('button.ex-title.ex-title-btn', { onclick: () => import('./howto.js').then((m) => m.howTo(ex.exId)), 'aria-label': `How to do ${info.name}` }, opts.badge ? h('span.ex-badge-g', opts.badge) : null, info.name, h('span.ex-howto', '?')),
      h('div.ex-meta', h('span.ex-helps', musclesText(info, 2) + (info.uni ? ' · each side' : '')), restBtn)),
    live && ex.sets.length ? h('span.ex-count' + (complete ? '.all' : ''), complete ? icon('check', 14) : null, `${doneN}/${ex.sets.length}`) : null,
    h('button.icon-btn', {
      'aria-label': 'Exercise options',
      onclick: () => actionSheet(info.name, [
        { label: 'How to do it', onClick: () => import('./howto.js').then((m) => m.howTo(ex.exId)) },
        opts.index > 0 && { label: 'Move up', onClick: () => opts.onMove(-1) },
        opts.index < opts.count - 1 && { label: 'Move down', onClick: () => opts.onMove(1) },
        { label: 'Replace exercise', onClick: () => pickExercises(([id]) => opts.onReplace(id), { single: true, title: 'Replace with' }) },
        { label: 'Edit exercise', onClick: () => import('./picker.js').then((m) => m.createExercise(() => opts.redraw?.(), '', ex.exId)) },
        ...(opts.menu || []),
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
  const tgt = live && ex.tgt;   // a block sets this lift: show this week's target, not last time
  const cols = ['SET', ...(live ? [tgt ? 'TARGET' : 'PREVIOUS'] : []), ...valueCols, ...(live ? [''] : [''])];
  const grid = `grid-${live ? 'l' : 'p'}${valueCols.length}`;

  const table = h('div.sets ' + grid,
    h('div.set-row.head', cols.map((c, i) => h('div.c' + i, c === '' && live ? icon('check', 16) : c))),
  );

  let normalN = 0;
  const nextIdx = live && opts.current ? ex.sets.findIndex((x) => !x.done) : -1;   // the set to do next
  ex.sets.forEach((set, si) => {
    const label = set.type === 'n' ? String(++normalN) : set.type.toUpperCase();
    table.append(setRow({ ex, set, si, type, live, tgt, prev, opts, label, isNext: si === nextIdx }));
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

  // A warm-up goes before your work sets, at about half the weight of the first one
  const addWarm = h('button.add-warm', {
    onclick: () => {
      const at = ex.sets.findIndex((x) => x.type !== 'w');
      const first = at >= 0 ? ex.sets[at] : null;
      const w = first ? (first.weight ?? first.tWeight) : null;
      const half = w ? Math.round((w * 0.5) / 2.5) * 2.5 || null : null;
      ex.sets.splice(at < 0 ? ex.sets.length : at, 0, newSet({ type: 'w', weight: half, reps: type === 'time' ? null : (first?.reps ?? first?.tReps ?? 8), secs: first?.secs ?? first?.tSecs }));
      opts.redraw();
    },
  }, icon('plus', 14), 'Warm-up');

  const tip = !state.settings.seenSetTypes && opts.index === 0 && ex.sets.length
    ? h('div.set-tip', icon('edit', 14), h('span', 'Tap a set number to make it a ', h('b.t-w', 'warm-up'), ', ', h('b.t-d', 'drop'), ' or ', h('b.t-f', 'failure'), ' set.')) : null;
  return h('section.ex-card' + (live ? '.live' : '') + (complete ? '.complete' : ''), head, note, tip, table, h('div.add-row', addSet, addWarm));
}

/**
 * One set as a row: number (or exercise name in a superset), last time / target, the inputs, the tick.
 * ctx: { ex, set, si, type, live, tgt, prev, opts, label, isNext, name (superset label), group (fixed columns) }
 */
function setRow({ ex, set, si, type, live, tgt, prev = [], opts, label, isNext, name = null, group = false }) {
  // In a block the plan's target stands in for last time
  const p = tgt ? (set.tWeight != null || set.tReps != null || set.tSecs != null ? { weight: set.tWeight, reps: set.tReps, secs: set.tSecs } : null) : prev[si];
  const prevText = !p ? '—' : type === 'wr' ? (p.weight != null ? `${toDisplay(p.weight)} × ${p.reps ?? 0}` : `${p.reps ?? 0} reps`) : type === 'bw' ? `${p.reps ?? 0} reps` : fmtSecs(p.secs || 0);

  // Placeholders: last time's numbers (or the block's target) first, then the plan's targets
  const phW = p?.weight != null ? toDisplay(p.weight) : set.tWeight != null ? toDisplay(set.tWeight) : '';
  const phR = p?.reps != null ? String(p.reps) : set.tReps != null ? String(set.tReps) : '';
  const phS = p?.secs != null ? fmtSecs(p.secs) : set.tSecs != null ? fmtSecs(set.tSecs) : '';

  const row = h('div.set-row' + (set.done ? '.done' : isNext ? '.next' : '') + (set.type === 'w' ? '.warm' : ''));
  const menu = () => actionSheet(name ? `${name.text} · set ${label}` : 'Set ' + label, [
    ...Object.entries(SET_TYPES).map(([k, v]) => ({ label: (set.type === k ? '✓ ' : '') + v, onClick: () => { set.type = k; state.settings.seenSetTypes = true; save(); opts.redraw(); } })),
    { label: 'Delete set', danger: true, onClick: () => { ex.sets.splice(si, 1); opts.redraw(); } },
  ]);
  const num = name
    ? h('button.set-name.t-' + set.type, { 'aria-label': `${name.text}, set ${label}: change set type`, onclick: menu }, h('span.ex-badge-g.small', name.badge), h('span.set-name-t', name.text), set.type !== 'n' ? h('span.set-name-k', set.type.toUpperCase()) : null)
    : h('button.set-num.t-' + set.type, { 'aria-label': `Set ${label}: change set type`, onclick: menu }, label);

  const mkInput = (field, ph, mode2) => {
    const v = field === 'weight' ? (live ? set.weight : set.weight ?? set.tWeight)
      : field === 'reps' ? (live ? set.reps : set.reps ?? set.tReps)
        : (live ? set.secs : set.secs ?? set.tSecs);
    const shown = v == null ? '' : field === 'weight' ? toDisplay(v) : field === 'secs' ? fmtSecs(v) : String(v);
    return h('input.set-input', {
      value: shown, placeholder: ph, inputmode: mode2, enterkeyhint: 'next', autocomplete: 'off',
      'aria-label': `${name ? name.text + ' ' : ''}Set ${label} ${field === 'weight' ? `weight (${unit()})` : field === 'secs' ? 'time' : 'reps'}`,
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

  const prevBtn = live ? h('button.prev' + (tgt ? '.tgt' : ''), {
    onclick: () => {   // tap "previous" to copy it in
      if (!p) return;
      set.weight = p.weight ?? set.weight; set.reps = p.reps; set.secs = p.secs; opts.redraw();
    },
  }, name && p ? `${tgt ? 'target' : 'last'} ${prevText}` : prevText) : null;
  // In a superset the name gets the room; last time sits under it
  const cells = name ? [h('div.set-namecell', num, p ? prevBtn : null)] : [num, ...(prevBtn ? [prevBtn] : [])];
  if (type === 'wr') cells.push(mkInput('weight', phW || '0', 'decimal'), mkInput('reps', phR || '0', 'numeric'));
  else if (type === 'bw') cells.push(...(group ? [h('span.set-blank', 'BW')] : []), mkInput('reps', phR || '0', 'numeric'));
  else cells.push(...(group ? [h('span.set-blank')] : []), mkInput('secs', phS || '0:00', 'text'));

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
  // Live: swipe a set left to delete it (one you're not doing)
  return live ? swipeRow(row, [{ label: 'Delete', danger: true, onClick: () => { ex.sets.splice(si, 1); opts.redraw(); } }]) : row;
}

// ---------- The list of exercises: supersets and circuits, hold to drag ----------

const GROUP = { superset: 'Superset', circuit: 'Circuit' };
export const groupOf = (e) => (e.grp ? { grp: e.grp, gkind: e.gkind } : {});

/** Give new exercises a group of their own (from the picker's Superset / Circuit choice). */
export function groupNew(list, kind) {
  if (!kind || list.length < 2) return list;
  const grp = 'g' + uid();
  for (const e of list) { e.grp = grp; e.gkind = kind; }
  return list;
}

/** In a group, the exercise whose set comes next: fewest done, in order. */
export function nextInGroup(exs, e) {
  if (!e.grp) return e;
  const mem = exs.filter((x) => x.grp === e.grp && x.sets.some((s) => !s.done));
  return mem.sort((a, b) => a.sets.filter((s) => s.done).length - b.sets.filter((s) => s.done).length || exs.indexOf(a) - exs.indexOf(b))[0] || e;
}
/** True if this exercise ends a round of its group (rest after it). */
export const endsRound = (exs, e) => !e.grp || exs.filter((x) => x.grp === e.grp).pop() === e;

/**
 * Every exercise as a card; a superset or circuit is one card that goes round by round
 * (calf raise, curl, calf raise, curl…). optsFor(ex, index) gives a card's options
 * (as exerciseCard takes them); onChange(newOrder) saves a reorder or regroup.
 * Hold a card to drag it.
 */
export function exerciseList(exs, optsFor, onChange) {
  // tidy: a group needs 2+ exercises next to each other
  for (let i = 0; i < exs.length; i++) {
    const g = exs[i].grp;
    if (!g) continue;
    const mem = exs.filter((x) => x.grp === g);
    if (mem.length < 2) { delete exs[i].grp; delete exs[i].gkind; continue; }
    const first = exs.findIndex((x) => x.grp === g);
    const rest = exs.filter((x) => x.grp !== g);
    rest.splice(Math.min(first, rest.length), 0, ...mem);
    if (rest.some((x, k) => x !== exs[k])) exs.splice(0, exs.length, ...rest);
  }
  const outer = h('div.ex-stack');
  let letter = 0;
  for (let i = 0; i < exs.length;) {
    const g = exs[i].grp;
    let j = i + 1;
    while (g && j < exs.length && exs[j].grp === g) j++;
    const members = exs.slice(i, j);
    if (g && members.length >= 2) {
      const L = 'ABCDEFGHIJ'[letter++] || '';
      const kind = members[0].gkind || 'superset';
      const box = groupCard(members, members.map((e) => optsFor(e, exs.indexOf(e))), { L, kind, exs, onChange });
      box.classList.add('dg-item'); box._exs = members;
      outer.append(box);
    } else {
      const e = exs[i];
      const next = exs[i + 1];
      const menu = next ? [{ label: next.grp ? `Add to the ${GROUP[next.gkind || 'superset'].toLowerCase()} below` : 'Superset with the next exercise', onClick: () => {
        if (next.grp) { e.grp = next.grp; e.gkind = next.gkind; } else { const grp = 'g' + uid(); e.grp = next.grp = grp; e.gkind = next.gkind = 'superset'; }
        onChange(exs.slice());
      } }] : [];
      const c = exerciseCard({ ...optsFor(e, i), menu: [...(optsFor(e, i).menu || []), ...menu] });
      c.classList.add('dg-item'); c._exs = [e];
      outer.append(c);
    }
    i = j;
  }
  holdToDrag(outer, { onDrop: (els) => onChange(els.flatMap((x) => x._exs)), collapse: true });
  return outer;
}

/** A superset or circuit: its exercises, then every set round by round in one list. */
function groupCard(members, optsList, { L, kind, exs, onChange }) {
  const o0 = optsList[0];
  const live = o0.mode === 'live';
  const name = (e) => exercise(e.exId).name;
  const redraw = () => o0.redraw();
  const swap = (k, d) => { const out = exs.slice(); const i = out.indexOf(members[k]), j = out.indexOf(members[k + d]); [out[i], out[j]] = [out[j], out[i]]; onChange(out); };
  const take = (e) => { const out = exs.filter((x) => x !== e); delete e.grp; delete e.gkind; const after = out.map((x) => x.grp).lastIndexOf(members[0].grp); out.splice(after + 1, 0, e); onChange(out); };

  // Who's in it, in order, each with its own options
  const who = h('div.grp-who', members.map((e, k) => h('div.grp-ex',
    h('span.ex-badge-g', `${L}${k + 1}`),
    h('button.grp-ex-name', { onclick: () => import('./howto.js').then((m) => m.howTo(e.exId)) }, name(e)),
    h('button.icon-btn.no-drag', {
      'aria-label': `${name(e)} options`,
      onclick: () => actionSheet(name(e), [
        { label: 'How to do it', onClick: () => import('./howto.js').then((m) => m.howTo(e.exId)) },
        k > 0 && { label: 'Move earlier', onClick: () => swap(k, -1) },
        k < members.length - 1 && { label: 'Move later', onClick: () => swap(k, 1) },
        { label: 'Replace exercise', onClick: () => pickExercises(([id]) => optsList[k].onReplace(id), { single: true, title: 'Replace with' }) },
        { label: 'Edit exercise', onClick: () => import('./picker.js').then((m) => m.createExercise(() => optsList[k].redraw?.(), '', e.exId)) },
        { label: `Take out of ${GROUP[kind].toLowerCase()}`, onClick: () => take(e) },
        { label: 'Remove exercise', danger: true, onClick: () => optsList[k].onRemove() },
      ].filter(Boolean)),
    }, icon('more', 18)))));

  // Rest comes after each round: it uses the last exercise's rest
  const last = members[members.length - 1];
  const restBtn = h('button.rest-chip.no-drag', {
    onclick: () => actionSheet(`Rest after each round`, REST_CHOICES.map((sec) => ({
      label: sec ? fmtSecs(sec) : 'Off',
      onClick: () => { last.rest = sec; o0.save(); restBtn.lastChild.textContent = sec ? `Rest ${fmtSecs(sec)} after each round` : 'No rest'; },
    }))),
  }, icon('timer', 13), h('span', last.rest ? `Rest ${fmtSecs(last.rest)} after each round` : 'No rest'));

  const cols = live ? ['EXERCISE', unit().toUpperCase(), 'REPS', ''] : ['EXERCISE', unit().toUpperCase(), 'REPS', ''];
  const table = h('div.sets.grp-sets.' + (live ? 'grid-g' : 'grid-gp'), h('div.set-row.head', cols.map((c, i) => h('div.c' + i, c === '' && live ? icon('check', 16) : c))));
  const rounds = Math.max(...members.map((e) => e.sets.length));
  // the next set to do: the first not ticked, going round by round
  let nextKey = null;
  if (live) for (let r = 0; r < rounds && !nextKey; r++) for (const e of members) if (e.sets[r] && !e.sets[r].done) { nextKey = e.sets[r]; break; }
  const n = new Map();
  for (let r = 0; r < rounds; r++) {
    table.append(h('div.grp-round', `Round ${r + 1}`));
    members.forEach((e, k) => {
      const set = e.sets[r];
      if (!set) return;
      const i = (n.get(e) || 0) + (set.type === 'n' ? 1 : 0); n.set(e, i);
      table.append(setRow({ ex: e, set, si: r, type: exercise(e.exId).type, live, tgt: live && e.tgt, prev: optsList[k].prev || [], opts: optsList[k],
        label: set.type === 'n' ? String(i) : set.type.toUpperCase(), isNext: set === nextKey, name: { badge: `${L}${k + 1}`, text: name(e) }, group: true }));
    });
  }

  const addRound = h('button.add-set', {
    onclick: () => {
      for (const e of members) {
        const lastSet = e.sets[e.sets.length - 1];
        e.sets.push(newSet(lastSet ? { type: lastSet.type === 'w' ? 'n' : lastSet.type, weight: lastSet.weight ?? lastSet.tWeight, reps: lastSet.reps ?? lastSet.tReps, secs: lastSet.secs ?? lastSet.tSecs } : {}));
      }
      redraw();
    },
  }, icon('plus', 16), 'Add round');

  const menu = () => actionSheet(GROUP[kind], [
    { label: kind === 'superset' ? 'Make it a circuit' : 'Make it a superset', onClick: () => { members.forEach((e) => { e.gkind = kind === 'superset' ? 'circuit' : 'superset'; }); onChange(exs.slice()); } },
    { label: 'Ungroup', onClick: () => { members.forEach((e) => { delete e.grp; delete e.gkind; }); onChange(exs.slice()); } },
  ]);
  const done = live && members.every((e) => e.sets.length && e.sets.every((x) => x.done));
  return h('section.ex-group.' + kind + (done ? '.complete' : ''),
    h('div.ex-group-head',
      h('span.ex-group-tag', `${L} · ${GROUP[kind]}`),
      h('span.ex-group-sub', `${rounds} round${rounds === 1 ? '' : 's'}`),
      h('button.icon-btn.no-drag', { onclick: menu, 'aria-label': `${GROUP[kind]} options` }, icon('more', 18))),
    who, h('div.grp-rest', restBtn), table, addRound);
}

function autoGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
