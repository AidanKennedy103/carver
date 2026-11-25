// The setup walkthrough a new person goes through on first open: name and units, which
// parts of Carver they want (the tabs), a few goals, what's on Home, and a short tour of
// how to use it all. Nothing is saved until the last step, so Skip (or replaying it from
// Settings to try it out) leaves everything as it was.

import { h, fill, icon, toast, promptBox } from './ui.js';
import { state, commit, TAB_LIST, HOME_SECTIONS, HOME_DEFAULT, shownTabs, homeSections } from './store.js';

const AIMS = [['cut', 'Lose fat'], ['maintain', 'Maintain'], ['build', 'Build muscle']];
// Home pieces that only make sense with a tab on
const NEEDS = { next: 'workout', week: 'workout', strength: 'workout', calendar: 'workout', restday: 'workout', macros: 'nutrition', water: 'nutrition', readiness: 'recovery', groups: 'social' };

// What each tab is for and how to use it, for the tour
const TOUR = {
  home: ['Home', 'home', ['Goal tiles go gold when you hit them. Tap one to act on it: water adds 250 ml, workout opens your plans.', 'Daily goals: slide one across when it’s done. Tap ‹ above them to tick off an earlier day.', 'Settings (top right) → Edit Home page to change what’s here and the order.']],
  workout: ['Workout', 'dumbbell', ['Make a plan once, then start it in one tap. Last time’s weights fill in for you.', 'Tick each set as you go; the rest timer starts on its own. Tap a set number for warm-up or drop sets.', 'Hold an exercise to drag it into a new order, or link exercises into a superset or circuit.']],
  nutrition: ['Nutrition', 'apple', ['Log food by search, barcode or your recent foods. Calories and macros add up as you go.', 'Tap +250 ml to log a glass of water.', 'Your calorie and protein goals change under Goals at the top.']],
  fitness: ['Fitness', 'activity', ['Log runs, walks, rides and other cardio, or bring them in from Apple Health.']],
  social: ['Social', 'users', ['Make a group with friends to see each other’s workouts and daily goals, and cheer them on.']],
  habits: ['Habits', 'check', ['Your daily goals with streaks and a 12-week grid. Tap any past day in the grid to change it.']],
  recovery: ['Recovery', 'moon', ['A quick daily check-in on sleep and soreness gives you a readiness score.']],
  body: ['Physical Metrics', 'user', ['Log your weight (or sync a smart scale through Apple Health) to see your real trend.', 'Add a DEXA or InBody scan to calibrate your scale’s body fat.', 'Progress photos stay hidden behind a button until you want to see them.']],
};

// Little pictures of each Home piece, so you can see what you're picking (static drawings, no data)
const spark = (d, gold = true) => `<svg viewBox="0 0 100 34" preserveAspectRatio="none" class="wp-spark"><path d="${d} L100 34 L0 34Z" class="wp-area${gold ? '' : ' blue'}"/><path d="${d}" class="wp-line${gold ? '' : ' blue'}"/></svg>`;
const PREVIEW = {
  rings: '<div class="wp-tiles"><i class="done"></i><i><b style="width:60%"></b></i><i><b style="width:35%"></b></i><i><b style="width:80%"></b></i></div>',
  restday: '<div class="wp-note"><b>Rest day</b><span>On track · 2 of 3 this week</span></div>',
  daily: '<div class="wp-slide done"><s></s>Drink water</div><div class="wp-slide"><s></s>50 push-ups</div>',
  next: '<div class="wp-next"><div><b>Push day</b><span>6 exercises</span></div><em>Start</em></div>',
  week: '<div class="wp-week">' + [0, 1, 2, 3, 4, 5, 6].map((i) => ([0, 2, 4].includes(i) ? '<i class="on"></i>' : '<i></i>')).join('') + '</div><div class="wp-cap">3 of 4 workouts</div>',
  macros: '<div class="wp-macros"><svg viewBox="0 0 36 36" class="wp-ring"><circle cx="18" cy="18" r="14" class="wp-ring-bg"/><circle cx="18" cy="18" r="14" class="wp-ring-fg" stroke-dasharray="60 88"/></svg><div><i style="width:70%"></i><i style="width:45%"></i><i style="width:55%"></i></div></div>',
  water: '<div class="wp-water"><i><b></b></i><em>+250</em></div><div class="wp-cap">1.5 of 2.5 L</div>',
  readiness: '<div class="wp-ready"><span>82</span><div><b>Ready to train</b><i></i></div></div>',
  progress: spark('M0 12 L14 14 L28 13 L42 18 L56 17 L70 22 L84 21 L100 26') + '<div class="wp-cap">−2.4 lb this month</div>',
  strength: '<div class="wp-big">225<small> lb</small></div>' + spark('M0 28 L20 25 L40 24 L60 18 L80 15 L100 8'),
  calendar: '<div class="wp-cal">' + Array.from({ length: 28 }, (_, i) => ([0, 2, 4].includes(i % 7) && i < 26 ? '<i class="on"></i>' : '<i></i>')).join('') + '</div>',
  today: '<div class="wp-rows"><p><i class="g"></i>Push day · 52 min</p><p><i class="o"></i>1,840 kcal logged</p><p><i></i>Weighed in · 181.2</p></div>',
  nudges: '<div class="wp-rows"><p><i class="g"></i>Progress photo</p><p><i></i>This month’s goals</p></div>',
  groups: '<div class="wp-avs"><i></i><i></i><i></i></div><div class="wp-cap">Sam finished Leg day</div>',
  profile: '<div class="wp-stats"><p><b>6</b>week streak</p><p><b>48</b>workouts</p><p><b>3</b>PRs</p></div>',
};
const preview = (id) => { const el = h('div.wp'); el.innerHTML = PREVIEW[id] || ''; return el; };

/** Open the walkthrough. replay: started from Settings, so it starts from your current choices. */
export function openSetup({ replay = false } = {}) {
  if (document.querySelector('.setup')) return;
  const unitNow = state.settings.unit || 'lb';
  const d = {
    name: state.profile.name || '',
    unit: unitNow,
    tabs: replay ? shownTabs() : ['workout', 'nutrition'],
    aim: state.goals.aim || 'maintain',
    perWeek: state.goals.workoutsPerWeek || 3,
    kcal: replay ? state.goals.kcal : null,      // optional: left alone unless you set them here
    protein: replay ? state.goals.p : null,
    foodGoals: false,   // calories and protein: "Not sure yet" until you choose to set them
    home: replay ? homeSections() : null,   // worked out from the tabs once you get there
  };
  const STEPS = ['welcome', 'tabs', 'goals', 'home', 'tour'];
  let at = 0;
  const el = h('div.setup', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Set up Carver' });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in'));

  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
  const skip = () => {
    if (!replay) commit((s) => { delete s.settings.needsSetup; });
    close();
    if (replay) toast('Nothing changed');
  };
  const go = (n) => { at = Math.max(0, Math.min(STEPS.length - 1, at + n)); draw(); el.querySelector('.setup-body')?.scrollTo(0, 0); };

  function finish() {
    commit((s) => {
      s.profile.name = d.name.trim();
      s.settings.unit = d.unit;
      if (!replay) { s.settings.bodyUnit = d.unit; s.settings.distUnit = d.unit === 'kg' ? 'km' : 'mi'; }
      s.settings.tabs = d.tabs;
      s.settings.home = d.home;
      s.goals.aim = d.aim;
      s.goals.workoutsPerWeek = d.perWeek;
      if (d.foodGoals && d.kcal) s.goals.kcal = d.kcal;
      if (d.foodGoals && d.protein) s.goals.p = d.protein;
      delete s.settings.needsSetup;
    });
    close();
    import('./tabs.js').then((m) => m.goTab('home'));
    toast(replay ? 'Setup saved' : `You’re all set${d.name.trim() ? `, ${d.name.trim()}` : ''}`);
  }

  // A home page made for the tabs you picked: the usual pieces, minus ones for tabs you're not using
  const homeFor = () => {
    const base = [...HOME_DEFAULT];
    if (d.tabs.includes('nutrition') && !d.tabs.includes('workout')) base.splice(1, 0, 'macros', 'water');
    if (d.tabs.includes('recovery')) base.splice(1, 0, 'readiness');
    return base.filter((id, i) => base.indexOf(id) === i && (!NEEDS[id] || d.tabs.includes(NEEDS[id])));
  };

  const seg = (opts, cur, set) => h('div.segment', opts.map(([v, label]) => h('button' + (cur === v ? '.on' : ''), { onclick: () => { set(v); draw(); } }, label)));
  // − / + to nudge it, or tap the number to type it
  const stepper = (val, set, { min, max, step, suffix, label }) => h('span.stepper',
    h('button', { 'aria-label': 'Less', onclick: () => { set(Math.max(min, val - step)); draw(); } }, '−'),
    h('button.stepper-val', { 'aria-label': `${label}: ${val}. Tap to type it`, onclick: async () => {
      const v = parseInt(await promptBox(label, String(val), { inputmode: 'numeric' }), 10);
      if (v >= min && v <= max) { set(v); draw(); } else if (!isNaN(v)) toast(`Between ${min} and ${max}`);
    } }, `${val}${suffix || ''}`),
    h('button', { 'aria-label': 'More', onclick: () => { set(Math.min(max, val + step)); draw(); } }, '+'));

  // An optional number: "Add" until you tap it and type one (clear it to go back to none)
  const optional = (val, set, { min, max, suffix = '', label }) => h('button.setup-opt' + (val ? '' : '.empty'), { onclick: async () => {
    const raw = await promptBox(label, val ? String(val) : '', { inputmode: 'numeric', placeholder: 'Optional' });
    if (raw == null) return;
    if (raw.trim() === '') { set(null); draw(); return; }
    const v = parseInt(raw, 10);
    if (v >= min && v <= max) { set(v); draw(); } else toast(`Between ${min} and ${max}`);
  } }, val ? `${val}${suffix}` : 'Add');

  const pages = {
    welcome: () => [
      h('div.setup-hero', h('div.setup-logo', icon('dumbbell', 30)), h('h1', 'Welcome to Carver'), h('p', 'A minute to set it up the way you’ll use it. You can change all of this later in Settings.')),
      h('label.form-label', 'Your first name'),
      h('input.field', { value: d.name, placeholder: 'Optional', autocomplete: 'given-name', oninput: (e) => { d.name = e.target.value; } }),
      h('label.form-label', 'Weights in'),
      seg([['lb', 'Pounds (lb)'], ['kg', 'Kilograms (kg)']], d.unit, (v) => { d.unit = v; }),
      replay ? h('p.fine', 'You’re replaying setup. Nothing changes unless you finish it; Skip leaves everything as it is.')
        : h('button.link.setup-signin', { onclick: () => { commit((s) => { delete s.settings.needsSetup; }); close(); import('./account.js').then((m) => m.signInSheet()); } }, 'Already use Carver on another phone? Sign in'),
    ],
    tabs: () => [
      h('h2.setup-title', 'What do you want to track?'),
      h('p.setup-sub', 'Each one is a tab at the bottom. Home is always there. Turn on as many as you like.'),
      h('div.group', TAB_LIST.map((t) => {
        const on = d.tabs.includes(t.id);
        return h('button.group-row.tab-pick-main.setup-tab', { role: 'switch', 'aria-checked': String(on), onclick: () => { d.tabs = on ? d.tabs.filter((x) => x !== t.id) : [...d.tabs, t.id]; d.home = null; draw(); } },
          h('span.tab-pick-ico', icon(t.icon, 18)), h('span.tab-pick-text', h('span', t.label, t.wip ? h('span.wip-tag', 'Early') : null), h('span.tab-pick-sub', t.sub)), h('span.switch' + (on ? '.on' : ''), h('i')));
      })),
      h('p.fine', 'Up to 5 fit in the bar; the rest go under More.'),
    ],
    goals: () => [
      h('h2.setup-title', 'Your goals'),
      h('p.setup-sub', 'Rough is fine. These drive the goal tiles on Home.'),
      h('label.form-label', 'Right now I want to'),
      seg(AIMS, d.aim, (v) => { d.aim = v; }),
      d.tabs.includes('workout') ? h('div.group.setup-goals',
        h('div.group-row', h('span', 'Workouts a week'), stepper(d.perWeek, (v) => { d.perWeek = v; }, { min: 1, max: 7, step: 1, label: 'Workouts a week' }))) : null,
      d.tabs.includes('nutrition') ? [
        h('label.form-label.setup-food-label', 'Calories and protein'),
        seg([[false, 'Not sure yet'], [true, 'Set them now']], d.foodGoals, (v) => { d.foodGoals = v; }),
        d.foodGoals ? h('div.group.setup-goals',
          h('div.group-row', h('span', 'Calories a day'), optional(d.kcal, (v) => { d.kcal = v; }, { min: 1000, max: 6000, label: 'Calories a day' })),
          h('div.group-row', h('span', 'Protein a day'), optional(d.protein, (v) => { d.protein = v; }, { min: 30, max: 400, suffix: ' g', label: 'Protein a day (g)' })))
          : h('p.fine', 'No problem. Set them any time in Nutrition → Goals, or let the diet coach work them out from your weigh-ins.'),
      ] : null,
    ],
    home: () => {
      if (!d.home) d.home = homeFor();
      const avail = HOME_SECTIONS.filter((x) => !NEEDS[x.id] || d.tabs.includes(NEEDS[x.id]));
      const order = (list) => list.sort((a, b) => HOME_SECTIONS.findIndex((q) => q.id === a) - HOME_SECTIONS.findIndex((q) => q.id === b));
      return [
        h('h2.setup-title', 'Build your Home page'),
        h('p.setup-sub', `Tap the widgets you want on Home. ${d.home.length} picked; change the order later in Settings → Edit Home page.`),
        h('div.wgrid', avail.map((x) => {
          const on = d.home.includes(x.id);
          return h('button.wcard' + (on ? '.on' : ''), { 'aria-pressed': String(on), onclick: () => { d.home = on ? d.home.filter((y) => y !== x.id) : order([...d.home, x.id]); draw(); } },
            h('span.wcard-check', on ? icon('check', 13) : null),
            h('div.wcard-pic', preview(x.id)),
            h('b.wcard-name', x.name),
            h('span.wcard-sub', x.sub));
        })),
      ];
    },
    tour: () => [
      h('h2.setup-title', 'How it works'),
      h('p.setup-sub', 'The basics for what you picked.'),
      ['home', ...d.tabs.filter((t) => TOUR[t])].map((id) => {
        const [label, ic, tips] = TOUR[id];
        return h('section.card.setup-tour', h('div.setup-tour-head', h('span.tab-pick-ico', icon(ic, 18)), h('b', label)), h('ul', tips.map((t) => h('li', t))));
      }),
    ],
  };

  function draw() {
    const id = STEPS[at], last = at === STEPS.length - 1;
    fill(el,
      h('div.setup-top',
        at ? h('button.link', { onclick: () => go(-1) }, 'Back') : h('span'),
        h('div.setup-dots', STEPS.map((_, i) => h('i' + (i === at ? '.on' : i < at ? '.done' : '')))),
        h('button.link.muted', { onclick: skip }, 'Skip')),
      h('div.setup-body', pages[id]()),
      h('div.setup-foot',
        h('button.btn.gold.wide', { onclick: () => {
          if (id === 'tabs' && !d.tabs.length) { toast('Pick at least one'); return; }
          last ? finish() : go(1);
        } }, last ? 'Start using Carver' : 'Next')));
  }
  draw();
}
