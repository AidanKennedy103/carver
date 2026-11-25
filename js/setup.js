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
  home: ['Home', 'home', ['Goal tiles go gold when you hit them. Tap one to act on it: water adds 250 ml, workout opens your plans.', 'Daily goals: slide one across when it’s done. Forgot a day? Tap ‹ above them to go back.', 'Settings (top right) → Edit Home page to change what’s here and the order.']],
  workout: ['Workout', 'dumbbell', ['Make a plan once, then start it in one tap. Last time’s weights fill in for you.', 'Tick each set as you go; the rest timer starts on its own. Tap a set number for warm-up or drop sets.', 'Hold an exercise to drag it into a new order, or link exercises into a superset or circuit.']],
  nutrition: ['Nutrition', 'apple', ['Log food by search, barcode or your recent foods. Calories and macros add up as you go.', 'Tap +250 ml to log a glass of water.', 'Your calorie and protein goals change under Goals at the top.']],
  fitness: ['Fitness', 'activity', ['Log runs, walks, rides and other cardio, or bring them in from Apple Health.']],
  social: ['Social', 'users', ['Make a group with friends to see each other’s workouts and daily goals, and cheer them on.']],
  habits: ['Habits', 'check', ['Your daily goals with streaks and a 12-week grid. Tap any past day in the grid to change it.']],
  recovery: ['Recovery', 'moon', ['A quick daily check-in on sleep and soreness gives you a readiness score.']],
  body: ['Physical Metrics', 'user', ['Log your weight (or sync a smart scale through Apple Health) to see your real trend.', 'Add a DEXA or InBody scan to calibrate your scale’s body fat.', 'Progress photos stay hidden behind a button until you want to see them.']],
};

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
    kcal: state.goals.kcal || 2500,
    protein: state.goals.p || 180,
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
      s.goals.kcal = d.kcal;
      s.goals.p = d.protein;
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
      h('div.group.setup-goals',
        d.tabs.includes('workout') ? h('div.group-row', h('span', 'Workouts a week'), stepper(d.perWeek, (v) => { d.perWeek = v; }, { min: 1, max: 7, step: 1, label: 'Workouts a week' })) : null,
        d.tabs.includes('nutrition') ? h('div.group-row', h('span', 'Calories a day'), stepper(d.kcal, (v) => { d.kcal = v; }, { min: 1200, max: 6000, step: 100, label: 'Calories a day' })) : null,
        d.tabs.includes('nutrition') ? h('div.group-row', h('span', 'Protein a day'), stepper(d.protein, (v) => { d.protein = v; }, { min: 40, max: 400, step: 5, suffix: ' g', label: 'Protein a day (g)' })) : null),
      d.tabs.includes('nutrition') ? h('p.fine', 'Not sure? A common starting point for protein is about 0.7–1 g per lb of body weight. The diet coach in Nutrition can work calories out for you later.') : null,
    ],
    home: () => {
      if (!d.home) d.home = homeFor();
      const avail = HOME_SECTIONS.filter((x) => !NEEDS[x.id] || d.tabs.includes(NEEDS[x.id]));
      return [
        h('h2.setup-title', 'Build your Home page'),
        h('p.setup-sub', 'Pick what you want to see when you open Carver. Change the order later in Settings → Edit Home page.'),
        h('div.group', avail.map((x) => {
          const on = d.home.includes(x.id);
          return h('button.group-row.setup-pick', { onclick: () => { d.home = on ? d.home.filter((y) => y !== x.id) : [...d.home, x.id].sort((a, b) => HOME_SECTIONS.findIndex((q) => q.id === a) - HOME_SECTIONS.findIndex((q) => q.id === b)); draw(); } },
            h('span.pick-check' + (on ? '.on' : ''), on ? icon('check', 16) : null),
            h('span.tab-pick-text', h('span', x.name), h('span.tab-pick-sub', x.sub)));
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
