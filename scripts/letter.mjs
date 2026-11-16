// The Carver C: a blackletter capital written with a broad pen.
//
// Each stroke is a pen path. A broad nib held at a fixed angle is dragged along
// it, so strokes are thick where they cross the nib and hairline-thin where they
// run along it, like real calligraphy. Coordinates are in a 1000 × 1000 box.

const NIB_DEG = 38;   // pen angle (up and to the right)
const nib = (w, deg = NIB_DEG) => [Math.cos((deg * Math.PI) / 180) * w, -Math.sin((deg * Math.PI) / 180) * w];

/** Smooth a few control points into many (Catmull-Rom), so curves look written, not faceted. */
function smooth(pts, per = 10) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * The area a nib of half-width w sweeps along the path: one quadrilateral per step.
 * taper: [start, end] nib scale, so strokes can start or finish on a point.
 */
function stroke(pts, w = 40, { taper = [1, 1], per = 10, angle = NIB_DEG } = {}) {
  const p = smooth(pts, per);
  const polys = [];
  for (let i = 0; i < p.length - 1; i++) {
    const t0 = i / (p.length - 1), t1 = (i + 1) / (p.length - 1);
    const s0 = taper[0] + (taper[1] - taper[0]) * t0, s1 = taper[0] + (taper[1] - taper[0]) * t1;
    const [ax, ay] = nib(w * s0, angle), [bx, by] = nib(w * s1, angle);
    const [x0, y0] = p[i], [x1, y1] = p[i + 1];
    polys.push([[x0 + ax, y0 + ay], [x1 + bx, y1 + by], [x1 - bx, y1 - by], [x0 - ax, y0 - ay]]);
  }
  return polys;
}

/** A hairline drawn with the corner of the nib: a thin line that tapers to points. */
function hair(pts, w = 5) {
  const p = smooth(pts, 12);
  const left = [], right = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (p.length - 1), s = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.6;
    left.push([p[i][0] - dy * s, p[i][1] + dx * s]);
    right.push([p[i][0] + dy * s, p[i][1] - dx * s]);
  }
  return [[...left, ...right.reverse()]];
}

/** The gold shapes that make up the C. */
export function letterC() {
  return [
    // Main stem: a pen-entry flag at the top left, then down with a slight bow
    ...stroke([[350, 330], [400, 300], [440, 292]], 34, { taper: [0.2, 1], angle: 60 }),
    ...stroke([[446, 296], [442, 420], [432, 560], [430, 650], [440, 700]], 62, { taper: [0.85, 1] }),
    // Foot: a heavy wedge down and to the right, ending in a point, then a hairline flicking up
    ...stroke([[432, 680], [470, 728], [520, 776]], 58, { taper: [1, 0.12], angle: 50 }),
    ...hair([[516, 774], [570, 738], [640, 676], [690, 640]], 6),
    // Head: from the top of the stem, a broad arch over to the right and down
    ...stroke([[452, 302], [500, 266], [556, 234], [604, 246], [620, 296]], 54, { taper: [0.9, 0.55], angle: 22 }),
    ...hair([[618, 298], [608, 344], [578, 360], [560, 342], [572, 322]], 5),
    // Lower right: a broad flag on the right that narrows as it sweeps back towards the foot
    ...hair([[560, 612], [612, 578], [664, 556]], 5),
    ...stroke([[664, 556], [642, 606], [606, 652], [566, 694]], 50, { taper: [1, 0.15], angle: -22 }),
    // The spine: a fine hairline rising above the stem
    ...hair([[500, 192], [492, 250], [484, 318]], 6),
  ];
}

/** A hairline carved into the stem (drawn in the background colour over the gold). */
export function carveC() {
  return hair([[486, 300], [474, 420], [466, 540], [462, 610]], 4.5);
}

/** SVG path data for a list of polygons. */
const area = (q) => q.reduce((a, [x, y], i) => { const [x2, y2] = q[(i + 1) % q.length]; return a + x * y2 - x2 * y; }, 0);
/** Every shape wound the same way, so overlaps add up instead of cancelling into holes. */
export const polysToPath = (polys) => polys.map((q) => (area(q) < 0 ? [...q].reverse() : q)).map((q) => 'M' + q.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z').join('');
