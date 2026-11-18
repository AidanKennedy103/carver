// The built-in exercise library.
//
// type:  'wr'   = weight × reps (most lifts)
//        'bw'   = reps only (bodyweight)
//        'time' = duration (planks, cardio)
// muscle: the main muscle. helps: other muscles it works (they count half a set
// in "sets per muscle"). uni: one arm or leg at a time (weight is per side).
// Custom exercises people add are saved in the store and merged in by allExercises().
// Ids never change: workouts and plans point at them.

export const MUSCLES = ['Chest', 'Back', 'Lower back', 'Traps', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes',
  'Adductors', 'Abductors', 'Calves', 'Core', 'Obliques', 'Full body', 'Cardio'];
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'Other'];

/** L(id, name, muscle, equipment, helps 'A,B', type, uni) */
const L = (id, name, muscle, equipment, helps = '', type = 'wr', uni = false) =>
  ({ id, name, muscle, equipment, type, helps: helps ? helps.split(',') : [], ...(uni ? { uni: true } : {}) });
const U = (id, name, muscle, equipment, helps = '', type = 'wr') => L(id, name, muscle, equipment, helps, type, true);

const PRESS = 'Triceps,Shoulders';

export const LIBRARY = [
  // Chest
  L('bench', 'Bench Press', 'Chest', 'Barbell', PRESS),
  L('incline-bench', 'Incline Bench Press', 'Chest', 'Barbell', PRESS),
  L('decline-bench', 'Decline Bench Press', 'Chest', 'Barbell', PRESS),
  L('smith-bench', 'Smith Machine Bench Press', 'Chest', 'Machine', PRESS),
  L('smith-incline', 'Incline Smith Machine Press', 'Chest', 'Machine', PRESS),
  L('db-bench', 'Dumbbell Bench Press', 'Chest', 'Dumbbell', PRESS),
  L('db-incline', 'Incline Dumbbell Press', 'Chest', 'Dumbbell', PRESS),
  U('sa-db-bench', 'Single-Arm Dumbbell Bench Press', 'Chest', 'Dumbbell', 'Triceps,Shoulders,Obliques'),
  L('chest-press', 'Chest Press', 'Chest', 'Machine', PRESS),
  L('incline-chest-press', 'Incline Chest Press', 'Chest', 'Machine', PRESS),
  U('sa-chest-press', 'Single-Arm Chest Press', 'Chest', 'Machine', PRESS),
  L('db-fly', 'Dumbbell Fly', 'Chest', 'Dumbbell', 'Shoulders'),
  L('incline-db-fly', 'Incline Dumbbell Fly', 'Chest', 'Dumbbell', 'Shoulders'),
  L('cable-fly', 'Cable Fly', 'Chest', 'Cable', 'Shoulders'),
  L('low-cable-fly', 'Low-to-High Cable Fly', 'Chest', 'Cable', 'Shoulders'),
  U('sa-cable-fly', 'Single-Arm Cable Fly', 'Chest', 'Cable', 'Shoulders'),
  L('pec-deck', 'Pec Deck', 'Chest', 'Machine', 'Shoulders'),
  L('db-pullover', 'Dumbbell Pullover', 'Chest', 'Dumbbell', 'Back,Triceps'),
  L('pushup', 'Push-up', 'Chest', 'Bodyweight', 'Triceps,Shoulders,Core', 'bw'),
  L('decline-pushup', 'Decline Push-up', 'Chest', 'Bodyweight', 'Triceps,Shoulders,Core', 'bw'),
  L('dips', 'Dips', 'Chest', 'Bodyweight', PRESS, 'bw'),
  L('weighted-dips', 'Weighted Dips', 'Chest', 'Bodyweight', PRESS),

  // Back (lats and upper back)
  L('deadlift', 'Deadlift', 'Back', 'Barbell', 'Hamstrings,Glutes,Lower back,Traps,Forearms'),
  L('sumo-deadlift', 'Sumo Deadlift', 'Back', 'Barbell', 'Glutes,Adductors,Quads,Hamstrings,Traps,Forearms'),
  L('trap-bar-deadlift', 'Trap Bar Deadlift', 'Back', 'Barbell', 'Quads,Glutes,Hamstrings,Traps,Forearms'),
  L('rack-pull', 'Rack Pull', 'Back', 'Barbell', 'Traps,Glutes,Lower back,Forearms'),
  L('bb-row', 'Barbell Row', 'Back', 'Barbell', 'Biceps,Traps,Lower back,Shoulders'),
  L('pendlay-row', 'Pendlay Row', 'Back', 'Barbell', 'Biceps,Traps,Lower back,Shoulders'),
  L('seal-row', 'Seal Row', 'Back', 'Barbell', 'Biceps,Traps,Shoulders'),
  U('meadows-row', 'Meadows Row', 'Back', 'Barbell', 'Biceps,Traps,Shoulders,Forearms'),
  U('db-row', 'Dumbbell Row', 'Back', 'Dumbbell', 'Biceps,Traps,Shoulders'),
  L('tbar-row', 'T-Bar Row', 'Back', 'Machine', 'Biceps,Traps,Shoulders'),
  L('chest-row', 'Chest-Supported Row', 'Back', 'Machine', 'Biceps,Traps,Shoulders'),
  L('machine-row', 'Machine Row', 'Back', 'Machine', 'Biceps,Traps,Shoulders'),
  L('high-row', 'High Row', 'Back', 'Machine', 'Biceps,Traps'),
  U('sa-high-row', 'Single-Arm High Row', 'Back', 'Machine', 'Biceps,Traps'),
  L('seated-row', 'Seated Cable Row', 'Back', 'Cable', 'Biceps,Traps,Shoulders'),
  U('sa-cable-row', 'Single-Arm Cable Row', 'Back', 'Cable', 'Biceps,Traps,Shoulders'),
  L('inverted-row', 'Inverted Row', 'Back', 'Bodyweight', 'Biceps,Traps,Shoulders', 'bw'),
  L('pullup', 'Pull-up', 'Back', 'Bodyweight', 'Biceps,Forearms', 'bw'),
  L('weighted-pullup', 'Weighted Pull-up', 'Back', 'Bodyweight', 'Biceps,Forearms'),
  L('assisted-pullup', 'Assisted Pull-up', 'Back', 'Machine', 'Biceps'),
  L('chinup', 'Chin-up', 'Back', 'Bodyweight', 'Biceps,Forearms', 'bw'),
  L('lat-pulldown', 'Lat Pulldown', 'Back', 'Cable', 'Biceps'),
  L('close-grip-pulldown', 'Close-Grip Lat Pulldown', 'Back', 'Cable', 'Biceps'),
  U('sa-lat-pulldown', 'Single-Arm Lat Pulldown', 'Back', 'Cable', 'Biceps'),
  L('straight-pulldown', 'Straight-Arm Pulldown', 'Back', 'Cable', 'Triceps'),

  // Lower back
  L('back-ext', 'Back Extension', 'Lower back', 'Bodyweight', 'Glutes,Hamstrings', 'bw'),
  L('weighted-back-ext', 'Weighted Back Extension', 'Lower back', 'Bodyweight', 'Glutes,Hamstrings'),
  L('reverse-hyper', 'Reverse Hyperextension', 'Lower back', 'Machine', 'Glutes,Hamstrings'),
  L('superman', 'Superman', 'Lower back', 'Bodyweight', 'Glutes', 'bw'),

  // Traps
  L('shrug', 'Shrug', 'Traps', 'Dumbbell', 'Forearms'),
  L('bb-shrug', 'Barbell Shrug', 'Traps', 'Barbell', 'Forearms'),
  L('machine-shrug', 'Shrug Machine', 'Traps', 'Machine'),

  // Shoulders
  L('ohp', 'Overhead Press', 'Shoulders', 'Barbell', 'Triceps,Traps,Core'),
  L('push-press', 'Push Press', 'Shoulders', 'Barbell', 'Triceps,Traps,Quads'),
  L('db-shoulder', 'Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'Triceps'),
  U('sa-db-shoulder', 'Single-Arm Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'Triceps,Obliques'),
  L('arnold', 'Arnold Press', 'Shoulders', 'Dumbbell', 'Triceps'),
  L('shoulder-press-m', 'Shoulder Press', 'Shoulders', 'Machine', 'Triceps'),
  U('sa-landmine-press', 'Single-Arm Landmine Press', 'Shoulders', 'Barbell', 'Chest,Triceps,Obliques'),
  L('lat-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell', 'Traps'),
  L('cable-lat-raise', 'Cable Lateral Raise', 'Shoulders', 'Cable', 'Traps'),
  U('sa-cable-lat', 'Single-Arm Cable Lateral Raise', 'Shoulders', 'Cable', 'Traps'),
  U('sa-db-lat', 'Single-Arm Lean-Away Lateral Raise', 'Shoulders', 'Dumbbell', 'Traps'),
  L('machine-lat-raise', 'Lateral Raise Machine', 'Shoulders', 'Machine', 'Traps'),
  L('front-raise', 'Front Raise', 'Shoulders', 'Dumbbell', 'Chest'),
  L('rear-delt-fly', 'Rear Delt Fly', 'Shoulders', 'Dumbbell', 'Back,Traps'),
  L('reverse-pec-deck', 'Reverse Pec Deck', 'Shoulders', 'Machine', 'Back,Traps'),
  L('cable-rear-delt', 'Cable Rear Delt Fly', 'Shoulders', 'Cable', 'Back,Traps'),
  U('sa-cable-rear-delt', 'Single-Arm Cable Rear Delt Fly', 'Shoulders', 'Cable', 'Back,Traps'),
  L('face-pull', 'Face Pull', 'Shoulders', 'Cable', 'Back,Traps'),
  L('upright-row', 'Upright Row', 'Shoulders', 'Barbell', 'Traps,Biceps'),

  // Biceps
  L('bb-curl', 'Barbell Curl', 'Biceps', 'Barbell', 'Forearms'),
  L('ez-curl', 'EZ-Bar Curl', 'Biceps', 'Barbell', 'Forearms'),
  L('db-curl', 'Dumbbell Curl', 'Biceps', 'Dumbbell', 'Forearms'),
  L('hammer-curl', 'Hammer Curl', 'Biceps', 'Dumbbell', 'Forearms'),
  L('incline-curl', 'Incline Dumbbell Curl', 'Biceps', 'Dumbbell'),
  L('spider-curl', 'Spider Curl', 'Biceps', 'Dumbbell'),
  U('concentration-curl', 'Concentration Curl', 'Biceps', 'Dumbbell'),
  L('preacher-curl', 'Preacher Curl', 'Biceps', 'Machine'),
  U('sa-preacher', 'Single-Arm Preacher Curl', 'Biceps', 'Dumbbell'),
  L('machine-curl', 'Bicep Curl Machine', 'Biceps', 'Machine'),
  L('cable-curl', 'Cable Curl', 'Biceps', 'Cable', 'Forearms'),
  U('sa-cable-curl', 'Single-Arm Cable Curl', 'Biceps', 'Cable'),
  U('bayesian-curl', 'Bayesian Cable Curl', 'Biceps', 'Cable'),
  L('rope-hammer', 'Rope Hammer Curl', 'Biceps', 'Cable', 'Forearms'),

  // Triceps
  L('tri-pushdown', 'Triceps Pushdown', 'Triceps', 'Cable'),
  L('rope-pushdown', 'Rope Pushdown', 'Triceps', 'Cable'),
  U('sa-pushdown', 'Single-Arm Pushdown', 'Triceps', 'Cable'),
  L('oh-tri-ext', 'Overhead Triceps Extension', 'Triceps', 'Cable'),
  L('db-oh-ext', 'Dumbbell Overhead Triceps Extension', 'Triceps', 'Dumbbell'),
  U('sa-oh-ext', 'Single-Arm Overhead Triceps Extension', 'Triceps', 'Dumbbell'),
  U('kickback', 'Triceps Kickback', 'Triceps', 'Dumbbell'),
  L('skullcrusher', 'Skull Crusher', 'Triceps', 'Barbell'),
  L('jm-press', 'JM Press', 'Triceps', 'Barbell', 'Chest'),
  L('cgbp', 'Close-Grip Bench Press', 'Triceps', 'Barbell', 'Chest,Shoulders'),
  L('tri-dip-machine', 'Triceps Dip Machine', 'Triceps', 'Machine', 'Chest,Shoulders'),
  L('diamond-pushup', 'Diamond Push-up', 'Triceps', 'Bodyweight', 'Chest,Shoulders', 'bw'),
  L('bench-dip', 'Bench Dip', 'Triceps', 'Bodyweight', 'Chest,Shoulders', 'bw'),

  // Forearms
  L('wrist-curl', 'Wrist Curl', 'Forearms', 'Dumbbell'),
  L('reverse-wrist-curl', 'Reverse Wrist Curl', 'Forearms', 'Dumbbell'),
  L('reverse-curl', 'Reverse Curl', 'Forearms', 'Barbell', 'Biceps'),
  L('dead-hang', 'Dead Hang', 'Forearms', 'Bodyweight', 'Back', 'time'),

  // Quads
  L('squat', 'Squat', 'Quads', 'Barbell', 'Glutes,Adductors,Lower back'),
  L('front-squat', 'Front Squat', 'Quads', 'Barbell', 'Glutes,Adductors,Core'),
  L('smith-squat', 'Smith Machine Squat', 'Quads', 'Machine', 'Glutes,Adductors'),
  L('hack-squat', 'Hack Squat', 'Quads', 'Machine', 'Glutes,Adductors'),
  L('pendulum-squat', 'Pendulum Squat', 'Quads', 'Machine', 'Glutes,Adductors'),
  L('belt-squat', 'Belt Squat', 'Quads', 'Machine', 'Glutes,Adductors'),
  L('goblet-squat', 'Goblet Squat', 'Quads', 'Dumbbell', 'Glutes,Adductors,Core'),
  L('leg-press', 'Leg Press', 'Quads', 'Machine', 'Glutes,Adductors'),
  U('sl-leg-press', 'Single-Leg Leg Press', 'Quads', 'Machine', 'Glutes,Adductors'),
  L('leg-ext', 'Leg Extension', 'Quads', 'Machine'),
  U('sl-leg-ext', 'Single-Leg Extension', 'Quads', 'Machine'),
  L('sissy-squat', 'Sissy Squat', 'Quads', 'Bodyweight', '', 'bw'),
  U('bss', 'Bulgarian Split Squat', 'Quads', 'Dumbbell', 'Glutes,Adductors'),
  U('split-squat', 'Split Squat', 'Quads', 'Dumbbell', 'Glutes,Adductors'),
  U('lunge', 'Walking Lunge', 'Quads', 'Dumbbell', 'Glutes,Adductors,Hamstrings'),
  U('reverse-lunge', 'Reverse Lunge', 'Quads', 'Dumbbell', 'Glutes,Adductors,Hamstrings'),
  U('step-up', 'Step-up', 'Quads', 'Dumbbell', 'Glutes'),
  U('pistol-squat', 'Pistol Squat', 'Quads', 'Bodyweight', 'Glutes,Core', 'bw'),

  // Hamstrings
  L('rdl', 'Romanian Deadlift', 'Hamstrings', 'Barbell', 'Glutes,Lower back,Forearms'),
  L('db-rdl', 'Dumbbell Romanian Deadlift', 'Hamstrings', 'Dumbbell', 'Glutes,Lower back'),
  U('sl-rdl', 'Single-Leg Romanian Deadlift', 'Hamstrings', 'Dumbbell', 'Glutes,Abductors,Core'),
  L('stiff-leg', 'Stiff-Leg Deadlift', 'Hamstrings', 'Barbell', 'Glutes,Lower back'),
  L('good-morning', 'Good Morning', 'Hamstrings', 'Barbell', 'Glutes,Lower back'),
  L('lying-curl', 'Lying Leg Curl', 'Hamstrings', 'Machine', 'Calves'),
  U('sl-lying-curl', 'Single-Leg Lying Curl', 'Hamstrings', 'Machine', 'Calves'),
  L('seated-curl', 'Seated Leg Curl', 'Hamstrings', 'Machine'),
  U('sl-seated-curl', 'Single-Leg Seated Curl', 'Hamstrings', 'Machine'),
  U('standing-leg-curl', 'Standing Leg Curl', 'Hamstrings', 'Machine'),
  L('nordic-curl', 'Nordic Curl', 'Hamstrings', 'Bodyweight', '', 'bw'),
  L('glute-ham-raise', 'Glute-Ham Raise', 'Hamstrings', 'Bodyweight', 'Glutes,Calves', 'bw'),

  // Glutes
  L('hip-thrust', 'Hip Thrust', 'Glutes', 'Barbell', 'Hamstrings,Adductors'),
  L('machine-hip-thrust', 'Hip Thrust Machine', 'Glutes', 'Machine', 'Hamstrings'),
  U('sl-hip-thrust', 'Single-Leg Hip Thrust', 'Glutes', 'Bodyweight', 'Hamstrings,Abductors', 'bw'),
  L('glute-bridge', 'Glute Bridge', 'Glutes', 'Bodyweight', 'Hamstrings', 'bw'),
  U('sl-glute-bridge', 'Single-Leg Glute Bridge', 'Glutes', 'Bodyweight', 'Hamstrings,Abductors', 'bw'),
  U('cable-kickback', 'Cable Kickback', 'Glutes', 'Cable', 'Hamstrings'),
  U('kickback-machine', 'Glute Kickback Machine', 'Glutes', 'Machine', 'Hamstrings'),
  L('pull-through', 'Cable Pull-Through', 'Glutes', 'Cable', 'Hamstrings,Lower back'),
  U('curtsy-lunge', 'Curtsy Lunge', 'Glutes', 'Dumbbell', 'Quads,Adductors'),

  // Adductors (inner thigh)
  L('hip-adduction', 'Hip Adduction', 'Adductors', 'Machine'),
  U('cable-adduction', 'Cable Hip Adduction', 'Adductors', 'Cable'),
  L('sumo-squat', 'Sumo Squat', 'Adductors', 'Dumbbell', 'Quads,Glutes'),
  U('lateral-lunge', 'Lateral Lunge', 'Adductors', 'Dumbbell', 'Quads,Glutes'),
  U('copenhagen', 'Copenhagen Plank', 'Adductors', 'Bodyweight', 'Obliques,Core', 'time'),

  // Abductors (outer hip)
  L('hip-abduction', 'Hip Abduction', 'Abductors', 'Machine', 'Glutes'),
  U('cable-abduction', 'Cable Hip Abduction', 'Abductors', 'Cable', 'Glutes'),
  L('banded-walk', 'Banded Lateral Walk', 'Abductors', 'Band', 'Glutes', 'bw'),
  U('clamshell', 'Clamshell', 'Abductors', 'Band', 'Glutes', 'bw'),
  U('side-leg-raise', 'Side-Lying Leg Raise', 'Abductors', 'Bodyweight', 'Glutes', 'bw'),

  // Calves
  L('calf-raise', 'Standing Calf Raise', 'Calves', 'Machine'),
  U('sl-calf-raise', 'Single-Leg Calf Raise', 'Calves', 'Dumbbell'),
  L('seated-calf', 'Seated Calf Raise', 'Calves', 'Machine'),
  L('leg-press-calf', 'Leg Press Calf Raise', 'Calves', 'Machine'),
  L('donkey-calf', 'Donkey Calf Raise', 'Calves', 'Machine'),
  L('tibialis-raise', 'Tibialis Raise', 'Calves', 'Bodyweight', '', 'bw'),

  // Core (abs)
  L('plank', 'Plank', 'Core', 'Bodyweight', 'Obliques', 'time'),
  L('hollow-hold', 'Hollow Hold', 'Core', 'Bodyweight', '', 'time'),
  L('crunch', 'Crunch', 'Core', 'Bodyweight', '', 'bw'),
  L('cable-crunch', 'Cable Crunch', 'Core', 'Cable', 'Obliques'),
  L('ab-crunch-m', 'Ab Crunch Machine', 'Core', 'Machine'),
  L('decline-situp', 'Decline Sit-up', 'Core', 'Bodyweight', '', 'bw'),
  L('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'Bodyweight', 'Obliques,Forearms', 'bw'),
  L('hanging-knee-raise', 'Hanging Knee Raise', 'Core', 'Bodyweight', 'Forearms', 'bw'),
  L('captains-chair', 'Captain’s Chair Leg Raise', 'Core', 'Bodyweight', '', 'bw'),
  L('leg-raise', 'Lying Leg Raise', 'Core', 'Bodyweight', '', 'bw'),
  L('dead-bug', 'Dead Bug', 'Core', 'Bodyweight', '', 'bw'),
  L('ab-wheel', 'Ab Wheel Rollout', 'Core', 'Other', 'Obliques,Lower back', 'bw'),
  L('bicycle-crunch', 'Bicycle Crunch', 'Core', 'Bodyweight', 'Obliques', 'bw'),

  // Obliques (sides of the waist)
  L('russian-twist', 'Russian Twist', 'Obliques', 'Bodyweight', 'Core', 'bw'),
  U('side-plank', 'Side Plank', 'Obliques', 'Bodyweight', 'Core,Abductors', 'time'),
  U('woodchop', 'Cable Woodchop', 'Obliques', 'Cable', 'Core'),
  U('pallof-press', 'Pallof Press', 'Obliques', 'Cable', 'Core'),
  U('side-bend', 'Dumbbell Side Bend', 'Obliques', 'Dumbbell'),
  U('suitcase-carry', 'Suitcase Carry', 'Obliques', 'Dumbbell', 'Forearms,Traps,Core', 'time'),

  // Full body
  L('power-clean', 'Power Clean', 'Full body', 'Barbell', 'Back,Traps,Quads,Glutes,Hamstrings'),
  L('clean-press', 'Clean and Press', 'Full body', 'Barbell', 'Shoulders,Traps,Quads,Glutes,Triceps'),
  L('thruster', 'Thruster', 'Full body', 'Barbell', 'Quads,Glutes,Shoulders,Triceps'),
  U('db-snatch', 'Dumbbell Snatch', 'Full body', 'Dumbbell', 'Shoulders,Traps,Glutes,Hamstrings'),
  L('kb-swing', 'Kettlebell Swing', 'Full body', 'Kettlebell', 'Glutes,Hamstrings,Lower back'),
  U('sa-kb-swing', 'Single-Arm Kettlebell Swing', 'Full body', 'Kettlebell', 'Glutes,Hamstrings,Obliques'),
  U('turkish-getup', 'Turkish Get-up', 'Full body', 'Kettlebell', 'Shoulders,Core,Glutes'),
  L('farmers-walk', "Farmer's Walk", 'Full body', 'Dumbbell', 'Forearms,Traps,Core', 'time'),
  L('sled-push', 'Sled Push', 'Full body', 'Other', 'Quads,Glutes,Calves', 'time'),
  L('burpee', 'Burpee', 'Full body', 'Bodyweight', 'Chest,Quads,Core', 'bw'),

  // Cardio
  L('treadmill', 'Treadmill', 'Cardio', 'Machine', '', 'time'),
  L('bike', 'Stationary Bike', 'Cardio', 'Machine', '', 'time'),
  L('assault-bike', 'Air Bike', 'Cardio', 'Machine', '', 'time'),
  L('rower', 'Rowing Machine', 'Cardio', 'Machine', '', 'time'),
  L('ski-erg', 'Ski Erg', 'Cardio', 'Machine', '', 'time'),
  L('stairmaster', 'Stair Climber', 'Cardio', 'Machine', '', 'time'),
  L('elliptical', 'Elliptical', 'Cardio', 'Machine', '', 'time'),
  L('jump-rope', 'Jump Rope', 'Cardio', 'Other', '', 'time'),
];

/** "Chest + Triceps, Shoulders" */
export const musclesText = (e, max = 3) => e.muscle + (e.helps?.length ? ' + ' + e.helps.slice(0, max).join(', ') + (e.helps.length > max ? '…' : '') : '');
