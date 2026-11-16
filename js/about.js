// About & privacy: what Carver stores and where, where its food data comes
// from (with the credits its licenses ask for), and the health disclaimer.

import { h, navBar } from './ui.js';
import { enabled } from './cloud.js';

export function aboutScreen() {
  const sec = (title, ...body) => [h('div.section-head', h('h2.section-title', title)), h('section.card.about-card', ...body)];
  const p = (t) => h('p', t);
  const el = h('div.page',
    navBar({ title: 'About & privacy', backLabel: 'Back', large: true }),
    h('div.scroll-body.about',
      sec('Not medical advice',
        p('Carver is a tracking tool. Calorie and macro suggestions, the maintenance estimate and nutrient targets are general estimates, not medical or nutrition advice. Talk to a doctor or registered dietitian before big changes to how you eat or train, especially if you’re pregnant, under 18, have a medical condition, or have a history of disordered eating.')),

      sec('Your data',
        p('Without an account, everything you log stays on this device: workouts, food, weight, activities and goals in the app’s storage, progress photos in the device’s photo store. Nothing is sent anywhere.'),
        enabled() ? p('With an account, your data is also stored in Carver’s database (Supabase) so your devices stay in sync. Progress photos are kept in private storage only you can open. Groups see only what you choose to share with them under “What I share”.') : null,
        enabled() ? p('Foods you add to the shared database can be seen by everyone, without your name. Everything else is private to your account.') : null,
        p('Carver has no ads and doesn’t sell or share your data.'),
        enabled() ? p('To delete everything, use Settings → Account → Delete account. You can export a copy first under Settings → Your data.') : p('To delete everything, use Settings → Erase all data.')),

      sec('Food data',
        p('Starter foods use approximate values from USDA FoodData Central (public domain).'),
        h('p', 'Barcode and online lookups use ', h('a', { href: 'https://world.openfoodfacts.org', target: '_blank', rel: 'noopener' }, 'Open Food Facts'),
          ', a free database built by volunteers. Its data is available under the ', h('a', { href: 'https://opendatacommons.org/licenses/odbl/1-0/', target: '_blank', rel: 'noopener' }, 'Open Database License'),
          '; product images under Creative Commons BY-SA. Please check numbers against the label.'),
        p('Values are estimates and may be wrong or incomplete.')),

      sec('Open-source parts',
        p('Barcode reading on iPhone uses ZXing (Apache License 2.0). Sign-in and sync use supabase-js (MIT License). Thank you to their authors.')),

      h('p.fine.center', 'Carver beta'),
      h('div.bottom-space'),
    ));
  return { el };
}
