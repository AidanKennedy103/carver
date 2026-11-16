// Progress: body weight, progress photos, and your monthly goals and recaps.

import { h, fill, icon, push, pop, navBar, toast, actionSheet, confirmBox, fmtDate } from './ui.js';
import { state, toDisplay, unit } from './store.js';
import { lineChart } from './charts.js';
import { weights, latestWeight, trend, change, logWeightSheet, importSheet, weightRow } from './body.js';
import { photos, addPhoto, deletePhoto, loadInto } from './photos.js';
import { monthlySection } from './monthly.js';
import { account } from './cloud.js';

const fmtW = (kg) => `${toDisplay(kg)} ${unit()}`;
const signed = (kg) => { const v = +toDisplay(Math.abs(kg)); return `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${v} ${unit()}`; };

/** Opens the camera / photo library and saves the picture as a progress photo. */
export function takeProgressPhoto() {
  const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
  input.addEventListener('change', async () => {
    const f = input.files[0];
    input.remove();
    if (!f) return;
    try { toast('Saving photo…'); await addPhoto(f); toast('Progress photo saved'); }
    catch { toast('Could not save that photo'); }
  });
  document.body.append(input);
  input.click();
}

export function progressPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  function draw() {
    const last = latestWeight();
    const c30 = change(30);
    const recent = trend().filter((p) => p.x > Date.now() - 90 * 864e5);
    const pics = photos();

    fill(body,
      navBar({ title: 'Progress', backLabel: 'Home', large: true }),

      // Weight
      h('div.section-head', h('h2.section-title', 'Weight'), weights().length ? h('button.link', { onclick: () => push(weightScreen) }, 'History') : null),
      h('section.card.weight-card',
        last ? h('div.energy-top',
          h('div', h('div.energy-v', toDisplay(last.kg), h('span.orm-unit', unit())), h('div.energy-k', `Last weigh-in · ${fmtDate(last.ts, { month: 'short', day: 'numeric' })}`)),
          c30 != null ? h('div.energy-goal', h('div.weight-change', signed(c30)), h('div.energy-k', 'last 30 days')) : null)
          : h('div.empty-text.left', 'Log your weight to see your trend. Weighing in most mornings gives the clearest picture.'),
        recent.length > 1 ? lineChart(recent.map((p) => ({ ...p, y: +toDisplay(p.y) })), {
          height: 140, dots: false, fmtY: (v) => Math.round(v), label: 'Weight trend, last 90 days',
          tip: (p) => `<b>${toDisplay(p.raw)} ${unit()}</b><span>Trend ${p.y} · ${fmtDate(p.x, { month: 'short', day: 'numeric' })}</span>`,
        }) : null,
        h('div.btn-pair',
          h('button.btn.gold', { onclick: logWeightSheet }, icon('plus', 18), 'Log weight'),
          h('button.btn.dark', { onclick: importSheet }, 'Import'))),

      // Progress photos
      h('div.section-head', h('h2.section-title', 'Progress photos'), h('button.link', { onclick: takeProgressPhoto }, icon('plus', 16), 'Add')),
      pics.length
        ? h('div.photo-strip', pics.slice(0, 12).map((p) => h('button.photo-thumb', { onclick: () => push(() => photoScreen(p.id)) },
          loadInto(h('img', { alt: 'Progress photo', loading: 'lazy' }), p.id),
          h('span.photo-date', fmtDate(p.ts, { month: 'short', day: 'numeric' })))))
        : h('button.card.empty-plan', { onclick: takeProgressPhoto },
          h('div.empty-title', 'Take your first progress photo'),
          h('div.empty-text', 'Same spot, same light, once a month. Carver reminds you and lines them up in your monthly recap.')),
      pics.length > 12 ? h('button.link', { onclick: () => push(allPhotosScreen) }, `See all ${pics.length}`) : null,
      pics.length && !account() ? h('p.fine', 'Photos stay on this phone unless you sign in. They aren’t in the data export.') : null,

      monthlySection(),
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}

// ---------- Weight history ----------

function weightScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let range = 90;
  function draw() {
    const all = trend();
    const shown = range ? all.filter((p) => p.x > Date.now() - range * 864e5) : all;
    fill(body,
      h('h2.detail-title', 'Weight'),
      h('div.detail-date', 'The line is your 7-day average, which evens out daily water swings.'),
      h('div.segment.range', [[30, '1M'], [90, '3M'], [365, '1Y'], [0, 'All']].map(([d, l]) => h('button' + (range === d ? '.on' : ''), { onclick: () => { range = d; draw(); } }, l))),
      h('section.card.chart-card', lineChart(shown.map((p) => ({ ...p, y: +toDisplay(p.y) })), {
        height: 200, dots: shown.length < 40, fmtY: (v) => Math.round(v), label: 'Weight trend',
        tip: (p) => `<b>${toDisplay(p.raw)} ${unit()}</b><span>Trend ${p.y} · ${fmtDate(p.x, { month: 'short', day: 'numeric' })}</span>`,
      })),
      h('div.stats-inline',
        ...[[7, 'Week'], [30, 'Month'], [90, '3 months']].map(([d, l]) => { const c = change(d); return h('div.stat', h('span.stat-k', l), h('span.stat-v', c == null ? '—' : signed(c))); })),
      h('div.section-head', h('h2.section-title', 'Weigh-ins')),
      h('section.card.list-card', weights().slice().reverse().slice(0, 200).map(weightRow)),
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(navBar({ title: 'Weight', backLabel: 'Progress', right: [h('button.link', { onclick: logWeightSheet }, 'Log')] }), body);
  return { el, refresh: draw };
}

// ---------- Photos ----------

function allPhotosScreen() {
  const el = h('div.page', navBar({ title: 'Progress photos', backLabel: 'Progress' }),
    h('div.scroll-body', h('div.photo-grid', photos().map((p) => h('button.photo-thumb', { onclick: () => push(() => photoScreen(p.id)) },
      loadInto(h('img', { alt: 'Progress photo', loading: 'lazy' }), p.id), h('span.photo-date', fmtDate(p.ts, { month: 'short', day: 'numeric', year: '2-digit' }))))), h('div.bottom-space')));
  return { el };
}

const weightNear = (ts) => {
  let best = null;
  for (const w of weights()) if (Math.abs(w.ts - ts) < 4 * 864e5 && (!best || Math.abs(w.ts - ts) < Math.abs(best.ts - ts))) best = w;
  return best;
};

function photoScreen(id) {
  const p = photos().find((x) => x.id === id);
  const w = p && weightNear(p.ts);
  const el = h('div.page.photo-page',
    navBar({
      title: p ? fmtDate(p.ts, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Photo', backLabel: 'Back',
      right: [h('button.icon-btn', {
        'aria-label': 'Photo options',
        onclick: () => actionSheet('Progress photo', [
          { label: 'Compare with another', onClick: () => pickCompare(id) },
          { label: 'Delete photo', danger: true, onClick: async () => { if (await confirmBox('Delete this photo?', 'This cannot be undone.', { ok: 'Delete', danger: true })) { await deletePhoto(id); pop(); } } },
        ]),
      }, icon('more'))],
    }),
    h('div.scroll-body',
      loadInto(h('img.photo-full', { alt: 'Progress photo' }), id, 'full'),
      w ? h('p.fine.center', `Weight around then: ${fmtW(w.kg)}`) : null,
      h('button.btn.dark.wide', { onclick: () => pickCompare(id) }, 'Compare with another photo'),
      h('div.bottom-space')),
  );
  return { el };
}

function pickCompare(id) {
  const others = photos().filter((p) => p.id !== id);
  if (!others.length) { toast('Add another photo to compare'); return; }
  actionSheet('Compare with', others.slice(0, 12).map((p) => ({ label: fmtDate(p.ts, { month: 'short', day: 'numeric', year: 'numeric' }), onClick: () => push(() => compareScreen(id, p.id)) })));
}

/** Two photos side by side, older on the left, with the weight at each. */
export function compareView(idA, idB) {
  const [a, b] = [photos().find((p) => p.id === idA), photos().find((p) => p.id === idB)].sort((x, y) => x.ts - y.ts);
  const side = (p) => {
    const w = weightNear(p.ts);
    return h('figure.compare-side', loadInto(h('img', { alt: 'Progress photo' }), p.id, 'full'),
      h('figcaption', h('b', fmtDate(p.ts, { month: 'short', day: 'numeric', year: 'numeric' })), w ? h('span', fmtW(w.kg)) : null));
  };
  const wa = weightNear(a.ts), wb = weightNear(b.ts);
  const days = Math.round((b.ts - a.ts) / 864e5);
  return h('div',
    h('div.compare', side(a), side(b)),
    h('p.fine.center', `${days} day${days === 1 ? '' : 's'} apart${wa && wb ? ` · ${signed(wb.kg - wa.kg)}` : ''}`));
}

function compareScreen(idA, idB) {
  return { el: h('div.page', navBar({ title: 'Compare', backLabel: 'Back' }), h('div.scroll-body', compareView(idA, idB), h('div.bottom-space'))) };
}
