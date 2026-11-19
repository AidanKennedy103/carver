// Settings: units, default rest, back up / restore, reset.

import { h, fill, icon, sheet, toast, confirmBox, promptBox, fmtSecs, actionSheet, refreshAll, push } from './ui.js';
import { state, commit, exportJSON, importJSON, resetAll, MAX_PLANS, savePlan, unit, bodyUnit, distUnit, shownTabs, TAB_LIST } from './store.js';
import { REST_CHOICES } from './block.js';
import { canMix } from './sound.js';

/** An on/off row for a setting that's on unless switched off. */
function toggleRow(label, key, sub) {
  const sw = h('span.switch' + (state.settings[key] !== false ? '.on' : ''), h('i'));
  return h('button.group-row', { onclick: () => { commit((st) => { st.settings[key] = st.settings[key] === false; }); sw.classList.toggle('on', state.settings[key] !== false); } },
    h('span.tab-pick-text', h('span', label), sub ? h('span.tab-pick-sub', sub) : null), sw);
}
import { accountSection } from './account.js';
import { aboutScreen } from './about.js';
import { clearPhotos } from './photos.js';
import { importCronometer } from './cronometer.js';
import { account } from './cloud.js';
import { readFiles, readWorkouts, saveWorkouts, routines, planFrom, readMFP, saveMFP } from './imports.js';

export function openSettings() {
  // Units: lifting, body weight and distance are each their own choice
  const unitSeg = (key, opts, cur) => {
    const seg = h('div.segment', opts.map(([v, label]) => h('button' + (cur() === v ? '.on' : ''), {
      onclick: (e) => {
        commit((st) => { st.settings[key] = v; });
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === e.currentTarget));
        refreshAll();
      },
    }, label)));
    return seg;
  };
  const liftSeg = unitSeg('unit', [['lb', 'Pounds (lb)'], ['kg', 'Kilograms (kg)']], unit);
  const bodySeg = unitSeg('bodyUnit', [['lb', 'Pounds (lb)'], ['kg', 'Kilograms (kg)']], bodyUnit);
  const distSeg = unitSeg('distUnit', [['mi', 'Miles'], ['km', 'Kilometres']], distUnit);

  // Tabs: keep only the parts of Carver you use, in the order you like
  const tabRows = h('div.group');
  const setTabs = (list) => { commit((st) => { st.settings.tabs = list; }); drawTabs(); refreshAll(); };
  const drawTabs = () => {
    const shown = shownTabs();
    const ordered = [...shown.map((id) => TAB_LIST.find((t) => t.id === id)), ...TAB_LIST.filter((t) => !shown.includes(t.id))];
    fill(tabRows, ordered.map((t) => {
      const on = shown.includes(t.id), i = shown.indexOf(t.id);
      return h('div.group-row.tab-pick',
        h('button.tab-pick-main', { role: 'switch', 'aria-checked': String(on), onclick: () => setTabs(on ? shown.filter((x) => x !== t.id) : [...shown, t.id]) },
          h('span.tab-pick-ico', icon(t.icon, 18)), h('span.tab-pick-text', h('span', t.label, t.wip ? h('span.wip-tag', 'Under construction') : null), h('span.tab-pick-sub', t.sub)), h('span.switch' + (on ? '.on' : ''), h('i'))),
        on && i > 0 ? h('button.icon-btn.tab-up', { 'aria-label': `Move ${t.label} left`, onclick: () => { const l = shown.slice(); [l[i - 1], l[i]] = [l[i], l[i - 1]]; setTabs(l); } }, icon('back', 16)) : h('span.tab-up-gap'));
    }));
  };
  drawTabs();

  const restVal = h('span.row-val', fmtSecs(state.settings.restDefault));
  const nameVal = h('span.row-val', state.profile.name || 'Add');
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      if (!(await confirmBox('Restore this backup?', 'It replaces everything Carver has saved on this phone.', { ok: 'Restore', danger: true }))) return;
      importJSON(text);
      refreshAll();
      toast('Backup restored');
      s.close();
    } catch (err) { toast(err.message || 'Could not read that file'); }
  } });

  const cronIn = h('input', { type: 'file', accept: '.csv,text/csv', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const r = importCronometer(await f.text());
      toast(r.added ? `Imported ${r.added} entr${r.added === 1 ? 'y' : 'ies'} over ${r.days} day${r.days === 1 ? '' : 's'}` : r.total ? 'Those are already in Carver' : 'No food entries found in that file');
    } catch (err) { toast(err.message || 'Could not read that file'); }
  } });

  // The file doesn't say lb or kg: ask (your Carver unit first)
  const askUnit = (what) => new Promise((res) => {
    const u = state.settings.unit, other = u === 'lb' ? 'kg' : 'lb';
    actionSheet(`Are the ${what} in lb or kg?`, [{ label: u, onClick: () => res(u) }, { label: other, onClick: () => res(other) }, { label: 'Cancel', onClick: () => res(null) }]);
  });

  const workIn = h('input', { type: 'file', accept: '.csv,text/csv', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      let found = readWorkouts(text);
      if (found.needsUnit) { const u = await askUnit('weights'); if (!u) return; found = readWorkouts(text, u); }
      const r = saveWorkouts(found);
      if (!r.added) { toast(r.total ? 'Those workouts are already in Carver' : 'No workouts found in that file'); return; }
      toast(`Imported ${r.added} workout${r.added === 1 ? '' : 's'}${r.newExercises ? `, ${r.newExercises} new exercise${r.newExercises === 1 ? '' : 's'}` : ''}`);
      // Workouts you repeat by name can become plans, set from the last time you did each
      const room = MAX_PLANS - state.plans.length, list = routines(found.workouts).slice(0, room);
      if (list.length && await confirmBox(`Make ${list.length === 1 ? 'a plan' : `${list.length} plans`} from these?`, `${list.map((g) => g.name).join(', ')}. Each starts with the exercises, sets and weights from the last time you did it.`, { ok: 'Make plans', cancel: 'Not now' })) {
        list.forEach((g) => savePlan(planFrom(g.last)));
        toast(`${list.length} plan${list.length === 1 ? '' : 's'} added to Workout`);
      }
    } catch (err) { toast(err.message || 'Could not read that file'); }
  } });

  const mfpIn = h('input', { type: 'file', accept: '.zip,.csv,application/zip,text/csv', multiple: true, hidden: true, onchange: async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    try {
      const found = readMFP(await readFiles(files));
      const u = found.weights.length ? await askUnit('weigh-ins') : 'lb';
      if (!u) return;
      const r = saveMFP(found, u);
      const parts = [r.meals ? `${r.meals} meal${r.meals === 1 ? '' : 's'} over ${r.days} day${r.days === 1 ? '' : 's'}` : null, r.weights ? `${r.weights} weigh-in${r.weights === 1 ? '' : 's'}` : null].filter(Boolean);
      toast(parts.length ? `Imported ${parts.join(' and ')}` : 'Those are already in Carver');
    } catch (err) { toast(err.message || 'Could not read that file'); }
  } });

  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Settings'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    accountSection(() => s.close()),
    h('div.group',
      h('button.group-row', {
        onclick: async () => {
          const n = await promptBox('Your name', state.profile.name, { placeholder: 'First name' });
          if (n != null) { commit((st) => { st.profile.name = n; }); nameVal.textContent = n || 'Add'; }
        },
      }, h('span', 'Your name'), nameVal)),
    h('label.form-label', 'Home'),
    h('div.group', h('button.group-row', { onclick: () => { s.close(); Promise.all([import('./home.js'), import('./tabs.js')]).then(([m, tb]) => { tb.goTab('home'); m.startHomeEdit(); }); } }, h('span', 'Edit Home page'), h('span.card-go', '›'))),
    h('label.form-label', 'Tabs'), tabRows,
    h('p.fine', 'Up to 5 fit in the bar; the rest go under More.'),
    h('label.form-label', 'Weights you lift'), liftSeg,
    h('label.form-label', 'Body weight'), bodySeg,
    h('label.form-label', 'Distance'), distSeg,
    h('div.group',
      h('button.group-row', {
        onclick: () => actionSheet('Default rest timer', REST_CHOICES.map((sec) => ({
          label: sec ? fmtSecs(sec) : 'Off',
          onClick: () => { commit((st) => { st.settings.restDefault = sec; }); restVal.textContent = fmtSecs(sec); },
        }))),
      }, h('span', 'Default rest timer'), restVal),
      toggleRow('Rest timer', 'restOn', 'Starts after each set you tick'),
      canMix ? toggleRow('Rest timer sound', 'restSound', 'A short chime that plays over your music') : null),
    canMix ? null : h('p.fine', 'Rest is silent on this iPhone so it never pauses your music. Update iOS for a chime that plays over it.'),
    h('label.form-label', 'Your data'),
    h('div.group',
      h('button.group-row', { onclick: exportData }, h('span', 'Export all data'), h('span.row-val', 'JSON')),
      h('button.group-row', { onclick: () => fileIn.click() }, h('span', 'Restore from a backup'), h('span.row-val', '›'))),
    h('p.fine', account() ? 'Carver is a free beta. Your data is saved on this phone and in your account. The export is a JSON file of everything except progress photos.' : 'Carver is a free beta. Without an account, everything is saved only on this phone, so export a backup now and then. Progress photos aren’t in the backup.'),
    h('label.form-label', 'Bring in data from other apps'),
    h('div.group',
      h('button.group-row', { onclick: () => workIn.click() }, h('span', 'Workouts from Hevy, Strong, 5/3/1 apps…'), h('span.row-val', 'CSV')),
      h('button.group-row', { onclick: () => mfpIn.click() }, h('span', 'Food and weight from MyFitnessPal'), h('span.row-val', 'ZIP')),
      h('button.group-row', { onclick: () => cronIn.click() }, h('span', 'Food from Cronometer'), h('span.row-val', 'CSV'))),
    fileIn, cronIn, workIn, mfpIn,
    h('p.fine', 'Hevy: Settings → Export & Import Data → Export Workouts. Strong: Settings → Export Strong Data. Other apps: export a CSV. Unknown exercises become your own; repeated workouts can become plans.'),
    h('p.fine', 'MyFitnessPal: Settings → Export Data (emails you a zip; may need Premium). You get each meal’s totals per day and your weigh-ins, not the single foods.'),
    h('p.fine', 'Cronometer: on cronometer.com go to More → Account → Export Data, export “Food & Recipe Entries”. Anything already imported is skipped.'),
    h('div.group',
      h('button.group-row.danger', {
        onclick: async () => {
          if (!(await confirmBox('Erase everything?', account() ? 'Deletes all your data on this phone and on every device signed in to your account. This cannot be undone.' : 'Deletes all your data on this phone. This cannot be undone.', { ok: 'Erase', danger: true }))) return;
          resetAll(); await clearPhotos(); refreshAll(); s.close(); toast('Erased');
        },
      }, h('span', 'Erase all data'))),
    h('div.group', h('button.group-row', { onclick: () => { s.close(); push(aboutScreen); } }, h('span', 'About & privacy'), h('span.row-val', '›'))),
    h('p.fine.center', 'Carver beta · v0.5'),
  ));
}

async function exportData() {
  const text = exportJSON();
  const name = `carver-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([text], name, { type: 'application/json' });
  // On iPhone the share sheet lets you save to Files, AirDrop or email it
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Carver backup' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  toast('Backup downloaded');
}
