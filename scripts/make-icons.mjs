// Draws the Carver logo (a chiselled gold C on black) and saves the app icons
// and iPhone launch screens into icons/.
//
//   cd scripts && npm install && cd .. && node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const OUT = new URL('../icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// ---- The C ----
// A thick ring with the opening on the right. The cut ends are slanted, and the
// ring is split into a lit outer face and a shaded inner face, like a letter
// carved into stone with a V-groove.
const R_OUT = 330, R_MID = 262, R_IN = 196;
const A_OUT = 44, A_IN = 56;   // where the ends are cut (degrees from the right, outer and inner edge)

function cPaths(cx, cy, s = 1) {
  const pt = (r, deg) => [cx + r * s * Math.cos((deg * Math.PI) / 180), cy + r * s * Math.sin((deg * Math.PI) / 180)];
  // A point on the slanted cut at radius r: blend between the outer and inner cut points
  const cut = (r, sign) => {
    const t = (R_OUT - r) / (R_OUT - R_IN);
    const deg = A_OUT + (A_IN - A_OUT) * t;
    return pt(r, sign * deg);
  };
  const f = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const band = (r1, r2) => {
    const a = cut(r1, -1), b = cut(r1, 1), c = cut(r2, 1), d = cut(r2, -1);
    return `M${f(a)} A${r1 * s} ${r1 * s} 0 1 0 ${f(b)} L${f(c)} A${r2 * s} ${r2 * s} 0 1 1 ${f(d)} Z`;
  };
  return { outer: band(R_OUT, R_MID), inner: band(R_MID, R_IN) };
}

function logoSVG(w, h, { scale = 1, rounded = false, glow = true } = {}) {
  const cx = w / 2, cy = h / 2;
  const { outer, inner } = cPaths(cx, cy, scale);
  const r = R_OUT * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#17140e"/><stop offset=".6" stop-color="#060606"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <linearGradient id="lit" x1="${cx - r}" y1="${cy - r}" x2="${cx + r * 0.6}" y2="${cy + r}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#f2c75e"/><stop offset=".75" stop-color="#c8922c"/><stop offset="1" stop-color="#8a5f17"/>
    </linearGradient>
    <linearGradient id="shade" x1="${cx + r * 0.6}" y1="${cy + r}" x2="${cx - r}" y2="${cy - r}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffe08a"/><stop offset=".4" stop-color="#d9a13b"/><stop offset=".8" stop-color="#8f6216"/><stop offset="1" stop-color="#5e3f0c"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#e3b04b" stop-opacity=".22"/><stop offset="1" stop-color="#e3b04b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" ${rounded ? `rx="${w * 0.225}"` : ''} fill="url(#bg)"/>
  ${glow ? `<circle cx="${cx}" cy="${cy}" r="${r * 1.45}" fill="url(#glow)"/>` : ''}
  <path d="${outer}" fill="url(#lit)"/>
  <path d="${inner}" fill="url(#shade)"/>
</svg>`;
}

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

// Icon artwork at 1024 (iOS rounds the corners itself)
const icon = logoSVG(1024, 1024, { scale: 0.92 });
writeFileSync(new URL('icon.svg', OUT), logoSVG(1024, 1024, { scale: 0.92, rounded: true }));
for (const size of [180, 192, 512, 1024]) writeFileSync(new URL(`icon-${size}.png`, OUT), png(icon, size));

// Launch screens: black with the C in the middle
const SPLASH = [[1320, 2868], [1206, 2622], [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [1242, 2688], [828, 1792], [750, 1334]];
for (const [w, h] of SPLASH) {
  const svg = logoSVG(w, h, { scale: (w * 0.32) / (R_OUT * 2) });
  writeFileSync(new URL(`splash-${w}x${h}.png`, OUT), png(svg, w));
}
console.log('Icons written to icons/');
