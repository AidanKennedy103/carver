// Small UI toolkit: element builder, screen stack (iOS-style push/pop),
// bottom sheets, action sheets, confirm dialogs and toasts.

export function h(tag, attrs = {}, ...kids) {
  // The second argument is optional: h('p', 'text') and h('div', child) work too
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs != null) kids.unshift(attrs);
    attrs = {};
  }
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export const icon = (name, size = 22) => {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.8-7.8.4 2 1.6 3.2 2.7 3.6C12 7.8 13 5 15.5 3c-.2 3.4 3 5.9 3 10.8C18.5 18.2 15.9 21 12 21z"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0l-2 2.5"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2v.1"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    scan: '<path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M8 9v6M11 9v6M14 9v6M17 9v6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    plate: '<circle cx="12" cy="12" r="5.5"/><path d="M3 5v5a2 2 0 0 0 2 2v7M3 5v4M5 5v4M21 5c-1.5 0-2.5 2-2.5 5h2.5v9"/>',
    minus: '<path d="M5 12h14"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3.5 3.5 0 0 0 3.6 4M16 6h3.5a3.5 3.5 0 0 1-3.6 4M12 13v4M8.5 20h7M10 17h4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    dumbbell: '<path d="M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 4v4.5H8M12 8v4l3 2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z"/>',
    apple: '<path d="M12 7.5c-1.6-1.2-4.6-1.4-6 .6-1.8 2.5-.8 7.3 1.4 10.3 1.2 1.6 2.6 2.4 4.6 1.4 2 1 3.4.2 4.6-1.4 2.2-3 3.2-7.8 1.4-10.3-1.4-2-4.4-1.8-6-.6z"/><path d="M12 7.5c0-2 1-3.5 3-4"/>',
    activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  };
  const s = h('span.icon', { 'aria-hidden': 'true' });
  s.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
  return s;
};

// ---------- Screen stack ----------

const stack = [];
let root;

export function initScreens(el) { root = el; }

/**
 * Show a screen. `build` returns { el, onShow?, onHide?, refresh? }.
 * replace=true swaps the whole stack (used for the main page).
 */
export function push(build, { replace = false, animate = true } = {}) {
  closeSheets();   // sheets sit above every screen, so one left open would hide the new screen
  const screen = build();
  screen.el.classList.add('screen');
  if (replace) screen.el.classList.add('root');
  if (replace) {
    while (stack.length) { const s = stack.pop(); s.onHide?.(); s.el.remove(); }
    animate = false;
  }
  const prev = stack[stack.length - 1];
  stack.push(screen);
  root.append(screen.el);
  if (animate && prev) {
    screen.el.classList.add('enter');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      screen.el.classList.remove('enter');
      prev.el.classList.add('behind');
    }));
  } else if (prev) prev.el.classList.add('behind');
  screen.onShow?.();
  return screen;
}

export function pop() {
  if (stack.length < 2) return;
  const screen = stack.pop();
  const prev = stack[stack.length - 1];
  prev.el.classList.remove('behind');
  prev.refresh?.();
  prev.onShow?.();
  screen.onHide?.();
  screen.el.classList.add('enter');
  screen.el.addEventListener('transitionend', () => screen.el.remove(), { once: true });
  setTimeout(() => screen.el.remove(), 450);
}

// Swipe right from the left edge to go back, like iOS (the home-screen app has no system back gesture).
let edge = null;
addEventListener('touchstart', (e) => {
  const scr = stack[stack.length - 1];
  if (stack.length < 2 || e.touches.length > 1 || e.touches[0].clientX > 28 || document.querySelector('.sheet-wrap')) return;
  edge = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, t0: Date.now(), scr, on: false };
}, { passive: true });
addEventListener('touchmove', (e) => {
  if (!edge) return;
  const dx = e.touches[0].clientX - edge.x0, dy = e.touches[0].clientY - edge.y0;
  if (!edge.on) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { edge = null; return; }
    if (dx < 10) return;
    edge.on = true;
    edge.scr.el.style.transition = 'none';
  }
  edge.dx = Math.max(0, dx);
  edge.scr.el.style.transform = `translateX(${edge.dx}px)`;
}, { passive: true });
const edgeEnd = () => {
  if (!edge) return;
  const { scr, on, dx = 0, t0 } = edge;
  edge = null;
  if (!on) return;
  scr.el.style.transition = '';
  const go = dx > innerWidth * 0.33 || (dx > 40 && dx / (Date.now() - t0) > 0.5);
  if (go && stack[stack.length - 1] === scr) { scr.el.style.transform = ''; pop(); }
  else scr.el.style.transform = '';
};
addEventListener('touchend', edgeEnd);
addEventListener('touchcancel', edgeEnd);

/**
 * Horizontal swipes on an element: left() / right() run on a clear sideways swipe.
 * The element follows your finger a little; after it switches, the new content
 * (target(), or the element itself) slides in from the side you swiped toward.
 * Vertical scrolling, charts, inputs and sideways-scrolling rows are left alone.
 */
const NO_SWIPE = 'input, textarea, select, .chips, .photo-strip, .chart-svg, .no-swipe';
export function swipe(el, { left, right, target, ignore } = {}) {
  let t = null;
  el.addEventListener('touchstart', (e) => {
    t = null;
    if (e.touches.length > 1 || e.target.closest(NO_SWIPE) || (ignore && e.target.closest(ignore)) || e.touches[0].clientX < 28) return;   // edge = back gesture
    t = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, t0: Date.now(), dir: null, dx: 0 };
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!t) return;
    const dx = e.touches[0].clientX - t.x0, dy = e.touches[0].clientY - t.y0;
    if (!t.dir) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      t.dir = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
      if (t.dir === 'y') { t = null; return; }
      el.style.transition = 'none';
    }
    t.dx = dx;
    const can = dx < 0 ? left : right;
    el.style.transform = `translateX(${dx * (can ? 0.35 : 0.08)}px)`;
  }, { passive: true });
  const end = () => {
    if (!t?.dir) { t = null; return; }
    const { dx, t0 } = t;
    t = null;
    el.style.transition = 'transform .2s ease-out';
    el.style.transform = '';
    const fn = dx < 0 ? left : right;
    if (!fn || !(Math.abs(dx) > 60 || (Math.abs(dx) > 30 && Math.abs(dx) / (Date.now() - t0) > 0.4))) return;
    if (fn() === false) return;   // nothing further that way
    const now = target?.() || el;
    if (now.isConnected) now.animate?.([{ transform: `translateX(${dx < 0 ? 36 : -36}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
  };
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);
  return el;
}

/** Swipe a page to step through its range buttons (4W → 3M → 6M…), as if you tapped the next one. */
export function swipeSegment(el, sel = '.segment.range') {
  const step = (d) => () => {
    const bs = [...(el.querySelector(sel)?.querySelectorAll('button') || [])];
    const next = bs[bs.findIndex((b) => b.classList.contains('on')) + d];
    if (!next) return false;
    next.click();
  };
  return swipe(el, { left: step(1), right: step(-1) });
}

export const top = () => stack[stack.length - 1];
export const depth = () => stack.length;
export const refreshAll = () => stack.forEach((s) => s.refresh?.());

/** Standard navigation bar: back button, title, optional right-side buttons. */
export function navBar({ title = '', back = true, backLabel = 'Back', right = [], large = false } = {}) {
  return h('header.nav' + (large ? '.large' : ''),
    h('div.nav-row',
      h('div.nav-left', back ? h('button.nav-back', { onclick: () => pop(), 'aria-label': 'Back' }, icon('back', 24), backLabel) : null),
      h('div.nav-title', large ? '' : title),
      h('div.nav-right', right),
    ),
    large ? h('h1.large-title', title) : null,
  );
}

// ---------- Sheets and dialogs ----------

/** A bottom sheet that slides up. Returns { el, close }. */
const openSheets = new Set();
/** Close every open sheet (used when a new screen opens). */
export const closeSheets = () => [...openSheets].forEach((c) => c());

export function sheet(content, { full = false, onClose } = {}) {
  const backdrop = h('div.backdrop');
  const panel = h('div.sheet' + (full ? '.full' : ''), { role: 'dialog', 'aria-modal': 'true' }, h('div.grabber'), content);
  const wrap = h('div.sheet-wrap', backdrop, panel);
  document.body.append(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    openSheets.delete(close);
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 350);
    onClose?.();
  };
  openSheets.add(close);
  backdrop.addEventListener('click', close);
  // Swipe the grabber area down to close
  let y0 = null;
  panel.addEventListener('touchstart', (e) => {
    if (panel.scrollTop > 0 || e.target.closest('input,textarea,.no-drag')) return;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  panel.addEventListener('touchend', (e) => {
    if (y0 == null) return;
    const dy = e.changedTouches[0].clientY - y0;
    y0 = null;
    panel.style.transform = '';
    if (dy > 110) close();
  });
  return { el: panel, close };
}

/** iOS-style action sheet. actions: [{ label, danger?, onClick }] */
export function actionSheet(title, actions) {
  const wrap = h('div.sheet-wrap.action');
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 300); };
  wrap.append(
    h('div.backdrop', { onclick: close }),
    h('div.action-panel',
      h('div.action-group',
        title ? h('div.action-title', title) : null,
        actions.map((a) => h('button.action-btn' + (a.danger ? '.danger' : ''), {
          onclick: () => { close(); a.onClick?.(); },
        }, a.label)),
      ),
      h('button.action-btn.cancel', { onclick: close }, 'Cancel'),
    ),
  );
  document.body.append(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
}

/** Confirm dialog. Resolves true/false. */
export function confirmBox(title, message, { ok = 'OK', danger = false, cancel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const wrap = h('div.alert-wrap');
    const done = (v) => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 200); resolve(v); };
    wrap.append(h('div.alert',
      h('div.alert-body', h('div.alert-title', title), message ? h('div.alert-msg', message) : null),
      h('div.alert-btns',
        cancel ? h('button', { onclick: () => done(false) }, cancel) : null,
        h('button' + (danger ? '.danger' : '.strong'), { onclick: () => done(true) }, ok),
      ),
    ));
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
  });
}

/** Prompt for a short piece of text. Resolves the text or null. */
export function promptBox(title, value = '', { placeholder = '', ok = 'Save', inputmode } = {}) {
  return new Promise((resolve) => {
    const input = h('input.alert-input', { value, placeholder, inputmode, enterkeyhint: 'done' });
    const wrap = h('div.alert-wrap');
    const done = (v) => { input.blur(); wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 200); resolve(v); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(input.value.trim()); });
    wrap.append(h('div.alert',
      h('div.alert-body', h('div.alert-title', title), input),
      h('div.alert-btns',
        h('button', { onclick: () => done(null) }, 'Cancel'),
        h('button.strong', { onclick: () => done(input.value.trim()) }, ok),
      ),
    ));
    document.body.append(wrap);
    requestAnimationFrame(() => { wrap.classList.add('open'); input.focus(); input.select(); });
  });
}

let toastTimer;
export function toast(text) {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- Formatting ----------

export function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  if (hh) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}
export function fmtDurationWords(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
export function fmtSecs(secs) {
  if (!secs) return '0:00';
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}
/** "1:30", "90", "1m30" → seconds */
export function parseSecs(text) {
  const t = String(text).trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [m, s] = t.split(':');
    return (+m || 0) * 60 + (+s || 0);
  }
  return isNaN(+t) ? null : Math.round(+t);
}
export function fmtDate(ts, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(ts).toLocaleDateString(undefined, opts);
}
export const fmtNum = (n) => Math.round(n).toLocaleString();

/** Replace an element's children, skipping null/false and flattening arrays. */
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
}
