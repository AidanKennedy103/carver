// Social: your groups as a tab, with leaderboards and challenges.
//
// Everything is counted from the posts Carver already makes to your groups
// (workouts, runs and rides, daily goals, protein days), so a leaderboard or a
// challenge only sees what each person chose to share with that group.
// A challenge is itself a group post (kind 'challenge'): someone sets a goal
// like "12 workouts in 30 days" and everyone in the group is in it.

import { h, fill, sheet, toast, confirmBox, fmtDate, icon } from './ui.js';
import { ymd, addDays, weekStart, uid } from './store.js';
import { client, account } from './cloud.js';
import { groupsScreen, avatar } from './groups.js';

export const METRICS = [
  { id: 'workouts', name: 'Workouts', unit: 'workout' },
  { id: 'active', name: 'Active days', unit: 'active day', sub: 'Days with a workout, run or ride' },
  { id: 'habits', name: 'Daily goals', unit: 'daily goal' },
  { id: 'protein', name: 'Protein days', unit: 'protein day' },
];
const metric = (id) => METRICS.find((m) => m.id === id) || METRICS[0];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- A couple of months of each group's posts ----------

const KINDS = ['workout', 'cardio', 'habit', 'protein', 'challenge', 'week'];
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
      void period; void board;
      return {
        week: winsCard(rows, people),
        challenges: challenges(g, rows, people, redraw),
      };
    },
  });
}

/**
 * Wins this week: only the people who hit something are named. Nobody is ranked last,
 * and anyone who didn't train simply isn't listed.
 */
export function winsCard(rows, people) {
  const mon = ymd(weekStart()), me = account()?.id;
  const week = rows.filter((e) => dayOf(e) >= mon);
  const nameOf = (uid) => (uid === me ? 'You' : people.find((p) => p.user_id === uid)?.name || 'Someone');
  const count = (pred) => { const m = new Map(); for (const e of week) if (pred(e)) m.set(e.user_id, (m.get(e.user_id) || 0) + 1); return m; };
  const tops = (m) => { const best = Math.max(0, ...m.values()); return best ? { n: best, who: [...m].filter(([, v]) => v === best).map(([u]) => u) } : null; };
  const wins = [];
  const goal = [...new Set(week.filter((e) => e.kind === 'week').map((e) => e.user_id))];
  if (goal.length) wins.push({ ico: 'check', label: 'Hit their weekly goal', who: goal });
  const active = tops(count((e) => e.kind === 'workout' || e.kind === 'cardio'));
  if (active && active.n >= 2) wins.push({ ico: 'flame', label: `Most active: ${plural(active.n, 'session')}`, who: active.who });
  const prs = new Map();
  for (const e of week) if (e.kind === 'workout' && e.data?.prs?.length) prs.set(e.user_id, (prs.get(e.user_id) || 0) + e.data.prs.length);
  if (prs.size) wins.push({ ico: 'trophy', label: 'Set new personal records', who: [...prs.keys()], note: (u) => `${prs.get(u)}` });
  // Weeks in a row with a workout or cardio (this week counts once it has one)
  const streak = (uid) => {
    const weeks = new Set(rows.filter((e) => e.user_id === uid && (e.kind === 'workout' || e.kind === 'cardio')).map((e) => ymd(weekStart(Date.parse(e.created_at)))));
    let w = weekStart(), n = 0;
    if (!weeks.has(ymd(w))) w = weekStart(w - 3 * 864e5);
    while (weeks.has(ymd(w))) { n++; w = weekStart(w - 3 * 864e5); }
    return n;
  };
  const st = new Map(people.map((p) => [p.user_id, streak(p.user_id)]).filter(([, n]) => n >= 2));
  const longest = tops(st);
  if (longest) wins.push({ ico: 'bolt', label: `Longest streak: ${longest.n} weeks`, who: longest.who });
  const habits = tops(count((e) => e.kind === 'habit'));
  if (habits && habits.n >= 3) wins.push({ ico: 'check', label: `Most daily goals: ${habits.n}`, who: habits.who });
  const protein = tops(count((e) => e.kind === 'protein'));
  if (protein && protein.n >= 3) wins.push({ ico: 'up', label: `Hit protein most: ${plural(protein.n, 'day')}`, who: protein.who });
  // Points for effort this week (never for how much you lift); only people with points are shown
  const PTS = { workout: 3, cardio: 2, week: 5, habit: 1, protein: 1 };
  const pts = new Map();
  for (const e of week) {
    const p = (PTS[e.kind] || 0) + (e.kind === 'workout' ? 2 * (e.data?.prs?.length || 0) : 0);
    if (p) pts.set(e.user_id, (pts.get(e.user_id) || 0) + p);
  }
  const board = [...pts].sort((a, b) => b[1] - a[1]).map(([u, p]) => ({ u, p, badges: wins.filter((w) => w.who.includes(u)) }));
  const left = 7 - ((new Date().getDay() + 6) % 7);
  const spot = (x, place) => h('div.pod.p' + place,
    h('div.pod-av', avatar(nameOf(x.u), x.u), place === 1 ? h('span.pod-crown', icon('trophy', 14)) : null),
    h('div.pod-name', nameOf(x.u)),
    h('div.pod-pts', `${x.p} pts`),
    h('div.pod-step', h('b', place)));
  return [
    h('div.section-head', h('h2.section-title', 'This week'), h('span.section-count', left === 1 ? 'Last day' : `${left} days left`)),
    board.length ? h('section.card.wins-board',
      h('div.podium', [board[1] && spot(board[1], 2), spot(board[0], 1), board[2] && spot(board[2], 3)].filter(Boolean)),
      board.slice(3).map((x, i) => h('div.wb-row', h('span.wb-place', i + 4), avatar(nameOf(x.u), x.u), h('span.wb-name', nameOf(x.u)), h('b.wb-pts', `${x.p}`))),
      wins.length ? h('div.wb-badges', wins.map((w) => h('div.wb-badge', h('span.win-ico', icon(w.ico, 14)),
        h('span.wb-badge-text', h('b', w.label), h('span', w.who.map((u) => nameOf(u) + (w.note ? ` (${w.note(u)})` : '')).join(', ')))))) : null,
      h('p.fine.wb-how', 'Points for showing up: workout 3, run or ride 2, weekly goal 5, new record 2, daily goal 1, protein day 1.'))
      : h('div.feed-empty.card', 'The board fills up as people train this week. First workout takes the top spot.'),
  ];
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
      h('div.chips.tight.no-drag', METRICS.map((m) => h('button.chip' + (board === m.id ? '.on' : ''), { onclick: () => set(period, m.id) }, m.name))),
      ranked.map((p, i) => {
        if (p.v !== last) { place = i + 1; last = p.v; }
        const me = p.user_id === account()?.id;
        return h('div.lb-row' + (me ? '.me' : ''),
          h('span.lb-place' + (p.v && place <= 3 ? '.top' + place : ''), String(place)),
          avatar(p.name, p.user_id),
          h('div.lb-main', h('div.lb-name', me ? 'You' : p.name), h('div.lb-bar', h('i', { style: { width: (p.v / top) * 100 + '%' } }))),
          h('b.lb-val', p.v));
      }),
      h('p.fine', period === 'week' ? 'Since Monday.' : 'This month.')),
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
    list.length ? list.map((c) => (c.data.wod ? wodCard(c, rows, people, redraw) : challengeCard(c, rows, people, redraw)))
      : h('button.card.empty-plan-row', { onclick: () => newChallenge(g, redraw) }, icon('flag', 18), h('span', 'Start a challenge for the group')),
  ];
}

/** "Murph: beat 48:10": each person's best that week, from their workout posts, best first. */
function wodCard(c, rows, people, redraw) {
  const d = c.data, today = ymd(), ended = d.end < today;
  const amrap = /round/.test(d.score || '') || ['cindy', 'nickels'].includes(d.wod);
  const name = { cindy: 'Cindy', murph: 'Murph', nickels: 'Nickels and Dimes', '1230': '12-3-30', fran: 'Fran' }[d.wod] || d.title;
  const val = (s) => { if (!s) return null; const r = s.match(/(\d+) rounds?(?: \+ (\d+) reps)?/); if (r) return +r[1] * 1000 + (+r[2] || 0); const t = s.match(/(\d+):(\d\d)(?::(\d\d))?/); return t ? (t[3] ? +t[1] * 3600 + +t[2] * 60 + +t[3] : +t[1] * 60 + +t[2]) : null; };
  const best = people.map((p) => {
    const mine = rows.filter((e) => e.user_id === p.user_id && e.kind === 'workout' && (e.data?.name || '').startsWith(name + ' · ') && ymd(Date.parse(e.created_at)) >= d.start && ymd(Date.parse(e.created_at)) <= d.end)
      .map((e) => e.data.name.slice(name.length + 3)).filter((s) => val(s) != null);
    const top = mine.sort((a, b) => (amrap ? val(b) - val(a) : val(a) - val(b)))[0] || null;
    return { ...p, top };
  }).sort((a, b) => (a.top ? 0 : 1) - (b.top ? 0 : 1) || (amrap ? val(b.top) - val(a.top) : val(a.top) - val(b.top)));
  const left = Math.round((Date.parse(d.end + 'T12:00') - Date.parse(today + 'T12:00')) / 864e5) + 1;
  return h('section.card.ch-card' + (ended ? '.ended' : ''),
    h('div.ch-head', h('div', h('div.ch-title', d.title), h('div.ch-meta', [ended ? 'Finished' : left === 1 ? 'Last day' : `${left} days left`, `${best.filter((p) => p.top).length} of ${best.length} done`].join(' · ')))),
    best.some((p) => p.top) ? best.filter((p) => p.top).map((p, i) => h('div.ch-row' + (i === 0 ? '.hit' : ''),
      h('span.lb-place' + (i < 3 ? '.top' + (i + 1) : ''), String(i + 1)), avatar(p.name, p.user_id),
      h('div.lb-main', h('div.lb-name', p.user_id === account()?.id ? 'You' : p.name)),
      h('b.lb-val', p.top))) : h('p.fine', 'No results yet. Be the first.'),
    ended ? null : h('button.btn.gold-soft.wide.ch-go', { onclick: () => Promise.all([import('./coach.js'), import('./guided.js')]).then(([co, gd]) => { const ch = co.CHALLENGES.find((x) => x.id === d.wod); if (ch) gd.openGuided(ch, { from: c.who, score: d.score }); }) }, `Do ${name}`));
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
      h('div', h('div.ch-title', d.title),
        h('div.ch-meta', [`${fmtDate(Date.parse(d.start + 'T12:00'), { month: 'short', day: 'numeric' })} – ${fmtDate(Date.parse(d.end + 'T12:00'), { month: 'short', day: 'numeric' })}`,
          ended ? 'Finished' : left === 1 ? 'Last day' : `${left} days left`, `${done} of ${ranked.length} done`].join(' · '))),
      mine ? h('button.link.small-link', {
        onclick: async () => {
          if (!(await confirmBox('Delete this challenge?', 'It disappears for everyone in the group.', { ok: 'Delete', danger: true }))) return;
          try { const db = await client(); await db.from('carver_events').delete().eq('id', c.id); c.data.end = '0000'; redraw(); } catch { toast('Couldn’t delete it. Try again online.'); }
        },
      }, 'Delete') : null),
    ranked.filter((p) => p.v > 0).map((p) => {
      const me = p.user_id === account()?.id, hit = p.v >= d.target;
      return h('div.ch-row' + (hit ? '.hit' : ''),
        avatar(p.name, p.user_id),
        h('div.lb-main', h('div.lb-name', me ? 'You' : p.name), h('div.lb-bar', h('i', { style: { width: Math.min(100, (p.v / d.target) * 100) + '%' } }))),
        h('b.lb-val', hit ? `${p.v} ✓` : `${p.v}/${d.target}`));
    }),
    h('div.ch-goal', `Goal: ${plural(d.target, m.unit)}`));
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
      h('p.fine', 'Starts today for everyone in the group.'),
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
