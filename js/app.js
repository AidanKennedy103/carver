// Carver: start-up.

import { initScreens, top } from './ui.js';
import { state, onChange } from './store.js';
import { initTabs } from './tabs.js';
import { homePage } from './home.js';
import { workoutPage } from './workout.js';
import { nutritionPage } from './nutrition.js';
import { fitnessPage } from './fitness.js';
import { socialPage } from './social.js';
import { habitsPage } from './habits.js';
import { coachPage } from './coach.js';
import { recoveryPage } from './recovery.js';
import { progressPage } from './progress.js';
import { openWorkout } from './session.js';
import { initCloud } from './cloud.js';

initScreens(document.getElementById('app'));
initTabs({ home: homePage, workout: workoutPage, nutrition: nutritionPage, fitness: fitnessPage, social: socialPage, habits: habitsPage, coach: coachPage, recovery: recoveryPage, body: () => progressPage({ tab: true }) });

// Redraw the main page when data changes (only if it's showing)
onChange(() => top()?.refresh?.());

initCloud();

// Came back to an unfinished workout? Open it straight away.
if (state.active) openWorkout();

// Offline support and automatic updates
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
  });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Don't yank the screen out from under someone mid-set
    if (reloaded || state.active) return;
    reloaded = true;
    location.reload();
  });
}
