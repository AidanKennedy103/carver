// Food icons. Most foods use an emoji; where no emoji fits (a protein bar isn't a
// chocolate bar, a protein shake isn't a soda), the food's icon is 'svg:<name>'
// and one of these small drawings is used instead. All drawn on a 32 × 32 grid.

import { h } from './ui.js';

const I = {
  // Protein powder tub with a scoop
  powder: '<rect x="7" y="9" width="18" height="19" rx="3" fill="#1f2937"/><rect x="6" y="5" width="20" height="6" rx="2" fill="#e3b04b"/><rect x="10" y="14" width="12" height="8" rx="1.5" fill="#f3f4f6"/><path d="M12 18h8" stroke="#1f2937" stroke-width="1.6" stroke-linecap="round"/>',
  // Shaker bottle
  shaker: '<path d="M10 11h12l-1.5 17a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z" fill="#e8e3da"/><path d="M10.6 17h10.8l-.9 10.5a1.5 1.5 0 0 1-1.5 1.4h-5.9a1.5 1.5 0 0 1-1.5-1.4z" fill="#8a5a3b"/><rect x="9" y="7" width="14" height="5" rx="1.5" fill="#2f2f35"/><rect x="13" y="3" width="6" height="5" rx="1.5" fill="#2f2f35"/>',
  // Protein bar in a wrapper
  proteinbar: '<path d="M4 11l3 2v6l-3 2zM28 11l-3 2v6l3 2z" fill="#b8862a"/><rect x="6" y="11" width="20" height="10" rx="2" fill="#e3b04b"/><rect x="9" y="13.5" width="14" height="5" rx="1" fill="#2a1d0c"/><path d="M11 16h10" stroke="#e3b04b" stroke-width="1.2" stroke-linecap="round"/>',
  // Granola bar: oats and nuts showing
  granolabar: '<rect x="5" y="11" width="22" height="10" rx="3" fill="#c9954a"/><circle cx="10" cy="15" r="1.6" fill="#8a5a24"/><circle cx="15" cy="18" r="1.4" fill="#f1d9a7"/><circle cx="19" cy="14" r="1.6" fill="#8a5a24"/><circle cx="23" cy="17.5" r="1.3" fill="#f1d9a7"/><circle cx="12.5" cy="19" r="1" fill="#6b3f17"/>',
  // Block of tofu
  tofu: '<path d="M6 13l9-5 11 4v10l-9 5-11-4z" fill="#f5f0e1"/><path d="M6 13l11 4v10l-11-4z" fill="#e2d9c2"/><path d="M17 17l9-5v10l-9 5z" fill="#efe7d2"/>',
  // Tempeh: speckled block
  tempeh: '<path d="M6 13l9-5 11 4v10l-9 5-11-4z" fill="#c8a46e"/><path d="M6 13l11 4v10l-11-4z" fill="#a9844f"/><circle cx="11" cy="20" r="1.1" fill="#e9d3a3"/><circle cx="14" cy="23" r="1" fill="#e9d3a3"/><circle cx="21" cy="19" r="1.1" fill="#7c5b2e"/><circle cx="16" cy="12" r="1" fill="#e9d3a3"/><circle cx="20" cy="13" r="1" fill="#e9d3a3"/>',
  // Plum
  plum: '<path d="M16 9c6 0 10 4 10 10s-4.5 9-10 9-10-3-10-9 4-10 10-10z" fill="#6b2d74"/><path d="M16 9c-1 5-1 13 0 19" stroke="#4e1f56" stroke-width="1.4" fill="none"/><path d="M16 9c0-2 1-4 3-5" stroke="#5b3a1f" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="11" cy="15" rx="2" ry="3" fill="#8f4a99" opacity=".8"/>',
  // Dates
  dates: '<ellipse cx="12" cy="18" rx="5" ry="8" fill="#6b3a1c" transform="rotate(-20 12 18)"/><ellipse cx="20" cy="16" rx="5" ry="8" fill="#80461f" transform="rotate(18 20 16)"/><path d="M19 11c1 3 1 7 0 10" stroke="#a96a3a" stroke-width="1.2" fill="none"/>',
  // Jar of mayo
  jar: '<rect x="8" y="10" width="16" height="18" rx="4" fill="#f7f1dc"/><rect x="9" y="6" width="14" height="5" rx="1.5" fill="#2e7dd1"/><rect x="10" y="15" width="12" height="7" rx="1.5" fill="#2e7dd1" opacity=".85"/>',
  // Cauliflower
  cauliflower: '<path d="M8 22c-3-4 1-9 4-8 0-4 6-5 8-2 3-2 7 1 6 5 3 2 1 7-2 6z" fill="#f4efe0"/><circle cx="12" cy="17" r="1.2" fill="#ddd3b8"/><circle cx="17" cy="15" r="1.2" fill="#ddd3b8"/><circle cx="21" cy="18" r="1.2" fill="#ddd3b8"/><path d="M7 21c4 2 14 3 19 0l-3 7H10z" fill="#4c9a3f"/>',
  // Celery stalks
  celery: '<path d="M11 28V12M16 28V9M21 28V12" stroke="#8cc63f" stroke-width="4" stroke-linecap="round"/><path d="M8 11c1-4 5-5 6-2M14 8c1-4 5-4 6-1M19 11c1-3 5-3 6 0" stroke="#4c9a3f" stroke-width="3" stroke-linecap="round" fill="none"/>',
  // Brussels sprouts
  brussels: '<circle cx="12" cy="19" r="7" fill="#7cb342"/><path d="M12 12c-3 3-3 11 0 14" stroke="#558b2f" stroke-width="1.4" fill="none"/><circle cx="21" cy="15" r="6" fill="#9ccc65"/><path d="M21 9c3 2 3 10 0 12" stroke="#689f38" stroke-width="1.4" fill="none"/>',
  // Bottle of sports drink
  sportsdrink: '<rect x="11" y="4" width="10" height="4" rx="1.5" fill="#f5f5f5"/><path d="M10 9h12l1 4v13a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V13z" fill="#29b6f6"/><rect x="9" y="15" width="14" height="7" fill="#f57c00"/>',
  // Can (energy drink)
  can: '<rect x="9" y="6" width="14" height="22" rx="3" fill="#1c1c22"/><rect x="10" y="5" width="12" height="3" rx="1.5" fill="#9e9e9e"/><path d="M17 10l-4 7h3l-1 6 5-8h-3l1-5z" fill="#e3b04b"/>',
  // Bowl of hummus
  hummus: '<path d="M4 16h24a12 9 0 0 1-24 0z" fill="#e9e4dc"/><ellipse cx="16" cy="16" rx="12" ry="3.5" fill="#e3c28a"/><ellipse cx="16" cy="16" rx="5" ry="1.6" fill="#c9a24a"/><circle cx="13" cy="15.5" r=".9" fill="#7a5a20"/><circle cx="19" cy="16.5" r=".9" fill="#7a5a20"/>',
  // Yogurt cup
  yogurt: '<path d="M8 10h16l-2 17a2 2 0 0 1-2 1.8h-8a2 2 0 0 1-2-1.8z" fill="#f8f8f8"/><rect x="7" y="7" width="18" height="4" rx="1.5" fill="#5c9ded"/><rect x="9.3" y="15" width="13.4" height="6" fill="#5c9ded" opacity=".85"/>',
  // Tub (cottage cheese, sour cream)
  tub: '<path d="M7 12h18l-2 14a2 2 0 0 1-2 1.8H11a2 2 0 0 1-2-1.8z" fill="#f4f4f4"/><ellipse cx="16" cy="12" rx="9" ry="3" fill="#cfd8dc"/><rect x="9" y="17" width="14" height="5" fill="#7e57c2" opacity=".8"/>',
  // Burrito bowl
  bowl: '<path d="M4 15h24a12 10 0 0 1-24 0z" fill="#2f2f35"/><ellipse cx="16" cy="15" rx="12" ry="4" fill="#f4e7c5"/><circle cx="11" cy="14.5" r="2.2" fill="#c0392b"/><circle cx="16" cy="13.5" r="2" fill="#6d4c41"/><circle cx="21" cy="14.8" r="2.2" fill="#7cb342"/><circle cx="14" cy="16.5" r="1.5" fill="#f2c94c"/>',
  // Can (canned fish)
  tin: '<ellipse cx="16" cy="12" rx="10" ry="4" fill="#bdbdbd"/><path d="M6 12v9c0 2.2 4.5 4 10 4s10-1.8 10-4v-9c0 2.2-4.5 4-10 4S6 14.2 6 12z" fill="#2e7dd1"/><path d="M11 19c3-2 7-2 10 0-3 2-7 2-10 0z" fill="#f5f5f5"/>',
};

/** A food's icon as an element (emoji text, or one of the drawings above). */
export function foodIcon(icon) {
  if (typeof icon === 'string' && icon.startsWith('svg:') && I[icon.slice(4)]) {
    const s = h('span.food-svg', { 'aria-hidden': 'true' });
    s.innerHTML = `<svg viewBox="2 2 28 28" width="1.25em" height="1.25em">${I[icon.slice(4)]}</svg>`;
    return s;
  }
  return icon || '🍽️';
}
