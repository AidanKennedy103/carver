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
export function sheet(content, { full = false, onClose } = {}) {
  const backdrop = h('div.backdrop');
  const panel = h('div.sheet' + (full ? '.full' : ''), h('div.grabber'), content);
  const wrap = h('div.sheet-wrap', backdrop, panel);
  document.body.append(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 350);
    onClose?.();
  };
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
  if (!t) { t = h('div.toast'); document.body.append(t); }
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
