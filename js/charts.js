// Small SVG charts: line (over time), bars (per day/week) and activity rings.
// Thin marks, recessive axes, a tap/drag tooltip on every chart.
//
// Series colors were checked with the dataviz palette validator against the
// dark card surface (#111113): lightness band, colour-blind separation, contrast.

import { h } from './ui.js';

export const COLORS = {
  gold: '#e3b04b',          // single-series lines (brand accent)
  gym: '#b8862a',           // ring order: gym, calories, protein, custom (validated adjacent)
  calories: '#16917f',
  protein: '#d9503c',
  custom: '#8a5fd6',
  carbs: '#2e8bd8',         // macros: protein, carbs, fat (validated)
  fat: '#b8862a',
};

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  return el;
};

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= step0) || step0;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

/** Least-squares line through [{ x: ms, y }]: { slope (per day), at(x) }, or null with fewer than 3 points or under a week. */
export function linFit(data) {
  if (data.length < 3) return null;
  const n = data.length, xm = data.reduce((a, d) => a + d.x, 0) / n, ym = data.reduce((a, d) => a + d.y, 0) / n;
  let sxy = 0, sxx = 0;
  for (const d of data) { sxy += (d.x - xm) * (d.y - ym); sxx += (d.x - xm) ** 2; }
  if (!sxx || data[n - 1].x - data[0].x < 7 * 864e5) return null;
  const b = sxy / sxx;
  return { slope: b * 864e5, at: (x) => ym + b * (x - xm), x0: data[0].x, x1: data[n - 1].x };
}

/** "Trending −0.4 lb a week" under a chart with a best-fit line. */
export function fitNote(data, unit) {
  const f = linFit(data);
  if (!f) return null;
  const r1 = (v) => Math.round(v * 10) / 10;
  const [v, per] = Math.abs(r1(f.slope * 7)) >= 0.1 ? [r1(f.slope * 7), 'a week'] : [r1(f.slope * 30), 'a month'];
  return h('p.fit-note', h('i'), h('span', ...(v === 0 ? ['Trend: holding steady'] : ['Trending ', h('b', `${v > 0 ? '+' : '−'}${Math.abs(v)} ${unit}`.trim()), ` ${per}`])));
}

/** Attach a tooltip that follows the finger/mouse to the nearest point. */
/** sticky: a tap keeps its point picked until you tap off the chart. */
function addTooltip(wrap, svg, pts, W, render, onSelect = null, sticky = false) {
  const tip = h('div.chart-tip');
  const cross = s('line', { class: 'chart-cross', y1: 0, y2: '100%' });
  const dot = s('circle', { r: 5, class: 'chart-hover-dot' });
  cross.style.display = dot.style.display = 'none';
  svg.append(cross, dot);
  wrap.append(tip);
  const show = (clientX) => {
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    let best = pts[0], bd = Infinity;
    for (const p of pts) { const d = Math.abs(p.px - x); if (d < bd) { bd = d; best = p; } }
    cross.setAttribute('x1', best.px); cross.setAttribute('x2', best.px);
    dot.setAttribute('cx', best.px); dot.setAttribute('cy', best.py);
    cross.style.display = dot.style.display = '';
    if (onSelect) { onSelect(best); return; }   // the page shows the point itself
    tip.innerHTML = render(best);
    tip.classList.add('show');
    const box = wrap.getBoundingClientRect();
    const left = r.left - box.left + (best.px / W) * r.width;
    tip.style.left = Math.max(4, Math.min(box.width - tip.offsetWidth - 4, left - tip.offsetWidth / 2)) + 'px';
  };
  const hide = () => { tip.classList.remove('show'); cross.style.display = dot.style.display = 'none'; onSelect?.(null); };
  svg.addEventListener('pointerdown', (e) => show(e.clientX));
  svg.addEventListener('pointermove', (e) => show(e.clientX));
  if (sticky) {
    const off = (e) => { if (!wrap.isConnected) document.removeEventListener('pointerdown', off, true); else if (!svg.contains(e.target)) hide(); };
    document.addEventListener('pointerdown', off, true);
    return;
  }
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(hide, 1600); });
}

/**
 * Line chart over time.
 * data: [{ x: timestamp, y: number, label? }]
 * opts: { height, color, axes, fmtY, fmtX, tip(point) -> html, goal (y value line), area }
 */
/** The overlay value closest in time to x (within 4 days). */
const nearest = (list, x) => { let b = null, bd = 4 * 864e5; for (const d of list) { const dd = Math.abs(d.x - x); if (dd <= bd) { bd = dd; b = d.y; } } return b; };

export function lineChart(data, opts = {}) {
  const { height = 160, color = COLORS.gold, axes = true, fmtY = (v) => Math.round(v), fmtX = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), goal = null, area = true, dots = true } = opts;
  let W = 340;
  const H = height;
  const padL = axes ? 36 : 4, padR = axes ? 8 : 4, padT = 10, padB = axes ? 22 : 6;
  const wrap = h('div.chart');
  if (!data.length) { wrap.append(h('div.chart-empty', opts.empty || 'No data yet')); return wrap; }
  const ov = opts.overlay?.data?.length > 1 ? opts.overlay : null;   // { data, color, ref, fmt }: a smaller line with its own scale, in the bottom of the chart
  const xs = data.map((d) => d.x).concat(ov ? ov.data.map((d) => d.x) : []), ys = (opts.yFrom?.length ? opts.yFrom : data).map((d) => d.y).concat(goal != null ? [goal] : []);   // yFrom: scale to just these points (e.g. the range in view)
  const fit = opts.fit ? linFit(Array.isArray(opts.fit) ? opts.fit : data) : null;   // a dashed best-fit line: which way you're trending (opts.fit: true, or the points to fit)
  if (fit) ys.push(fit.at(fit.x0), fit.at(fit.x1));
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 864e5 * 3; x1 += 864e5 * 3; }
  // opts.scroll (days): show that many days across, and scroll side to side through the rest (starts at the newest)
  const wide = opts.scroll && axes ? Math.max(1, (x1 - x0) / (opts.scroll * 864e5)) : 1;
  W = 340 * wide;
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const px = (x) => padL + ((x - x0) / (x1 - x0)) * (W - padL - padR);
  const py = (y) => padT + (1 - (y - y0) / (y1 - y0 || 1)) * (H - padT - padB);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': opts.label || 'Chart' });

  if (axes) {
    for (const t of ticks) {
      svg.append(s('line', { x1: padL, x2: W - padR, y1: py(t), y2: py(t), class: 'chart-grid' }));
      const lab = s('text', { x: padL - 6, y: py(t) + 4, class: 'chart-axis', 'text-anchor': 'end' });
      lab.textContent = fmtY(t);
      svg.append(lab);
    }
    const n = Math.min(Math.round(4 * wide), data.length);
    for (let i = 0; i < n; i++) {
      const t = x0 + ((x1 - x0) * i) / Math.max(1, n - 1);
      const lab = s('text', { x: px(t), y: H - 6, class: 'chart-axis', 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' });
      lab.textContent = fmtX(t);
      svg.append(lab);
    }
  }
  if (goal != null) svg.append(s('line', { x1: padL, x2: W - padR, y1: py(goal), y2: py(goal), class: 'chart-goal' }));

  if (ov) {
    // Its own scale in the lower ~40% of the plot, drawn under the main line
    const band = (H - padT - padB) * 0.4, base = H - padB - 3;
    const vals = ov.data.map((d) => d.y).concat(ov.ref != null ? [ov.ref] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 50) { lo -= 25; hi += 25; }
    const oy = (v) => base - ((v - lo) / (hi - lo)) * band;
    if (ov.ref != null) {
      svg.append(s('line', { x1: padL, x2: W - padR, y1: oy(ov.ref), y2: oy(ov.ref), stroke: ov.color, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.7 }));
      if (ov.refLabel) { const t = s('text', { x: W - padR, y: oy(ov.ref) - 4, 'text-anchor': 'end', class: 'chart-axis', fill: ov.color }); t.textContent = ov.refLabel; svg.append(t); }
    }
    const op = ov.data.map((d, i) => `${i ? 'L' : 'M'}${px(d.x).toFixed(1)} ${oy(d.y).toFixed(1)}`).join(' ');
    svg.append(s('path', { d: op, fill: 'none', stroke: ov.color, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.9 }));
  }

  const pts = data.map((d) => ({ ...d, px: px(d.x), py: py(d.y), over: ov ? nearest(ov.data, d.x) : undefined }));
  if (fit) svg.append(s('line', { x1: px(fit.x0), y1: py(fit.at(fit.x0)), x2: px(fit.x1), y2: py(fit.at(fit.x1)), class: 'chart-fit' }));
  // opts.gap (days): a longer break between points starts a new section of the line, like a pause in tracking
  const segs = [];
  for (const p of pts) {
    const prev = segs.length ? segs[segs.length - 1] : null;
    if (prev && !(opts.gap && p.x - prev[prev.length - 1].x > opts.gap * 864e5)) prev.push(p); else segs.push([p]);
  }
  const pathOf = (seg) => seg.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(' ');
  if (area && pts.length > 1) {
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    const grad = s('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(s('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0.25 }), s('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }));
    const defs = s('defs'); defs.append(grad); svg.append(defs);
    for (const seg of segs) if (seg.length > 1) svg.append(s('path', { d: `${pathOf(seg)} L${seg[seg.length - 1].px} ${H - padB} L${seg[0].px} ${H - padB} Z`, fill: `url(#${id})` }));
  }
  for (const seg of segs) if (seg.length > 1) svg.append(s('path', { d: pathOf(seg), fill: 'none', stroke: color, 'stroke-width': opts.gap ? 1.75 : 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  // Every point gets a dot when asked (dots: 'all'); otherwise only on short lines
  const dotR = dots === 'all' ? (pts.length > 90 ? 2.5 : 3.25) : 3.5;
  if (dots === 'all' || (dots && pts.length <= 40)) for (const p of pts) svg.append(s('circle', { cx: p.px, cy: p.py, r: dotR, fill: color, stroke: 'var(--surface)', 'stroke-width': dots === 'all' ? 1.5 : 2 }));
  const mk = opts.mark != null ? pts.find((p) => p.x === opts.mark) : null;   // a point to ring (a PR)
  if (mk) svg.append(s('circle', { cx: mk.px, cy: mk.py, r: 7, fill: 'none', stroke: color, 'stroke-width': 2 }), s('circle', { cx: mk.px, cy: mk.py, r: 3.5, fill: color }));
  let host = wrap;
  if (wide > 1) {
    // The plot scrolls; the weight labels on the left stay put
    host = h('div.chart-scroll-in', { style: { width: `${wide * 100}%` } });
    const scroller = h('div.chart-scroll', host);
    svg.classList.add('scrolls');
    const yAxis = s('svg', { viewBox: `0 0 ${padL} ${H}`, class: 'chart-yaxis', 'aria-hidden': 'true' });
    yAxis.style.width = `${(padL / 340) * 100}%`;
    yAxis.append(s('rect', { x: 0, y: 0, width: padL, height: H - padB + 6, class: 'chart-yaxis-bg' }));
    for (const t of ticks) {
      const lab = s('text', { x: padL - 6, y: py(t) + 4, class: 'chart-axis', 'text-anchor': 'end' });
      lab.textContent = fmtY(t);
      yAxis.append(lab);
    }
    for (const lab of svg.querySelectorAll('text.chart-axis[text-anchor="end"]')) if (+lab.getAttribute('x') === padL - 6) lab.remove();
    wrap.append(scroller, yAxis);
    const ro = new ResizeObserver(() => { if (scroller.clientWidth) { scroller.scrollLeft = opts.startAt ?? scroller.scrollWidth; ro.disconnect(); } });
    ro.observe(scroller);
    // opts.onView({ from, to, left }): the dates in view once you stop scrolling (to refit the scale)
    if (opts.onView) {
      let t = 0;
      scroller.addEventListener('scroll', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const sw = scroller.scrollWidth, toX = (f) => x0 + ((f * W - padL) / (W - padL - padR)) * (x1 - x0);
          opts.onView({ from: toX(scroller.scrollLeft / sw), to: toX((scroller.scrollLeft + scroller.clientWidth) / sw), left: scroller.scrollLeft });
        }, 160);
      }, { passive: true });
    }
  }
  host.append(svg);
  // Pins: [{ x, el, onClick, label }] as small markers in a lane above the plot, at their date
  const pins = (opts.pins || []).filter((p) => p.x >= x0 && p.x <= x1);
  // A pin with a prompt asks first: tap it and a bubble ("View progress pic from Nov 23") opens the item
  if (pins.length) {
    const lane = h('div.chart-pins');
    wrap.classList.add('has-pins');
    let bubble = null;
    const close = () => { bubble?.remove(); bubble = null; lane.querySelector('.chart-pin.on')?.classList.remove('on'); document.removeEventListener('pointerdown', outside, true); };
    const outside = (e) => { if (!lane.contains(e.target)) close(); };
    const ask = (pin, btn) => {
      const same = btn.classList.contains('on');
      close();
      if (same) return;
      const pct = (px(pin.x) / W) * 100;
      bubble = h('button.pin-bubble', { onclick: (e) => { e.stopPropagation(); close(); pin.onClick(); } }, pin.prompt, h('span.pin-go', '›'));
      bubble.style.left = `${pct}%`;
      bubble.style.transform = `translateX(${pct < 25 ? -12 : pct > 75 ? -88 : -50}%)`;
      btn.classList.add('on');
      lane.append(bubble);
      document.addEventListener('pointerdown', outside, true);
    };
    for (const pin of pins) {
      const btn = h('button.chart-pin', { style: { left: `${(px(pin.x) / W) * 100}%` }, 'aria-label': pin.label || 'Pinned item' }, pin.el);
      btn.onclick = () => (pin.prompt ? ask(pin, btn) : pin.onClick());
      lane.append(btn);
    }
    host.insertBefore(lane, svg);
  }
  addTooltip(wrap, svg, pts, W, opts.tip || ((p) => `<b>${fmtY(p.y)}</b><span>${fmtX(p.x)}</span>`), opts.onSelect || null, !!opts.sticky);
  return wrap;
}

/**
 * Bar chart. data: [{ x: label/timestamp, y: number, sub? }]
 * opts: { height, color, goal, fmtY, fmtX, tip }
 */
export function barChart(data, opts = {}) {
  const { height = 160, color = COLORS.gold, goal = null, fmtY = (v) => Math.round(v), fmtX = (x) => x } = opts;
  const W = 340, H = height, padL = 36, padR = 8, padT = 10, padB = 22;
  const wrap = h('div.chart');
  if (!data.length || data.every((d) => !d.y)) { wrap.append(h('div.chart-empty', opts.empty || 'No data yet')); return wrap; }
  const ticks = niceTicks(0, Math.max(...data.map((d) => d.y), goal || 0));
  const y1 = ticks[ticks.length - 1];
  const py = (y) => padT + (1 - y / (y1 || 1)) * (H - padT - padB);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': opts.label || 'Chart' });
  for (const t of ticks) {
    svg.append(s('line', { x1: padL, x2: W - padR, y1: py(t), y2: py(t), class: 'chart-grid' }));
    const lab = s('text', { x: padL - 6, y: py(t) + 4, class: 'chart-axis', 'text-anchor': 'end' });
    lab.textContent = fmtY(t);
    svg.append(lab);
  }
  const slot = (W - padL - padR) / data.length;
  const bw = Math.max(2, Math.min(22, slot - 2));   // 2px surface gap between bars
  const pts = data.map((d, i) => ({ ...d, px: padL + slot * i + slot / 2, py: py(d.y) }));
  for (const p of pts) {
    if (!p.y) continue;
    const top = p.py, base = py(0), r = Math.min(4, bw / 2, base - top);
    // Rounded top, square base
    svg.append(s('path', {
      d: `M${p.px - bw / 2} ${base} V${top + r} Q${p.px - bw / 2} ${top} ${p.px - bw / 2 + r} ${top} H${p.px + bw / 2 - r} Q${p.px + bw / 2} ${top} ${p.px + bw / 2} ${top + r} V${base} Z`,
      fill: p.color || color, opacity: p.dim ? 0.45 : 1,
    }));
  }
  if (goal != null) svg.append(s('line', { x1: padL, x2: W - padR, y1: py(goal), y2: py(goal), class: 'chart-goal' }));
  const every = Math.ceil(data.length / 6);
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    if (i % every && !last) return;
    if (!last && pts.length - 1 - i < every * 0.75) return;   // don't crowd the last label
    const lab = s('text', { x: p.px, y: H - 6, class: 'chart-axis', 'text-anchor': 'middle' });
    lab.textContent = fmtX(p.x);
    svg.append(lab);
  });
  wrap.append(svg);
  addTooltip(wrap, svg, pts, W, opts.tip || ((p) => `<b>${fmtY(p.y)}</b><span>${fmtX(p.x)}</span>`));
  return wrap;
}

/** A tiny trend line with no axes (for cards). */
export function sparkline(values, { color = COLORS.gold, height = 36 } = {}) {
  const W = 120, H = height;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  if (values.length < 2) return svg;
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (W - 4), 3 + (1 - (v - lo) / (hi - lo || 1)) * (H - 6)]);
  svg.append(s('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }));
  const last = pts[pts.length - 1];
  svg.append(s('circle', { cx: last[0], cy: last[1], r: 3, fill: color }));
  return svg;
}

/**
 * Concentric activity rings. rings: [{ value, goal, color, label }], outermost first.
 * A ring past 100% keeps going round, a little darker, like Apple's.
 */
export function rings(list, size = 150) {
  const stroke = Math.max(10, Math.min(16, size / (list.length * 2.6)));
  const gap = 3;
  const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'rings', role: 'img', 'aria-label': list.map((r) => `${r.label} ${Math.round((r.value / r.goal) * 100) || 0}%`).join(', ') });
  list.forEach((r, i) => {
    const rad = size / 2 - stroke / 2 - i * (stroke + gap);
    if (rad <= stroke / 2) return;
    const C = 2 * Math.PI * rad;
    const frac = r.goal ? Math.max(0, r.value / r.goal) : 0;
    const g = s('g', { transform: `rotate(-90 ${size / 2} ${size / 2})` });
    g.append(s('circle', { cx: size / 2, cy: size / 2, r: rad, fill: 'none', stroke: r.color, 'stroke-opacity': 0.18, 'stroke-width': stroke }));
    const shown = Math.min(frac, 1);
    if (shown > 0) {
      const arc = s('circle', { cx: size / 2, cy: size / 2, r: rad, fill: 'none', stroke: r.color, 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-dasharray': `${C * shown} ${C}`, class: 'ring-arc' });
      arc.style.setProperty('--len', C * shown);
      g.append(arc);
    }
    if (frac > 1) {
      const extra = Math.min(frac - 1, 1);
      g.append(s('circle', { cx: size / 2, cy: size / 2, r: rad, fill: 'none', stroke: r.color, 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-dasharray': `${C * extra} ${C}`, filter: 'brightness(0.8)', style: 'filter: brightness(.75) drop-shadow(0 0 2px rgba(0,0,0,.6))' }));
    }
    svg.append(g);
  });
  return svg;
}
