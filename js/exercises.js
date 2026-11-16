// The built-in exercise library.
//
// type:  'wr'   = weight × reps (most lifts)
//        'bw'   = reps only (bodyweight)
//        'time' = duration (planks, cardio)
// Custom exercises people add are saved in the store and merged in by allExercises().

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms', 'Full body', 'Cardio'];
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'Other'];

const L = (id, name, muscle, equipment, type = 'wr') => ({ id, name, muscle, equipment, type });

export const LIBRARY = [
  // Chest
  L('bench', 'Bench Press', 'Chest', 'Barbell'),
  L('incline-bench', 'Incline Bench Press', 'Chest', 'Barbell'),
  L('decline-bench', 'Decline Bench Press', 'Chest', 'Barbell'),
  L('db-bench', 'Dumbbell Bench Press', 'Chest', 'Dumbbell'),
  L('db-incline', 'Incline Dumbbell Press', 'Chest', 'Dumbbell'),
  L('db-fly', 'Dumbbell Fly', 'Chest', 'Dumbbell'),
  L('cable-fly', 'Cable Fly', 'Chest', 'Cable'),
  L('pec-deck', 'Pec Deck', 'Chest', 'Machine'),
  L('chest-press', 'Chest Press', 'Chest', 'Machine'),
  L('pushup', 'Push-up', 'Chest', 'Bodyweight', 'bw'),
  L('dips', 'Dips', 'Chest', 'Bodyweight', 'bw'),
  // Back
  L('deadlift', 'Deadlift', 'Back', 'Barbell'),
  L('bb-row', 'Barbell Row', 'Back', 'Barbell'),
  L('db-row', 'Dumbbell Row', 'Back', 'Dumbbell'),
  L('pullup', 'Pull-up', 'Back', 'Bodyweight', 'bw'),
  L('weighted-pullup', 'Weighted Pull-up', 'Back', 'Bodyweight'),
  L('chinup', 'Chin-up', 'Back', 'Bodyweight', 'bw'),
  L('lat-pulldown', 'Lat Pulldown', 'Back', 'Cable'),
  L('seated-row', 'Seated Cable Row', 'Back', 'Cable'),
  L('tbar-row', 'T-Bar Row', 'Back', 'Machine'),
  L('chest-row', 'Chest-Supported Row', 'Back', 'Machine'),
  L('straight-pulldown', 'Straight-Arm Pulldown', 'Back', 'Cable'),
  L('rack-pull', 'Rack Pull', 'Back', 'Barbell'),
  L('back-ext', 'Back Extension', 'Back', 'Bodyweight', 'bw'),
  // Shoulders
  L('ohp', 'Overhead Press', 'Shoulders', 'Barbell'),
  L('db-shoulder', 'Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'),
  L('arnold', 'Arnold Press', 'Shoulders', 'Dumbbell'),
  L('lat-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell'),
  L('cable-lat-raise', 'Cable Lateral Raise', 'Shoulders', 'Cable'),
  L('rear-delt-fly', 'Rear Delt Fly', 'Shoulders', 'Dumbbell'),
  L('face-pull', 'Face Pull', 'Shoulders', 'Cable'),
  L('shoulder-press-m', 'Shoulder Press', 'Shoulders', 'Machine'),
  L('upright-row', 'Upright Row', 'Shoulders', 'Barbell'),
  L('shrug', 'Shrug', 'Shoulders', 'Dumbbell'),
  // Arms
  L('bb-curl', 'Barbell Curl', 'Biceps', 'Barbell'),
  L('db-curl', 'Dumbbell Curl', 'Biceps', 'Dumbbell'),
  L('hammer-curl', 'Hammer Curl', 'Biceps', 'Dumbbell'),
  L('preacher-curl', 'Preacher Curl', 'Biceps', 'Machine'),
  L('cable-curl', 'Cable Curl', 'Biceps', 'Cable'),
  L('incline-curl', 'Incline Dumbbell Curl', 'Biceps', 'Dumbbell'),
  L('tri-pushdown', 'Triceps Pushdown', 'Triceps', 'Cable'),
  L('oh-tri-ext', 'Overhead Triceps Extension', 'Triceps', 'Cable'),
  L('skullcrusher', 'Skull Crusher', 'Triceps', 'Barbell'),
  L('cgbp', 'Close-Grip Bench Press', 'Triceps', 'Barbell'),
  L('wrist-curl', 'Wrist Curl', 'Forearms', 'Dumbbell'),
  // Legs
  L('squat', 'Squat', 'Quads', 'Barbell'),
  L('front-squat', 'Front Squat', 'Quads', 'Barbell'),
  L('hack-squat', 'Hack Squat', 'Quads', 'Machine'),
  L('leg-press', 'Leg Press', 'Quads', 'Machine'),
  L('leg-ext', 'Leg Extension', 'Quads', 'Machine'),
  L('bss', 'Bulgarian Split Squat', 'Quads', 'Dumbbell'),
  L('lunge', 'Walking Lunge', 'Quads', 'Dumbbell'),
  L('goblet-squat', 'Goblet Squat', 'Quads', 'Dumbbell'),
  L('rdl', 'Romanian Deadlift', 'Hamstrings', 'Barbell'),
  L('db-rdl', 'Dumbbell Romanian Deadlift', 'Hamstrings', 'Dumbbell'),
  L('lying-curl', 'Lying Leg Curl', 'Hamstrings', 'Machine'),
  L('seated-curl', 'Seated Leg Curl', 'Hamstrings', 'Machine'),
  L('hip-thrust', 'Hip Thrust', 'Glutes', 'Barbell'),
  L('glute-bridge', 'Glute Bridge', 'Glutes', 'Bodyweight', 'bw'),
  L('cable-kickback', 'Cable Kickback', 'Glutes', 'Cable'),
  L('hip-abduction', 'Hip Abduction', 'Glutes', 'Machine'),
  L('calf-raise', 'Standing Calf Raise', 'Calves', 'Machine'),
  L('seated-calf', 'Seated Calf Raise', 'Calves', 'Machine'),
  // Core
  L('plank', 'Plank', 'Core', 'Bodyweight', 'time'),
  L('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'Bodyweight', 'bw'),
  L('cable-crunch', 'Cable Crunch', 'Core', 'Cable'),
  L('crunch', 'Crunch', 'Core', 'Bodyweight', 'bw'),
  L('ab-wheel', 'Ab Wheel Rollout', 'Core', 'Other', 'bw'),
  L('russian-twist', 'Russian Twist', 'Core', 'Bodyweight', 'bw'),
  // Full body
  L('power-clean', 'Power Clean', 'Full body', 'Barbell'),
  L('kb-swing', 'Kettlebell Swing', 'Full body', 'Kettlebell'),
  L('farmers-walk', "Farmer's Walk", 'Full body', 'Dumbbell', 'time'),
  L('burpee', 'Burpee', 'Full body', 'Bodyweight', 'bw'),
  // Cardio
  L('treadmill', 'Treadmill', 'Cardio', 'Machine', 'time'),
  L('bike', 'Stationary Bike', 'Cardio', 'Machine', 'time'),
  L('rower', 'Rowing Machine', 'Cardio', 'Machine', 'time'),
  L('stairmaster', 'Stair Climber', 'Cardio', 'Machine', 'time'),
  L('elliptical', 'Elliptical', 'Cardio', 'Machine', 'time'),
  L('jump-rope', 'Jump Rope', 'Cardio', 'Other', 'time'),
];
