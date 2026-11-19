// A short chime when rest is over. It must never pause the music you're listening to:
// the page's audio is set to "ambient", which iPhones mix with other apps' audio.
// Where a browser can't promise that (older iPhones), Carver stays silent.
// iPhones only allow sound after a tap, so unlockAudio() is called from a tap.

import { state } from './store.js';

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* not supported */ }
/** Sound that mixes with music is possible here. */
export const canMix = !!navigator.audioSession || !IOS;

let ctx;
const soundOn = () => canMix && state.settings.restSound !== false;
export function unlockAudio() {
  if (!soundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);

export function beep() {
  navigator.vibrate?.(200);
  if (!soundOn()) return;
  unlockAudio();
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});   // iOS pauses audio while the app is in the background
  const t = ctx.currentTime;
  [0, 0.18].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = i ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(t + d);
    o.stop(t + d + 0.3);
  });
}
