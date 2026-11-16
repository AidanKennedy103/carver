// A short chime when rest is over. iPhones only allow sound after a tap,
// so unlockAudio() is called from a tap (starting a workout, ticking a set).

let ctx;
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}
document.addEventListener('touchend', unlockAudio, { once: true, passive: true });
document.addEventListener('click', unlockAudio, { once: true });

export function beep() {
  if (!ctx) return;
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
  navigator.vibrate?.(200);
}
