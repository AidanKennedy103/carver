// Sign in / create an account, so your phones (and iPad) share the same data.

import { h, fill, sheet, toast, actionSheet, confirmBox, refreshAll } from './ui.js';
import { resetAll } from './store.js';
import { clearPhotos } from './photos.js';
import { enabled, account, sendCode, verifyCode, verifyLink, signOut, deleteAccount, sync, syncStatus, onStatus } from './cloud.js';

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
          h('button.group-row', { onclick: () => sync() }, h('span', 'Sync now'), h('span.row-val', st.error ? 'Problem' : `Synced ${ago(st.last)}`)),
          h('button.group-row.danger', {
            onclick: () => actionSheet('Sign out?', [
              { label: 'Sign out', onClick: () => out(false) },
              { label: 'Sign out and clear this phone', danger: true, onClick: () => out(true) },
            ]),
          }, h('span', 'Sign out')),
          h('button.group-row.danger', { onclick: removeAccount }, h('span', 'Delete account')))
        : h('div.group', h('button.group-row.gold-text', { onclick: () => { closeSettings?.(); signInSheet(); } }, h('span', 'Sign in with email'), h('span.row-val', '›'))),
      st.error && u ? h('p.fine.red-text', st.error) : null,
      h('p.fine', u ? 'Everything you log syncs to every device signed in to this account, including progress photos.' : 'Sign in on each device to share one account: workouts, food, weight and photos sync between them.'),
    );
  };
  draw();
  const off = onStatus(() => (box.isConnected ? draw() : off()));
  // Settings is a sheet: stop listening once it's gone
  setTimeout(function check() { if (box.isConnected) setTimeout(check, 2000); else off(); }, 2000);
  return box;
}

/** Delete the account for good (asks twice). */
async function removeAccount() {
  if (!(await confirmBox('Delete your account?', 'This permanently deletes your synced data, progress photos, groups you’re in and your posts, on every device. Export a backup first if you want a copy. This cannot be undone.', { ok: 'Continue', danger: true }))) return;
  if (!(await confirmBox('Are you sure?', 'Your Carver account will be gone.', { ok: 'Delete account', danger: true }))) return;
  try {
    toast('Deleting…');
    await deleteAccount();
    resetAll(); await clearPhotos(); refreshAll();
    toast('Account deleted');
  } catch (e) { toast(e.message || 'Couldn’t delete it. Check your connection.'); }
}

/** Sign out. Clearing the phone suits a shared device; your account keeps everything either way. */
async function out(clear) {
  try {
    await signOut();
    if (clear) { resetAll(); await clearPhotos(); refreshAll(); }
    toast(clear ? 'Signed out and cleared this phone' : 'Signed out');
  } catch (e) { toast(e.message || 'Couldn’t sign out. Check your connection.'); }
}

export function signInSheet() {
  let sentTo = '';
  const email = h('input.field', { type: 'email', placeholder: 'Email', autocomplete: 'email', autocapitalize: 'off', inputmode: 'email', enterkeyhint: 'send' });
  const code = h('input.field.code-input', { placeholder: 'Code or link', autocomplete: 'one-time-code', autocapitalize: 'off', autocorrect: 'off', spellcheck: false, enterkeyhint: 'done', 'aria-label': 'Code or link from the email' });
  // Typing a code: big spaced digits. Pasting a link: normal text.
  code.addEventListener('input', () => code.classList.toggle('is-link', /[^\d\s]/.test(code.value)));
  const msg = h('p.fine');
  const go = h('button.btn.gold.wide');
  const back = h('button.link', { onclick: () => { sentTo = ''; draw(); } }, 'Use a different email');
  const resend = h('button.link', { onclick: () => send(true) }, 'Send a new code');
  const body = h('div.form-steps');
  const say = (t, bad = false) => { msg.textContent = t; msg.classList.toggle('red-text', bad); };

  function draw() {
    if (!sentTo) {
      go.textContent = 'Email me a code';
      go.onclick = () => send();
      fill(body, h('p.fine', 'Enter your email and Carver sends you a sign-in code. No password. Use the same email on each device to share one account.'), email, go, msg);
      say('');
      setTimeout(() => email.focus(), 350);
    } else {
      go.textContent = 'Sign in';
      go.onclick = verify;
      code.value = ''; code.classList.remove('is-link');
      fill(body, h('p.fine', `We emailed ${sentTo}. Type the code from the email here. If the email has a button or link instead, press and hold it, choose Copy, and paste it here (don’t tap it: that opens Safari, not Carver). Check spam if it’s not there in a minute.`), code, go, msg, h('div.center.link-row', resend, back));
      setTimeout(() => code.focus(), 100);
    }
  }
  async function send(again = false) {
    const e = (sentTo && again ? sentTo : email.value).trim().toLowerCase();
    if (!/.+@.+\..+/.test(e)) { say('Enter your email.', true); return; }
    go.disabled = true; go.textContent = 'Sending…';
    try { await sendCode(e); sentTo = e; draw(); if (again) say('New code sent.'); }
    catch (err) { say(err.message || 'Could not send the code.', true); go.textContent = again ? 'Sign in' : 'Email me a code'; }
    finally { go.disabled = false; }
  }
  async function verify() {
    const v = code.value.trim();
    const isLink = /https?:\/\//i.test(v);
    const c = v.replace(/\D/g, '');
    if (!isLink && c.length < 6) { say('Enter the code, or paste the link, from the email.', true); return; }
    go.disabled = true; go.textContent = 'Signing in…';
    try { await (isLink ? verifyLink(v) : verifyCode(sentTo, c)); s.close(); toast('Signed in. Your data is syncing; it can take a minute the first time.'); }
    catch (err) { say(err.message || 'That code didn’t work.', true); go.textContent = 'Sign in'; }
    finally { go.disabled = false; }
  }
  email.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') send(); });
  code.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') verify(); });
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Sign in'), h('span')),
    body));
}
