// Draws the Carver logo and saves the app icons and iPhone launch screens into icons/.
//
// The C is a faceted, carved gold octagon on black.
//
//   cd scripts && npm install && cd .. && node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const OUT = new URL('../icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// Geometry in a 1000-unit box centred on 500,500.
// The C is an octagon cut like a gem: every side has two facets meeting at a sharp
// ridge (a V-groove, the way letters are carved in stone). Light comes from the top
// left, so each facet gets its own shade of gold from the way it faces.
const SIDES = 8;
const RO = 360, RM = 268, RI = 196;   // outer edge, ridge, inner edge (circumradius)
const GAP = 34;                       // the opening on the right, degrees either side of 3 o'clock
const LIGHT = norm([-0.55, -0.83]);

function norm([x, y]) { const l = Math.hypot(x, y); return [x / l, y / l]; }
const rad = (deg) => (deg * Math.PI) / 180;
const vert = (R, i) => { const a = rad(i * (360 / SIDES) + 180 / SIDES); return [500 + R * Math.cos(a), 500 + R * Math.sin(a)]; };
/** Where a ray at angle deg leaves an octagon of circumradius R. */
function onPoly(R, deg) {
  const step = 360 / SIDES;
  const i = Math.floor(((deg - step / 2) % 360 + 360) % 360 / step);
  const [ax, ay] = vert(R, i), [bx, by] = vert(R, i + 1);
  const dx = Math.cos(rad(deg)), dy = Math.sin(rad(deg));
  const ex = bx - ax, ey = by - ay;
  const t = ((ax - 500) * ey - (ay - 500) * ex) / (dx * ey - dy * ex);
  return [500 + t * dx, 500 + t * dy];
}
function gold(b) {   // 0 = deep shadow, 1 = highlight
  const stops = [[0, [74, 48, 10]], [0.35, [150, 102, 30]], [0.6, [214, 160, 60]], [0.82, [245, 205, 110]], [1, [255, 243, 200]]];
  for (let i = 1; i < stops.length; i++) if (b <= stops[i][0]) {
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], t = (b - t0) / (t1 - t0);
    return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * t)).join(',')})`;
  }
  return 'rgb(255,243,200)';
}
// How bright a facet is: its normal tipped towards the viewer, dotted with the light
const shade = ([nx, ny], tilt = 0.75) => {
  const z = tilt, l = Math.hypot(nx, ny, z);
  const [lx, ly] = LIGHT, lz = 0.9, ll = Math.hypot(lx, ly, lz);
  return 0.18 + 0.82 * Math.max(0, Math.min(1, ((nx * lx + ny * ly + z * lz) / (l * ll) - 0.35) / 0.65));
};

function facets() {
  // Angles along the C: from the top cut, round the left, to the bottom cut, with every corner in between
  const step = 360 / SIDES;
  const start = GAP, end = 360 - GAP;
  const angles = [start];
  for (let k = 0; k < SIDES; k++) { const a = k * step + step / 2; if (a > start && a < end) angles.push(a); }
  angles.push(end);
  const f = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const out = [];
  for (let i = 0; i < angles.length - 1; i++) {
    const a0 = angles[i], a1 = angles[i + 1];
    const o0 = onPoly(RO, a0), o1 = onPoly(RO, a1), m0 = onPoly(RM, a0), m1 = onPoly(RM, a1), i0 = onPoly(RI, a0), i1 = onPoly(RI, a1);
    const mid = rad((a0 + a1) / 2), side = Math.round(((a0 + a1) / 2 - step / 2) / step) * step + step / 2 - step / 2;
    const n = [Math.cos(rad(side + step / 2)), Math.sin(rad(side + step / 2))];   // the side's outward normal
    void mid;
    out.push(`<polygon points="${f(o0)} ${f(o1)} ${f(m1)} ${f(m0)}" fill="${gold(shade(n))}"/>`);
    out.push(`<polygon points="${f(m0)} ${f(m1)} ${f(i1)} ${f(i0)}" fill="${gold(shade([-n[0], -n[1]]))}"/>`);
  }
  // The two cut ends: flat faces, lit from above at the top, in shadow at the bottom
  const cap = (deg, b) => `<polygon points="${f(onPoly(RO, deg))} ${f(onPoly(RM, deg))} ${f(onPoly(RI, deg))}" fill="${gold(b)}"/>`;
  out.push(cap(start, 0.5), cap(end, 0.3));
  return out.join('\n    ');
}

function logoSVG(w, h, { size = 1, rounded = false } = {}) {
  const k = (Math.min(w, h) * size) / 1000;
  const tx = w / 2 - 500 * k, ty = h / 2 - 500 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%">
      <stop offset="0" stop-color="#1d1910"/><stop offset=".55" stop-color="#080807"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <radialGradient id="glow" cx="500" cy="500" r="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e3b04b" stop-opacity=".18"/><stop offset=".6" stop-color="#e3b04b" stop-opacity=".04"/><stop offset="1" stop-color="#e3b04b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" ${rounded ? `rx="${w * 0.225}"` : ''} fill="url(#bg)"/>
  <g transform="translate(${tx} ${ty}) scale(${k})">
    <circle cx="500" cy="500" r="560" fill="url(#glow)"/>
    <g stroke-linejoin="round" stroke-width="1.2" stroke="rgba(0,0,0,.25)">
    ${facets()}
    </g>
  </g>
</svg>`;
}

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

// Icon artwork at 1024 (iOS rounds the corners itself)
writeFileSync(new URL('icon.svg', OUT), logoSVG(1024, 1024, { size: 0.92, rounded: true }));
const icon = logoSVG(1024, 1024, { size: 0.92 });
for (const s of [180, 192, 512, 1024]) writeFileSync(new URL(`icon-${s}.png`, OUT), png(icon, s));

// Launch screens: black with the C in the middle
const SPLASH = [[1320, 2868], [1206, 2622], [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [1242, 2688], [828, 1792], [750, 1334]];
for (const [w, h] of SPLASH) writeFileSync(new URL(`splash-${w}x${h}.png`, OUT), png(logoSVG(w, h, { size: 0.42 }), w));
console.log('Icons written to icons/');
