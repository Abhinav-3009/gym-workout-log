import { TRACKING_TYPES } from "./constants.js";
import { formatNumber } from "./utils.js";

export function normalizeMode(mode) {
  if (mode === "strength") return TRACKING_TYPES.WEIGHTED_REPS;
  if (mode === "bodyweight") return TRACKING_TYPES.BODYWEIGHT_REPS;
  if (Object.values(TRACKING_TYPES).includes(mode)) return mode;
  return TRACKING_TYPES.WEIGHTED_REPS;
}

export function normalizeSet(set, mode) {
  if (mode === TRACKING_TYPES.CARDIO) {
    return {
      duration: Number(set.duration) || 0,
      distance: Number(set.distance) || 0,
      intensity: set.intensity || "",
    };
  }
  if (mode === TRACKING_TYPES.TIMED_HOLD) {
    return {
      duration: Number(set.duration) || 0,
      weight: Number(set.weight) || 0,
      failure: Boolean(set.failure),
    };
  }
  if (mode === TRACKING_TYPES.CARRY) {
    return {
      weight: Number(set.weight) || 0,
      distance: Number(set.distance) || 0,
      duration: Number(set.duration) || 0,
    };
  }
  if (mode === TRACKING_TYPES.MOBILITY) {
    return {
      duration: Number(set.duration) || 0,
      notes: set.notes || "",
    };
  }
  return {
    reps: Number(set.reps) || 1,
    weight: Number(set.weight) || 0,
    failure: Boolean(set.failure),
    dropSet: Boolean(set.dropSet),
    dropSets: normalizeDropSets(set.dropSets || []),
  };
}

export function normalizeDropSets(dropSets) {
  if (!Array.isArray(dropSets)) return [];
  return dropSets.map((dropSet) => ({
    reps: Number(dropSet.reps) || 1,
    weight: Number(dropSet.weight) || 0,
  }));
}

export function normalizeSets(sets, mode) {
  return sets.map((set) => normalizeSet(set, mode));
}

export function getSetVolume(set) {
  const mainVolume = Number(set.reps || 0) * Number(set.weight || 0);
  const dropVolume = (set.dropSets || []).reduce(
    (sum, dropSet) => sum + Number(dropSet.reps || 0) * Number(dropSet.weight || 0),
    0,
  );
  return mainVolume + dropVolume;
}

export function getExerciseVolume(exercise) {
  if (![TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS].includes(exercise.mode)) return 0;
  return exercise.sets.reduce((sum, set) => sum + getSetVolume(set), 0);
}

export function getSessionVolume(session) {
  return session.exercises.reduce((sum, exercise) => sum + getExerciseVolume(exercise), 0);
}

export function getSessionSets(session) {
  return session.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
}

export function getFailureSetCount(session) {
  return session.exercises.reduce((count, exercise) => {
    if (![TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS, TRACKING_TYPES.TIMED_HOLD].includes(exercise.mode)) {
      return count;
    }
    return count + exercise.sets.filter((set) => set.failure).length;
  }, 0);
}

export function describeRepsSet(set, exercise) {
  const label = exercise.mode === TRACKING_TYPES.BODYWEIGHT_REPS ? "kg added" : "kg";
  const parts = [`${formatNumber(set.weight || 0)}${label === "kg" ? "kg" : "kg added"} x ${set.reps}`];
  if (set.dropSets?.length) {
    parts.push(
      `drop ${set.dropSets
        .map((dropSet) => `${formatNumber(dropSet.weight || 0)}${label === "kg" ? "kg" : "kg added"} x ${dropSet.reps}`)
        .join(" -> ")}`,
    );
  } else if (set.dropSet) {
    parts.push("drop");
  }
  return parts.join(" / ");
}

export function describeTimedSet(set) {
  const parts = [`${formatNumber(set.duration || 0)} sec`];
  if (set.weight) parts.push(`${formatNumber(set.weight)} kg added`);
  if (set.failure) parts.push("failure");
  return parts.join(" / ");
}

export function describeCardioSet(set) {
  const parts = [`${formatNumber(set.duration || 0)} min`];
  if (set.distance) parts.push(`${formatNumber(set.distance)} km`);
  if (set.intensity) parts.push(set.intensity);
  return parts.join(" / ");
}

export function describeCarrySet(set) {
  const parts = [];
  if (set.weight) parts.push(`${formatNumber(set.weight)} kg`);
  if (set.distance) parts.push(`${formatNumber(set.distance)} m`);
  if (set.duration) parts.push(`${formatNumber(set.duration)} sec`);
  return parts.length ? parts.join(" / ") : "Carry";
}

export function describeMobilitySet(set) {
  const parts = [];
  if (set.duration) parts.push(`${formatNumber(set.duration)} min`);
  if (set.notes) parts.push(set.notes);
  return parts.length ? parts.join(" / ") : "Mobility";
}

export function summarizeExercise(exercise) {
  if (exercise.mode === TRACKING_TYPES.CARDIO) return exercise.sets.map(describeCardioSet).join(", ");
  if (exercise.mode === TRACKING_TYPES.TIMED_HOLD) return exercise.sets.map(describeTimedSet).join(", ");
  if (exercise.mode === TRACKING_TYPES.CARRY) return exercise.sets.map(describeCarrySet).join(", ");
  if (exercise.mode === TRACKING_TYPES.MOBILITY) return exercise.sets.map(describeMobilitySet).join(", ");
  return exercise.sets.map((set) => describeRepsSet(set, exercise)).join(", ");
}

export function getBestSet(exercise) {
  if (![TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS].includes(exercise.mode)) return null;
  return [...exercise.sets].sort((a, b) => {
    if (Number(b.weight) !== Number(a.weight)) return Number(b.weight) - Number(a.weight);
    return Number(b.reps) - Number(a.reps);
  })[0];
}

export function modeLabel(mode) {
  if (mode === TRACKING_TYPES.BODYWEIGHT_REPS) return "Bodyweight reps";
  if (mode === TRACKING_TYPES.TIMED_HOLD) return "Timed hold";
  if (mode === TRACKING_TYPES.CARDIO) return "Cardio";
  if (mode === TRACKING_TYPES.CARRY) return "Carry / distance";
  if (mode === TRACKING_TYPES.MOBILITY) return "Mobility";
  return "Weighted reps";
}

export function defaultModeForMuscle(muscleGroup) {
  if (muscleGroup === "Cardio") return TRACKING_TYPES.CARDIO;
  if (muscleGroup === "Bodyweight") return TRACKING_TYPES.BODYWEIGHT_REPS;
  if (muscleGroup === "Core") return TRACKING_TYPES.TIMED_HOLD;
  return TRACKING_TYPES.WEIGHTED_REPS;
}
