// How to do an exercise: three short form cues, and a link to watch demos.
// Cues are written for the common lifts; everything else gets cues for its kind of
// movement (a curl, a row, a press…). Demos open a YouTube search, so there's always
// a fresh video and nothing to host.

import { h, sheet } from './ui.js';
import { exercise } from './store.js';
import { musclesText } from './exercises.js';

const C = {
  // Chest
  bench: ['Eyes under the bar, shoulder blades squeezed together and down.', 'Lower to your lower chest with elbows about 45° from your body.', 'Feet planted; press up and slightly back over your shoulders.'],
  'incline-bench': ['Bench at 30–45°, shoulder blades pinned back.', 'Lower to your upper chest, just below the collarbone.', 'Press straight up; don’t let your lower back arch off the bench.'],
  'db-bench': ['Kick the dumbbells up from your knees as you lie back.', 'Lower until they’re level with your chest, elbows at about 45°.', 'Press up and slightly in, without clanking them together.'],
  'db-incline': ['Bench at 30–45°, feet flat.', 'Lower the dumbbells beside your upper chest.', 'Press up in a slight arc, keeping your shoulders down.'],
  'chest-press': ['Set the seat so the handles line up with mid-chest.', 'Shoulder blades back against the pad.', 'Press out without locking hard, then control the return.'],
  'db-fly': ['Slight bend in the elbows, and keep it fixed.', 'Open your arms wide until you feel a stretch across the chest.', 'Squeeze back up as if hugging a tree.'],
  'cable-fly': ['Stagger your stance and lean slightly forward.', 'Keep a soft bend in the elbows the whole way.', 'Bring your hands together in front of your chest and squeeze.'],
  'pec-deck': ['Seat height so the handles are at chest level.', 'Keep elbows slightly bent and shoulders down.', 'Squeeze the handles together, then open slowly to a stretch.'],
  pushup: ['Hands just wider than shoulders, body in one straight line.', 'Lower your chest to the floor, elbows at about 45°.', 'Brace your abs and glutes so your hips don’t sag.'],
  dips: ['Lean slightly forward for chest, stay upright for triceps.', 'Lower until your upper arms are about level with the floor.', 'Keep your shoulders down, away from your ears.'],
  // Back
  deadlift: ['Bar over mid-foot, shins close; grip just outside your legs.', 'Chest up, back flat, pull the slack out of the bar first.', 'Push the floor away and stand tall; lower the same way.'],
  'trap-bar-deadlift': ['Stand in the middle of the bar, handles beside your feet.', 'Hips down, chest up, back flat.', 'Drive through your whole foot and stand straight up.'],
  'bb-row': ['Hinge until your torso is about 45°, back flat.', 'Pull the bar to your lower ribs, elbows back.', 'Lower under control without letting your back round.'],
  'db-row': ['One hand and knee on a bench, back flat.', 'Pull the dumbbell toward your hip, not your chest.', 'Let it hang to a full stretch at the bottom.'],
  'chest-row': ['Chest against the pad, feet planted.', 'Drive your elbows back and squeeze your shoulder blades.', 'Let your arms straighten fully before the next rep.'],
  'seated-row': ['Sit tall with a slight knee bend.', 'Pull the handle to your belly, elbows close.', 'Don’t rock back; let your shoulders reach forward on the return.'],
  'lat-pulldown': ['Grip a little wider than shoulders, thighs under the pad.', 'Lean back slightly and pull the bar to your upper chest.', 'Lead with the elbows, then let the bar rise all the way.'],
  pullup: ['Hang with arms straight, hands just wider than shoulders.', 'Pull your chest toward the bar, elbows down and back.', 'Lower all the way; no swinging.'],
  chinup: ['Palms facing you, shoulder-width grip.', 'Pull until your chin clears the bar.', 'Lower to straight arms each rep.'],
  'inverted-row': ['Body straight under a bar or table, heels on the floor.', 'Pull your chest to the bar.', 'Keep your hips up the whole time.'],
  'face-pull': ['Rope at face height, thumbs toward you.', 'Pull to your forehead, hands apart, elbows high.', 'Squeeze your rear shoulders, then return slowly.'],
  'back-ext': ['Pad just below your hip bones.', 'Lower with a flat back, hinging at the hips.', 'Rise until your body is straight; don’t overarch.'],
  shrug: ['Hold the weights at your sides, arms straight.', 'Lift your shoulders straight up toward your ears.', 'Pause at the top, then lower slowly.'],
  // Shoulders
  ohp: ['Bar on your front shoulders, grip just outside them.', 'Squeeze glutes and abs; press straight up past your face.', 'Finish with the bar over your mid-foot, head through.'],
  'db-shoulder': ['Dumbbells at shoulder height, palms forward.', 'Press up until your arms are nearly straight.', 'Keep your ribs down; don’t lean back.'],
  'shoulder-press-m': ['Handles at shoulder height when seated.', 'Press up without shrugging.', 'Lower under control to the start.'],
  arnold: ['Start with palms facing you at shoulder height.', 'Rotate your palms forward as you press up.', 'Reverse the rotation on the way down.'],
  'lat-raise': ['Slight bend in the elbows, lean a touch forward.', 'Raise out to the sides until your arms are level with your shoulders.', 'Lead with the elbows; lower slowly.'],
  'cable-lat-raise': ['Cable low, handle in the far hand.', 'Raise out to the side to shoulder height.', 'Keep tension at the bottom; don’t let the stack rest.'],
  'rear-delt-fly': ['Hinge forward with a flat back.', 'Raise the dumbbells out to the sides, elbows soft.', 'Squeeze your rear shoulders, not your shoulder blades.'],
  'reverse-pec-deck': ['Face the pad, handles at shoulder height.', 'Sweep your arms back in an arc.', 'Stop when your arms line up with your body.'],
  // Arms
  'bb-curl': ['Shoulder-width grip, elbows at your sides.', 'Curl without swinging your body.', 'Lower all the way to straight arms.'],
  'db-curl': ['Palms forward, elbows pinned to your sides.', 'Curl up and squeeze at the top.', 'Lower slowly, fully straightening your arms.'],
  'hammer-curl': ['Palms facing each other the whole time.', 'Curl up without moving your elbows forward.', 'Lower under control.'],
  'incline-curl': ['Bench at 45–60°, arms hanging straight down.', 'Curl without bringing your elbows forward.', 'Get a full stretch at the bottom.'],
  'preacher-curl': ['Armpits snug to the pad.', 'Curl up, then lower until your arms are almost straight.', 'Go slow at the bottom; that’s where it works hardest.'],
  'cable-curl': ['Stand close to the cable, elbows at your sides.', 'Curl up and squeeze.', 'Keep tension all the way down.'],
  'tri-pushdown': ['Elbows tucked at your sides.', 'Push down until your arms are straight.', 'Let your forearms come up to about parallel, nothing more.'],
  'rope-pushdown': ['Elbows at your sides, rope at chest height.', 'Push down and spread the rope apart at the bottom.', 'Control the way up.'],
  'oh-tri-ext': ['Face away from the cable, rope behind your head.', 'Keep elbows pointing forward, close together.', 'Extend fully overhead, then lower to a deep stretch.'],
  'db-oh-ext': ['Hold one dumbbell overhead with both hands.', 'Lower it behind your head, elbows in.', 'Press back up to straight arms.'],
  skullcrusher: ['Lie back, bar over your shoulders.', 'Bend only at the elbows, lowering toward your forehead.', 'Extend back up without flaring your elbows.'],
  'ez-skullcrusher': ['Lie back with the EZ bar over your shoulders.', 'Lower toward the top of your head, elbows fixed.', 'Extend back up to straight arms.'],
  'lying-tri-ext': ['Lie back with arms angled slightly behind vertical.', 'Lower the bar behind your head by bending the elbows.', 'Extend back up, keeping your upper arms still.'],
  kickback: ['Hinge forward, upper arm parallel to the floor.', 'Straighten your arm back fully.', 'Keep the upper arm still; only the forearm moves.'],
  cgbp: ['Grip about shoulder width.', 'Lower to your lower chest, elbows tucked.', 'Press up, locking out with the triceps.'],
  // Legs
  squat: ['Bar on your upper back, feet shoulder width, toes slightly out.', 'Brace, then sit down between your hips until thighs are at least parallel.', 'Drive up with knees tracking over your toes.'],
  'front-squat': ['Bar on the front of your shoulders, elbows high.', 'Sit straight down, staying upright.', 'Keep elbows up as you stand.'],
  'hack-squat': ['Back flat on the pad, feet mid-platform.', 'Lower as deep as you can control.', 'Push through your whole foot to stand.'],
  'goblet-squat': ['Hold the dumbbell at your chest, elbows down.', 'Sit down between your knees, chest up.', 'Stand up by pushing the floor away.'],
  'leg-press': ['Feet shoulder width in the middle of the platform.', 'Lower until your knees are near your chest, hips staying down.', 'Press up without locking your knees hard.'],
  'leg-ext': ['Knees in line with the machine’s pivot.', 'Straighten your legs fully and squeeze.', 'Lower slowly.'],
  bss: ['Rear foot on a bench, front foot far enough forward.', 'Drop your back knee straight down.', 'Push through the front heel to stand.'],
  lunge: ['Step forward, then drop your back knee toward the floor.', 'Front knee over your foot, torso tall.', 'Push back to the start.'],
  'reverse-lunge': ['Step back and lower your back knee.', 'Keep your weight on the front foot.', 'Drive through the front heel to return.'],
  'step-up': ['Whole foot on the box.', 'Drive up through that foot, not by pushing off the back one.', 'Lower slowly.'],
  rdl: ['Soft knees, push your hips back.', 'Slide the bar down your thighs with a flat back.', 'Stop at a hamstring stretch, then drive your hips forward.'],
  'db-rdl': ['Dumbbells in front of your thighs, soft knees.', 'Hips back, back flat, dumbbells close to your legs.', 'Stand by squeezing your glutes.'],
  'sl-rdl': ['Stand on one leg, slight bend in the knee.', 'Hinge forward as the other leg lifts behind you.', 'Keep your hips square to the floor.'],
  'good-morning': ['Bar on your upper back, soft knees.', 'Push your hips back with a flat back.', 'Stand back up by driving your hips forward.'],
  'lying-curl': ['Knees just off the pad’s edge.', 'Curl your heels toward your glutes.', 'Lower slowly to straight legs.'],
  'seated-curl': ['Thigh pad snug, knees lined up with the pivot.', 'Curl down and back as far as you can.', 'Let it come back slowly.'],
  'nordic-curl': ['Kneel with your ankles anchored.', 'Lower your body forward as slowly as you can.', 'Catch yourself with your hands and push back up.'],
  'hip-thrust': ['Upper back on a bench, bar over your hips.', 'Tuck your chin and drive your hips up.', 'Squeeze your glutes hard at the top; shins vertical.'],
  'glute-bridge': ['Lie on your back, feet flat near your hips.', 'Drive your hips up by squeezing your glutes.', 'Don’t arch your lower back at the top.'],
  'hip-adduction': ['Sit tall, pads on your inner knees.', 'Squeeze your legs together.', 'Open slowly to a stretch.'],
  'hip-abduction': ['Sit tall, pads on your outer knees.', 'Push your legs apart.', 'Return slowly without letting the weight drop.'],
  'calf-raise': ['Balls of your feet on the edge.', 'Lower to a deep stretch in your heels.', 'Rise as high as you can and pause.'],
  'seated-calf': ['Pad on your lower thighs.', 'Lower your heels for a full stretch.', 'Push up onto your toes and hold briefly.'],
  // Core
  plank: ['Elbows under your shoulders, body in one straight line.', 'Squeeze your glutes and brace your abs.', 'Breathe; don’t let your hips sag or pike.'],
  'side-plank': ['Elbow under your shoulder, feet stacked.', 'Lift your hips so your body is straight.', 'Hold without rolling forward.'],
  crunch: ['Feet flat, hands lightly behind your head.', 'Curl your ribs toward your hips.', 'Lower slowly; don’t pull on your neck.'],
  'cable-crunch': ['Kneel facing the cable, rope by your head.', 'Crunch down by curling your spine.', 'Keep your hips still.'],
  'hanging-leg-raise': ['Hang with straight arms, no swinging.', 'Raise your legs by curling your pelvis up.', 'Lower slowly.'],
  'hanging-knee-raise': ['Hang still from the bar.', 'Bring your knees up toward your chest.', 'Lower with control.'],
  'ab-wheel': ['Kneel, hands on the wheel under your shoulders.', 'Roll out with abs braced and hips tucked.', 'Pull back by squeezing your abs.'],
  'dead-bug': ['Lie on your back, arms up, knees over hips.', 'Lower the opposite arm and leg, back pressed down.', 'Return and switch sides.'],
  'hollow-hold': ['Lower back pressed into the floor.', 'Arms and legs extended just off the floor.', 'Hold without your back lifting.'],
  'russian-twist': ['Sit leaning back, feet down or raised.', 'Rotate your shoulders side to side.', 'Move from your torso, not just your arms.'],
  'pallof-press': ['Stand side-on to the cable, handle at your chest.', 'Press straight out and resist the twist.', 'Bring it back slowly.'],
  // Full body and conditioning
  'kb-swing': ['Hinge, not squat: hips back, flat back.', 'Snap your hips forward to float the bell to chest height.', 'Let it fall back between your legs and repeat.'],
  thruster: ['Front squat with the bar on your shoulders.', 'Drive up and press overhead in one move.', 'Lower to your shoulders as you drop into the next squat.'],
  'power-clean': ['Start like a deadlift, bar close.', 'Jump explosively and shrug, pulling yourself under.', 'Catch the bar on your shoulders in a quarter squat.'],
  'farmers-walk': ['Heavy weights at your sides, stand tall.', 'Walk with short, quick steps.', 'Shoulders back; don’t lean.'],
  burpee: ['Squat down and kick your feet back to a plank.', 'Chest to the floor, then push up.', 'Jump your feet in and jump up.'],
  'bw-squat': ['Feet shoulder width, arms forward.', 'Sit down until thighs are at least parallel.', 'Stand up tall, squeezing your glutes.'],
  'pike-pushup': ['Hips high, body in an upside-down V.', 'Lower your head toward the floor between your hands.', 'Press back up.'],
};

/** Cues for kinds of movement, for exercises without their own. */
const KINDS = [
  [/curl/, 'Biceps', ['Elbows still at your sides.', 'Curl up without swinging, squeeze at the top.', 'Lower all the way down slowly.']],
  [/pushdown|tri|skull|kickback|extension/i, 'Triceps', ['Upper arms still; only the forearms move.', 'Straighten fully and squeeze.', 'Control the way back.']],
  [/row|pulldown|pull/, 'Back', ['Chest up, shoulders down.', 'Lead with your elbows and squeeze your shoulder blades.', 'Let your arms straighten fully between reps.']],
  [/press|bench|push/, null, ['Shoulders down and back.', 'Lower under control to a full range.', 'Press up smoothly without bouncing.']],
  [/fly|raise/, null, ['Soft, fixed bend in the elbows.', 'Move through a smooth arc.', 'Pause at the top, lower slowly.']],
  [/squat|lunge|leg|step/, null, ['Knees track over your toes.', 'Go as deep as you can with good form.', 'Drive through your whole foot.']],
  [/deadlift|rdl|hinge|good|thrust|bridge|swing/, null, ['Hips back, back flat.', 'Keep the weight close to your body.', 'Finish by squeezing your glutes.']],
];
function cuesFor(e) {
  if (C[e.id]) return C[e.id];
  // Variations (single-arm, machine…) borrow the main lift's cues when there is one
  const base = Object.keys(C).filter((k) => e.id.endsWith('-' + k) || e.id.startsWith(k + '-')).sort((a, b) => b.length - a.length)[0];
  if (base) return C[base];
  const kind = KINDS.find(([re, muscle]) => re.test(e.id + ' ' + e.name.toLowerCase()) && (!muscle || muscle === e.muscle));
  return kind ? kind[2] : ['Set up so you’re stable and comfortable.', 'Move through the full range you can control.', 'Lower slower than you lift.'];
}

export const demoUrl = (e) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${e.name} proper form`)}`;

/** The How to sheet for an exercise. */
export function howTo(exId) {
  const e = exercise(exId);
  const s = sheet(h('div.form.howto-sheet',
    h('div.sheet-head', h('span'), h('div.sheet-title', e.name), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('div.howto-meta', `${musclesText(e)} · ${e.equipment}${e.uni ? ' · one side at a time' : ''}`),
    h('ol.howto-cues', cuesFor(e).map((c) => h('li', c))),
    h('a.btn.dark.wide.howto-demo', { href: demoUrl(e), target: '_blank', rel: 'noopener' }, 'Watch a demo'),
    h('p.fine.center', 'Opens videos of this exercise on YouTube.')));
}
