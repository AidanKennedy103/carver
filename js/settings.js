// Settings: units, default rest, back up / restore, reset.

import { h, sheet, toast, confirmBox, fmtSecs, actionSheet, refreshAll } from './ui.js';
import { state, commit, exportJSON, importJSON, resetAll } from './store.js';
import { REST_CHOICES } from './block.js';

export function openSettings() {
  const unitSeg = h('div.segment', ['lb', 'kg'].map((u) => h('button' + (state.settings.unit === u ? '.on' : ''), {
    onclick: (e) => {
      commit((s) => { s.settings.unit = u; });
      unitSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
      refreshAll();
    },
  }, u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)')));

  const restVal = h('span.row-val', fmtSecs(state.settings.restDefault));
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
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

  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Settings'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('label.form-label', 'Weight units'), unitSeg,
    h('div.group',
      h('button.group-row', {
        onclick: () => actionSheet('Default rest timer', REST_CHOICES.map((sec) => ({
          label: sec ? fmtSecs(sec) : 'Off',
          onClick: () => { commit((st) => { st.settings.restDefault = sec; }); restVal.textContent = fmtSecs(sec); },
        }))),
      }, h('span', 'Default rest timer'), restVal)),
    h('label.form-label', 'Your data'),
    h('div.group',
      h('button.group-row', { onclick: exportData }, h('span', 'Export all data'), h('span.row-val', 'JSON')),
      h('button.group-row', { onclick: () => fileIn.click() }, h('span', 'Restore from a backup'), h('span.row-val', '›'))),
    fileIn,
    h('p.fine', 'Carver is a free beta. Everything is saved only on this phone for now, so export a backup now and then.'),
    h('div.group',
      h('button.group-row.danger', {
        onclick: async () => {
          if (!(await confirmBox('Erase everything?', 'Deletes all plans, workouts and custom exercises on this phone. This cannot be undone.', { ok: 'Erase', danger: true }))) return;
          resetAll(); refreshAll(); s.close(); toast('Erased');
        },
      }, h('span', 'Erase all data'))),
    h('p.fine.center', 'Carver beta · v0.1'),
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
  toast('Backup downloaded');
}
