export const STORAGE_KEY = "gym-workout-log:v2";
export const LEGACY_STORAGE_KEY = "gym-workout-log:v1";
export const SELECTED_USER_KEY = "gym-workout-log:selected-user";
export const DEFAULT_USERS = ["Abhinav", "Ankur"];

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Core",
  "Bodyweight",
  "Cardio",
  "Other",
];

export const TRACKING_TYPES = {
  WEIGHTED_REPS: "weighted-reps",
  BODYWEIGHT_REPS: "bodyweight-reps",
  TIMED_HOLD: "timed-hold",
  CARDIO: "cardio",
  CARRY: "carry",
  MOBILITY: "mobility",
};

export const BUILT_IN_EXERCISES = [
  ["bench-press", "Bench press", "Chest", TRACKING_TYPES.WEIGHTED_REPS],
  ["incline-dumbbell-press", "Incline dumbbell press", "Chest", TRACKING_TYPES.WEIGHTED_REPS],
  ["chest-fly", "Chest fly", "Chest", TRACKING_TYPES.WEIGHTED_REPS],
  ["lat-pulldown", "Lat pulldown", "Back", TRACKING_TYPES.WEIGHTED_REPS],
  ["barbell-row", "Barbell row", "Back", TRACKING_TYPES.WEIGHTED_REPS],
  ["seated-cable-row", "Seated cable row", "Back", TRACKING_TYPES.WEIGHTED_REPS],
  ["dead-hang", "Dead hang", "Back", TRACKING_TYPES.TIMED_HOLD],
  ["overhead-press", "Overhead press", "Shoulders", TRACKING_TYPES.WEIGHTED_REPS],
  ["lateral-raise", "Lateral raise", "Shoulders", TRACKING_TYPES.WEIGHTED_REPS],
  ["rear-delt-fly", "Rear delt fly", "Shoulders", TRACKING_TYPES.WEIGHTED_REPS],
  ["barbell-curl", "Barbell curl", "Biceps", TRACKING_TYPES.WEIGHTED_REPS],
  ["dumbbell-curl", "Dumbbell curl", "Biceps", TRACKING_TYPES.WEIGHTED_REPS],
  ["hammer-curl", "Hammer curl", "Biceps", TRACKING_TYPES.WEIGHTED_REPS],
  ["triceps-pushdown", "Triceps pushdown", "Triceps", TRACKING_TYPES.WEIGHTED_REPS],
  ["skull-crusher", "Skull crusher", "Triceps", TRACKING_TYPES.WEIGHTED_REPS],
  ["overhead-triceps-extension", "Overhead triceps extension", "Triceps", TRACKING_TYPES.WEIGHTED_REPS],
  ["squat", "Squat", "Legs", TRACKING_TYPES.WEIGHTED_REPS],
  ["leg-press", "Leg press", "Legs", TRACKING_TYPES.WEIGHTED_REPS],
  ["leg-curl", "Leg curl", "Legs", TRACKING_TYPES.WEIGHTED_REPS],
  ["leg-extension", "Leg extension", "Legs", TRACKING_TYPES.WEIGHTED_REPS],
  ["deadlift", "Deadlift", "Legs", TRACKING_TYPES.WEIGHTED_REPS],
  ["wall-sit", "Wall sit", "Legs", TRACKING_TYPES.TIMED_HOLD],
  ["farmer-carry", "Farmer carry", "Legs", TRACKING_TYPES.CARRY],
  ["plank", "Plank", "Core", TRACKING_TYPES.TIMED_HOLD],
  ["side-plank", "Side plank", "Core", TRACKING_TYPES.TIMED_HOLD],
  ["crunches", "Crunches", "Core", TRACKING_TYPES.BODYWEIGHT_REPS],
  ["push-ups", "Push-ups", "Bodyweight", TRACKING_TYPES.BODYWEIGHT_REPS],
  ["pull-ups", "Pull-ups", "Bodyweight", TRACKING_TYPES.BODYWEIGHT_REPS],
  ["dips", "Dips", "Bodyweight", TRACKING_TYPES.BODYWEIGHT_REPS],
  ["treadmill", "Treadmill", "Cardio", TRACKING_TYPES.CARDIO],
  ["cycling", "Cycling", "Cardio", TRACKING_TYPES.CARDIO],
  ["elliptical", "Elliptical", "Cardio", TRACKING_TYPES.CARDIO],
  ["rowing-machine", "Rowing machine", "Cardio", TRACKING_TYPES.CARDIO],
  ["stretching", "Stretching", "Other", TRACKING_TYPES.MOBILITY],
].map(([id, name, muscleGroup, mode]) => ({ id: `builtin:${id}`, name, muscleGroup, mode }));
