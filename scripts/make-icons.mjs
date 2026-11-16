// Draws the Carver logo and saves the app icons and iPhone launch screens into icons/.
//
// The C is a blackletter capital drawn with a broad pen (see letter.mjs), in gold foil on black.
//
//   cd scripts && npm install && cd .. && node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { letterC, carveC, polysToPath } from './letter.mjs';

const OUT = new URL('../icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const GOLD = polysToPath(letterC());
const CARVE = polysToPath(carveC());
const NUDGE = 'translate(-22 14)';   // centre the letter's visual weight

function logoSVG(w, h, { size = 1, rounded = false } = {}) {
  const k = (Math.min(w, h) * size) / 1000;
  const tx = w / 2 - 500 * k, ty = h / 2 - 500 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%">
      <stop offset="0" stop-color="#1d1910"/><stop offset=".55" stop-color="#080807"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <radialGradient id="glow" cx="500" cy="490" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e3b04b" stop-opacity=".16"/><stop offset="1" stop-color="#e3b04b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="foil" x1="360" y1="190" x2="660" y2="790" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff2c0"/><stop offset=".25" stop-color="#f1c862"/><stop offset=".5" stop-color="#cf9533"/>
      <stop offset=".68" stop-color="#efc461"/><stop offset="1" stop-color="#9b6a1c"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" ${rounded ? `rx="${w * 0.225}"` : ''} fill="url(#bg)"/>
  <g transform="translate(${tx} ${ty}) scale(${k})">
    <circle cx="500" cy="490" r="420" fill="url(#glow)"/>
    <g transform="${NUDGE}">
      <path d="${GOLD}" fill="#3a2706" transform="translate(6 9)"/>
      <path d="${GOLD}" fill="url(#foil)"/>
      <path d="${CARVE}" fill="#0b0a08"/>
    </g>
  </g>
</svg>`;
}

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

// Icon artwork at 1024 (iOS rounds the corners itself)
writeFileSync(new URL('icon.svg', OUT), logoSVG(1024, 1024, { size: 1.18, rounded: true }));
const icon = logoSVG(1024, 1024, { size: 1.18 });
for (const s of [180, 192, 512, 1024]) writeFileSync(new URL(`icon-${s}.png`, OUT), png(icon, s));

// Launch screens: black with the C in the middle
const SPLASH = [[1320, 2868], [1206, 2622], [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [1242, 2688], [828, 1792], [750, 1334]];
for (const [w, h] of SPLASH) writeFileSync(new URL(`splash-${w}x${h}.png`, OUT), png(logoSVG(w, h, { size: 0.55 }), w));
console.log('Icons written to icons/');
