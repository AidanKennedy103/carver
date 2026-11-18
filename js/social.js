// Social: your groups as a tab, with leaderboards and challenges.
//
// Everything is counted from the posts Carver already makes to your groups
// (workouts, runs and rides, daily goals, protein days), so a leaderboard or a
// challenge only sees what each person chose to share with that group.
// A challenge is itself a group post (kind 'challenge'): someone sets a goal
// like "12 workouts in 30 days" and everyone in the group is in it.

import { h, fill, sheet, toast, confirmBox, fmtDate } from './ui.js';
import { ymd, addDays, weekStart, uid } from './store.js';
import { client, account } from './cloud.js';
import { groupsScreen, avatar } from './groups.js';

export const METRICS = [
  { id: 'workouts', name: 'Workouts', unit: 'workout', ico: '🏋️' },
  { id: 'active', name: 'Active days', unit: 'active day', ico: '🔥', sub: 'Days with a workout, run or ride' },
  { id: 'habits', name: 'Daily goals', unit: 'daily goal', ico: '✅' },
  { id: 'protein', name: 'Protein days', unit: 'protein day', ico: '💪' },
];
const metric = (id) => METRICS.find((m) => m.id === id) || METRICS[0];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- A couple of months of each group's posts ----------

const KINDS = ['workout', 'cardio', 'habit', 'protein', 'challenge'];
const hist = new Map();   // group id → { at, rows }
const dayOf = (e) => e.data?.day || ymd(Date.parse(e.created_at));

async function loadHistory(gid) {
  const db = await client();
  const since = new Date(Date.now() - 62 * 864e5).toISOString();
  const { data, error } = await db.from('carver_events').select('id, user_id, kind, data, created_at')
    .eq('group_id', gid).in('kind', KINDS).gte('created_at', since).order('created_at', { ascending: false }).limit(3000);
  if (error) throw error;
  hist.set(gid, { at: Date.now(), rows: data || [] });
}

/** How much of `metric` one person did between two days (inclusive). */
function score(rows, userId, m, from, to) {
  const mine = rows.filter((e) => e.user_id === userId && dayOf(e) >= from && dayOf(e) <= to);
  if (m === 'workouts') return mine.filter((e) => e.kind === 'workout').length;
  if (m === 'active') return new Set(mine.filter((e) => e.kind === 'workout' || e.kind === 'cardio').map(dayOf)).size;
  if (m === 'habits') return mine.filter((e) => e.kind === 'habit').length;
  if (m === 'protein') return new Set(mine.filter((e) => e.kind === 'protein').map(dayOf)).size;
  return 0;
}

// ---------- The page ----------

/** The Social tab (or, with the tab off, the Groups screen from Home). */
export function socialPage({ tab = true } = {}) {
  let period = 'week', board = 'workouts';
  return groupsScreen({
    tab,
    sections: (g, members, redraw) => {
      const h0 = hist.get(g.id);
      if (!h0 || Date.now() - h0.at > 60000) {
        hist.set(g.id, { at: Date.now(), rows: h0?.rows || [] });   // don't ask twice while loading
        loadHistory(g.id).then(redraw).catch(() => {});
      }
      const rows = hist.get(g.id).rows;
      const people = members.length ? members : [{ user_id: account()?.id, name: g.myName }];
      return [
        leaderboard(rows, people, period, board, (p, b) => { period = p; board = b; redraw(); }),
        challenges(g, rows, people, redraw),
      ];
    },
  });
}

export function leaderboard(rows, people, period, board, set) {
  const today = ymd();
  const from = period === 'week' ? ymd(weekStart()) : today.slice(0, 8) + '01';
  const ranked = people.map((p) => ({ ...p, v: score(rows, p.user_id, board, from, today) })).sort((a, b) => b.v - a.v || a.name.localeCompare(b.name));
  const top = Math.max(1, ...ranked.map((p) => p.v));
  let place = 0, last = null;
  return [
    h('div.section-head', h('h2.section-title', 'Leaderboard'),
      h('div.segment.mini', [['week', 'Week'], ['month', 'Month']].map(([v, l]) => h('button' + (period === v ? '.on' : ''), { onclick: () => set(v, board) }, l)))),
    h('section.card.lb-card',
      h('div.chips.tight.no-drag', METRICS.map((m) => h('button.chip' + (board === m.id ? '.on' : ''), { onclick: () => set(period, m.id) }, `${m.ico} ${m.name}`))),
      ranked.map((p, i) => {
        if (p.v !== last) { place = i + 1; last = p.v; }
        const me = p.user_id === account()?.id;
        return h('div.lb-row' + (me ? '.me' : ''),
          h('span.lb-place', p.v && place <= 3 ? ['🥇', '🥈', '🥉'][place - 1] : String(place)),
          avatar(p.name, p.user_id),
          h('div.lb-main', h('div.lb-name', me ? 'You' : p.name), h('div.lb-bar', h('i', { style: { width: (p.v / top) * 100 + '%' } }))),
          h('b.lb-val', p.v));
      }),
      h('p.fine', `${period === 'week' ? 'Since Monday' : 'This month'}. Counts what each person shares with this group.`)),
  ];
}

// ---------- Challenges ----------

function challenges(g, rows, people, redraw) {
  const today = ymd();
  const list = rows.filter((e) => e.kind === 'challenge' && e.data?.end >= addDays(today, -14))
    .sort((a, b) => {   // running ones first (ending soonest), then finished ones (most recent)
      const ae = a.data.end < today, be = b.data.end < today;
      if (ae !== be) return ae ? 1 : -1;
      return (a.data.end < b.data.end ? -1 : 1) * (ae ? -1 : 1);
    });
  return [
    h('div.section-head', h('h2.section-title', 'Challenges'), h('button.link', { onclick: () => newChallenge(g, redraw) }, '+ New')),
    list.length ? list.map((c) => challengeCard(c, rows, people, redraw))
      : h('button.card.empty-plan-row', { onclick: () => newChallenge(g, redraw) }, '🏁', h('span', 'Start a challenge for the group')),
  ];
}

export function challengeCard(c, rows, people, redraw) {
  const d = c.data, today = ymd(), m = metric(d.metric);
  const ended = d.end < today;
  const left = Math.round((Date.parse(d.end + 'T12:00') - Date.parse(today + 'T12:00')) / 864e5) + 1;
  const ranked = people.map((p) => ({ ...p, v: score(rows, p.user_id, d.metric, d.start, d.end) })).sort((a, b) => b.v - a.v);
  const done = ranked.filter((p) => p.v >= d.target).length;
  const mine = c.user_id === account()?.id;
  return h('section.card.ch-card' + (ended ? '.ended' : ''),
    h('div.ch-head',
      h('div', h('div.ch-title', `🏁 ${d.title}`),
        h('div.ch-meta', [`${fmtDate(Date.parse(d.start + 'T12:00'), { month: 'short', day: 'numeric' })} – ${fmtDate(Date.parse(d.end + 'T12:00'), { month: 'short', day: 'numeric' })}`,
          ended ? 'Finished' : left === 1 ? 'Last day' : `${left} days left`, `${done} of ${ranked.length} done`].join(' · '))),
      mine ? h('button.link.small-link', {
        onclick: async () => {
          if (!(await confirmBox('Delete this challenge?', 'It disappears for everyone in the group.', { ok: 'Delete', danger: true }))) return;
          try { const db = await client(); await db.from('carver_events').delete().eq('id', c.id); c.data.end = '0000'; redraw(); } catch { toast('Couldn’t delete it. Try again online.'); }
        },
      }, 'Delete') : null),
    ranked.map((p) => {
      const me = p.user_id === account()?.id, hit = p.v >= d.target;
      return h('div.ch-row' + (hit ? '.hit' : ''),
        avatar(p.name, p.user_id),
        h('div.lb-main', h('div.lb-name', me ? 'You' : p.name), h('div.lb-bar', h('i', { style: { width: Math.min(100, (p.v / d.target) * 100) + '%' } }))),
        h('b.lb-val', hit ? `${p.v} ✓` : `${p.v}/${d.target}`));
    }),
    h('div.ch-goal', `${m.ico} ${plural(d.target, m.unit)}`));
}

const PRESETS = [
  { metric: 'workouts', target: 12, days: 30 },
  { metric: 'active', target: 5, days: 7 },
  { metric: 'habits', target: 14, days: 14 },
  { metric: 'protein', target: 20, days: 30 },
];
const autoTitle = (m, target, days) => `${plural(target, metric(m).unit)} in ${days === 7 ? 'a week' : `${days} days`}`;

function newChallenge(g, after) {
  let m = 'workouts', target = 12, days = 30, custom = false;
  const titleIn = h('input.field', { maxlength: 50, oninput: () => { custom = !!titleIn.value.trim(); } });
  const targetIn = h('input.field.goal-input', { inputmode: 'numeric', oninput: () => { target = Math.max(1, Math.min(365, Math.round(+targetIn.value) || 1)); sync(); } });
  const body = h('div');
  const sync = () => { if (!custom) titleIn.placeholder = autoTitle(m, target, days); };
  const draw = () => {
    targetIn.value = target;
    fill(body,
      h('label.form-label', 'Quick picks'),
      h('div.chips.tight.no-drag', PRESETS.map((p) => h('button.chip' + (p.metric === m && p.target === target && p.days === days ? '.on' : ''),
        { onclick: () => { ({ metric: m, target, days } = p); draw(); } }, autoTitle(p.metric, p.target, p.days)))),
      h('label.form-label', 'Count'),
      h('div.segment', METRICS.map((x) => h('button' + (m === x.id ? '.on' : ''), { onclick: () => { m = x.id; draw(); } }, x.name))),
      metric(m).sub ? h('p.fine', metric(m).sub) : null,
      h('div.group', h('label.goal-row', h('span', 'Goal'), h('span.goal-field', targetIn, h('span.goal-unit', metric(m).unit + 's')))),
      h('label.form-label', 'How long'),
      h('div.segment', [7, 14, 30].map((n) => h('button' + (days === n ? '.on' : ''), { onclick: () => { days = n; draw(); } }, n === 7 ? '1 week' : `${n} days`))),
      h('label.form-label', 'Name (optional)'), titleIn,
      h('p.fine', 'Starts today. Everyone in the group is in it, and progress counts from what each person shares with the group.'),
    );
    sync();
  };
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', `Challenge ${g.name}`), h('button.link.strong', { onclick: start }, 'Start')),
    body));
  async function start() {
    const start = ymd(), end = addDays(start, days - 1);
    const data = { title: titleIn.value.trim() || autoTitle(m, target, days), metric: m, target, start, end };
    try {
      const db = await client();
      const { error } = await db.from('carver_events').insert({ group_id: g.id, user_id: account().id, kind: 'challenge', ref: 'c:' + uid(), data });
      if (error) throw error;
      s.close();
      hist.delete(g.id);
      toast('Challenge started');
      after();
    } catch (e) {
      toast(/check constraint/i.test(e?.message || '') ? 'Challenges need a quick server update (supabase/social.sql). See the README.' : 'Couldn’t start it. Are you online?');
    }
  }
}
