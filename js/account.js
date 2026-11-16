// Sign in / create an account, so your phones (and iPad) share the same data.

import { h, fill, sheet, toast, confirmBox } from './ui.js';
import { enabled, account, signIn, signUp, signOut, sync, syncStatus, onStatus } from './cloud.js';

const ago = (ts) => {
  if (!ts) return 'not yet';
  const m = Math.round((Date.now() - ts) / 6e4);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(ts).toLocaleDateString();
};

/** The Account rows for Settings (nothing if sync isn't set up). */
export function accountSection(closeSettings) {
  if (!enabled()) return null;
  const box = h('div');
  const draw = () => {
    const u = account(), st = syncStatus();
    fill(box,
      h('label.form-label', 'Account'),
      u
        ? h('div.group',
          h('div.group-row', h('span', u.email), h('span.row-val', st.syncing ? 'Syncing…' : '✓')),
          h('button.group-row', { onclick: () => sync() }, h('span', 'Sync now'), h('span.row-val', st.error ? '⚠︎' : `Synced ${ago(st.last)}`)),
          h('button.group-row.danger', {
            onclick: async () => {
              if (!(await confirmBox('Sign out?', 'Your data stays on this phone and in your account. Sign in again to keep syncing.', { ok: 'Sign out' }))) return;
              await signOut(); toast('Signed out');
            },
          }, h('span', 'Sign out')))
        : h('div.group', h('button.group-row.gold-text', { onclick: () => { closeSettings?.(); signInSheet(); } }, h('span', 'Sign in or create an account'), h('span.row-val', '›'))),
      st.error && u ? h('p.fine.red-text', st.error) : null,
      h('p.fine', u ? 'Everything you log syncs to every device signed in to this account, including progress photos.' : 'Sign in on each device to share one account: workouts, food, weight and photos sync between them.'),
    );
  };
  draw();
  const off = onStatus(() => (box.isConnected ? draw() : off()));
  return box;
}

export function signInSheet() {
  let mode = 'in';
  const email = h('input.field', { type: 'email', placeholder: 'Email', autocomplete: 'email', autocapitalize: 'off', inputmode: 'email' });
  const pass = h('input.field', { type: 'password', placeholder: 'Password (6+ characters)', autocomplete: 'current-password' });
  const msg = h('p.fine');
  const go = h('button.btn.gold.wide');
  const swap = h('button.link');
  const title = h('div.sheet-title');
  const draw = () => {
    title.textContent = mode === 'in' ? 'Sign in' : 'Create account';
    go.textContent = mode === 'in' ? 'Sign in' : 'Create account';
    swap.textContent = mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in';
    pass.autocomplete = mode === 'in' ? 'current-password' : 'new-password';
    msg.textContent = mode === 'in' ? '' : 'Anything already on this phone moves into your new account.';
    msg.classList.remove('red-text');
  };
  swap.onclick = () => { mode = mode === 'in' ? 'up' : 'in'; draw(); };
  const submit = async () => {
    const e = email.value.trim(), p = pass.value;
    if (!/.+@.+\..+/.test(e)) { msg.textContent = 'Enter your email.'; msg.classList.add('red-text'); return; }
    if (p.length < 6) { msg.textContent = 'Passwords need at least 6 characters.'; msg.classList.add('red-text'); return; }
    go.disabled = true; go.textContent = 'One moment…';
    try {
      if (mode === 'in') { await signIn(e, p); s.close(); toast('Signed in. Your data is syncing.'); }
      else {
        const r = await signUp(e, p);
        if (r === 'confirm') { mode = 'in'; draw(); msg.textContent = 'Check your email and tap the link to confirm, then come back here and sign in.'; }
        else { s.close(); toast('Account created. Your data is syncing.'); }
      }
    } catch (err) {
      msg.textContent = err.message || 'Something went wrong.'; msg.classList.add('red-text');
    } finally { go.disabled = false; if (go.textContent === 'One moment…') go.textContent = mode === 'in' ? 'Sign in' : 'Create account'; }
  };
  go.onclick = submit;
  pass.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), title, h('span')),
    email, pass, go, msg, h('div.center', swap),
  ));
  setTimeout(() => email.focus(), 350);
}
