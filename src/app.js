import {
  BUILT_IN_EXERCISES,
  DEFAULT_USERS,
  LEGACY_STORAGE_KEY,
  MUSCLE_GROUPS,
  SELECTED_USER_KEY,
  STORAGE_KEY,
  TRACKING_TYPES,
} from "./constants.js";
import {
  addDays,
  addMonths,
  createId,
  escapeHtml,
  formatNumber,
  getMondayIndex,
  getMonthStart,
  getTodayValue,
  slug,
  toDisplayDate,
} from "./utils.js";
import {
  defaultModeForMuscle,
  describeCardioSet,
  describeCarrySet,
  describeMobilitySet,
  describeRepsSet,
  describeTimedSet,
  getBestSet,
  getExerciseVolume,
  getFailureSetCount,
  getSessionSets,
  getSessionVolume,
  modeLabel,
  normalizeMode,
  normalizeSets,
  summarizeExercise,
} from "./workout.js";

const activeUserName = document.querySelector("#activeUserName");
const userSelect = document.querySelector("#userSelect");
const userForm = document.querySelector("#userForm");
const newUserNameInput = document.querySelector("#newUserName");
const deleteUserButton = document.querySelector("#deleteUser");
const exportDataButton = document.querySelector("#exportData");
const importDataInput = document.querySelector("#importData");
const tabButtons = document.querySelectorAll(".tab-button");
const subTabButtons = document.querySelectorAll(".sub-tab");
const logView = document.querySelector("#logView");
const historyView = document.querySelector("#historyView");
const sessionsView = document.querySelector("#sessionsView");
const progressView = document.querySelector("#progressView");
const form = document.querySelector("#workoutForm");
const editingId = document.querySelector("#editingId");
const dateInput = document.querySelector("#date");
const workoutNameInput = document.querySelector("#workoutName");
const exerciseList = document.querySelector("#exerciseList");
const exerciseCount = document.querySelector("#exerciseCount");
const notesInput = document.querySelector("#notes");
const submitButton = document.querySelector("#submitButton");
const resetFormButton = document.querySelector("#resetForm");
const addExerciseButton = document.querySelector("#addExercise");
const totalLogs = document.querySelector("#totalLogs");
const totalVolume = document.querySelector("#totalVolume");
const recentDate = document.querySelector("#recentDate");
const streakStatus = document.querySelector("#streakStatus");
const weekProgressBar = document.querySelector("#weekProgressBar");
const prevMonthButton = document.querySelector("#prevMonth");
const nextMonthButton = document.querySelector("#nextMonth");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarEmptyState = document.querySelector("#calendarEmptyState");
const progressExerciseInput = document.querySelector("#progressExercise");
const progressSummary = document.querySelector("#progressSummary");
const progressList = document.querySelector("#progressList");
const progressEmptyState = document.querySelector("#progressEmptyState");
const sessionDetail = document.querySelector("#sessionDetail");
const closeDetailButton = document.querySelector("#closeDetail");
const detailSessionCount = document.querySelector("#detailSessionCount");
const detailDate = document.querySelector("#detailDate");
const detailTitle = document.querySelector("#detailTitle");
const detailExercises = document.querySelector("#detailExercises");
const detailNotes = document.querySelector("#detailNotes");
const exerciseTemplate = document.querySelector("#exerciseTemplate");
const repsSetTemplate = document.querySelector("#repsSetTemplate");
const timedSetTemplate = document.querySelector("#timedSetTemplate");
const cardioSetTemplate = document.querySelector("#cardioSetTemplate");
const carrySetTemplate = document.querySelector("#carrySetTemplate");
const mobilitySetTemplate = document.querySelector("#mobilitySetTemplate");

let state = loadState();
let calendarMonth = getMonthStart(getTodayValue());
let selectedDetailDate = "";

function createUser(name) {
  return {
    id: createId(),
    name,
    createdAt: Date.now(),
  };
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function loadState() {
  const stored = readJson(STORAGE_KEY);
  if (stored?.users?.length) {
    const selectedUserId =
      localStorage.getItem(SELECTED_USER_KEY) ||
      stored.selectedUserId ||
      stored.users[0].id;
    const loaded = {
      users: stored.users,
      selectedUserId: stored.users.some((user) => user.id === selectedUserId)
        ? selectedUserId
        : stored.users[0].id,
      customExercises: normalizeCustomExercises(Array.isArray(stored.customExercises) ? stored.customExercises : []),
      sessions: normalizeSessions(Array.isArray(stored.sessions) ? stored.sessions : []),
    };
    hydrateMissingCustomExercises(loaded);
    return loaded;
  }

  const users = DEFAULT_USERS.map(createUser);
  const loaded = {
    users,
    selectedUserId: users[0].id,
    customExercises: [],
    sessions: migrateLegacyLogs(users[0].id),
  };
  hydrateMissingCustomExercises(loaded);
  return loaded;
}

function normalizeSessions(sessions) {
  return sessions.map((session) => ({
    ...session,
    workoutName: session.workoutName || "Workout",
    notes: session.notes || "",
    exercises: (session.exercises || []).map((exercise) => {
      const mode = normalizeMode(exercise.mode || defaultModeForMuscle(exercise.muscleGroup));
      return {
        id: exercise.id || createId(),
        exerciseId: exercise.exerciseId || "",
        name: exercise.name || "Exercise",
        muscleGroup: exercise.muscleGroup || "Other",
        mode,
        sets: normalizeSets(exercise.sets || [], mode),
      };
    }),
  }));
}

function normalizeCustomExercises(exercises) {
  return exercises.map((exercise) => ({
    ...exercise,
    mode: normalizeMode(exercise.mode || defaultModeForMuscle(exercise.muscleGroup)),
  }));
}

function migrateLegacyLogs(userId) {
  const legacyLogs = readJson(LEGACY_STORAGE_KEY);
  if (!Array.isArray(legacyLogs)) return [];

  return legacyLogs.map((log) => {
    const setCount = Math.max(1, Number(log.sets) || 1);
    const sets = Array.from({ length: setCount }, () => ({
      reps: Number(log.reps) || 1,
      weight: Number(log.weight) || 0,
      failure: false,
    }));

    return {
      id: createId(),
      userId,
      date: log.date || getTodayValue(),
      workoutName: log.workout || "Workout",
      notes: log.notes || "",
      exercises: [
        {
          id: createId(),
          exerciseId: "",
          name: log.exercise || "Exercise",
          muscleGroup: "Other",
          mode: TRACKING_TYPES.WEIGHTED_REPS,
          sets,
        },
      ],
      createdAt: Number(log.createdAt) || Date.now(),
      updatedAt: Date.now(),
    };
  });
}

function hydrateMissingCustomExercises(loadedState) {
  loadedState.sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const builtIn = findBuiltInByName(exercise.name, exercise.mode);
      if (builtIn) {
        exercise.exerciseId = builtIn.id;
        exercise.muscleGroup = exercise.muscleGroup || builtIn.muscleGroup;
        exercise.mode = exercise.mode || builtIn.mode;
        return;
      }

      let custom = loadedState.customExercises.find(
        (item) =>
          item.userId === session.userId &&
          item.name.toLowerCase() === exercise.name.toLowerCase() &&
          item.mode === exercise.mode,
      );
      if (!custom) {
        custom = {
          id: `custom:${session.userId}:${slug(exercise.name)}:${exercise.mode}`,
          userId: session.userId,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup || "Other",
          mode: normalizeMode(exercise.mode || TRACKING_TYPES.WEIGHTED_REPS),
          createdAt: Date.now(),
        };
        loadedState.customExercises.push(custom);
      }
      exercise.exerciseId = custom.id;
    });
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(SELECTED_USER_KEY, state.selectedUserId);
}

function createExportPayload() {
  return {
    app: "gym-workout-log",
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    version: 2,
    data: state,
  };
}

function exportBackup() {
  const payload = createExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `gym-workout-log-backup-${getTodayValue()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getImportData(payload) {
  const data = payload?.data || payload;
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.sessions)) return null;
  return {
    users: data.users,
    selectedUserId: data.users.some((user) => user.id === data.selectedUserId)
      ? data.selectedUserId
      : data.users[0]?.id,
    customExercises: normalizeCustomExercises(Array.isArray(data.customExercises) ? data.customExercises : []),
    sessions: normalizeSessions(data.sessions),
  };
}

function importBackup(data) {
  const imported = getImportData(data);
  if (!imported?.users.length || !imported.selectedUserId) {
    alert("This backup file does not look valid.");
    return false;
  }
  if (!confirm("Importing this backup will replace the current data on this device. Continue?")) {
    return false;
  }
  hydrateMissingCustomExercises(imported);
  state = imported;
  saveState();
  calendarMonth = getMonthStart(getTodayValue());
  selectedDetailDate = "";
  hideSessionDetail();
  resetForm();
  renderUsers();
  renderAllExercisePickers();
  renderHistory();
  alert("Backup imported.");
  return true;
}

function getActiveUser() {
  return state.users.find((user) => user.id === state.selectedUserId) || state.users[0];
}

function getActiveSessions() {
  return state.sessions.filter((session) => session.userId === state.selectedUserId);
}

function getExerciseLibrary() {
  const custom = state.customExercises.filter((exercise) => exercise.userId === state.selectedUserId);
  return [...BUILT_IN_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name));
}

function findBuiltInByName(name, mode) {
  return BUILT_IN_EXERCISES.find(
    (exercise) => exercise.name.toLowerCase() === name.toLowerCase() && (!mode || exercise.mode === mode),
  );
}

function findExerciseDefinition(id) {
  return [...BUILT_IN_EXERCISES, ...state.customExercises].find((exercise) => exercise.id === id);
}

function renderUsers() {
  const activeUser = getActiveUser();
  activeUserName.textContent = activeUser?.name || "No user";
  userSelect.replaceChildren();
  state.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    option.selected = user.id === state.selectedUserId;
    userSelect.append(option);
  });
  deleteUserButton.disabled = state.users.length <= 1;
}

function setActiveView(viewName) {
  const showHistory = viewName === "history";
  logView.classList.toggle("is-active", !showHistory);
  historyView.classList.toggle("is-active", showHistory);
  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
}

function setHistoryView(viewName) {
  const showProgress = viewName === "progress";
  sessionsView.classList.toggle("is-active", !showProgress);
  progressView.classList.toggle("is-active", showProgress);
  subTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.historyView === viewName);
  });
}

function renderMuscleOptions(select, selectedValue = "Chest") {
  select.replaceChildren();
  MUSCLE_GROUPS.forEach((muscle) => {
    const option = document.createElement("option");
    option.value = muscle;
    option.textContent = muscle;
    option.selected = muscle === selectedValue;
    select.append(option);
  });
}

function renderExercisePicker(select, selectedId = "", muscleGroup = "") {
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = muscleGroup ? `Choose ${muscleGroup} exercise` : "Choose exercise";
  select.append(placeholder);

  getExerciseLibrary()
    .filter((exercise) => !muscleGroup || exercise.muscleGroup === muscleGroup)
    .forEach((exercise) => {
      const option = document.createElement("option");
      option.value = exercise.id;
      option.textContent = exercise.name;
      option.selected = exercise.id === selectedId;
      select.append(option);
    });

  const addOption = document.createElement("option");
  addOption.value = "__custom__";
  addOption.textContent = muscleGroup ? `Add new ${muscleGroup} exercise...` : "Add new exercise...";
  select.append(addOption);
}

function renderAllExercisePickers() {
  exerciseList.querySelectorAll(".exercise-card").forEach((card) => {
    renderExercisePicker(
      card.querySelector(".exercise-picker"),
      card.dataset.exerciseId || "",
      card.querySelector(".exercise-muscle").value,
    );
  });
}

function updateExerciseCount() {
  const count = exerciseList.children.length;
  exerciseCount.textContent = `${count} ${count === 1 ? "exercise" : "exercises"}`;
  [...exerciseList.querySelectorAll(".remove-exercise")].forEach((button) => {
    button.disabled = count <= 1;
  });
}

function setExerciseExpanded(card, expanded) {
  card.classList.toggle("is-collapsed", !expanded);
  card.querySelector(".exercise-summary-button").setAttribute("aria-expanded", String(expanded));
}

function collapseOtherExercises(activeCard) {
  exerciseList.querySelectorAll(".exercise-card").forEach((card) => {
    if (card !== activeCard) setExerciseExpanded(card, false);
  });
}

function applyExerciseDefinition(card, exercise) {
  card.dataset.exerciseId = exercise.id;
  card.dataset.exerciseName = exercise.name;
  card.dataset.mode = exercise.mode;
  card.querySelector(".exercise-muscle").value = exercise.muscleGroup;
  card.querySelector(".exercise-mode").value = exercise.mode;
  renderExercisePicker(card.querySelector(".exercise-picker"), exercise.id, exercise.muscleGroup);
  card.querySelector(".custom-exercise-panel").hidden = true;
  ensureSetRowsForMode(card, exercise.mode);
  updateExerciseSummary(card);
}

function updateExerciseSummary(card) {
  const name = card.dataset.exerciseName || "New exercise";
  const mode = normalizeMode(card.dataset.mode || card.querySelector(".exercise-mode").value);
  const muscle = card.querySelector(".exercise-muscle").value || "Other";
  updateSetSummaries(card);
  const sets = getExerciseDataFromCard(card).sets;
  const title = card.querySelector(".summary-title");
  const meta = card.querySelector(".summary-meta");
  title.textContent = name;
  meta.textContent = `${muscle} - ${modeLabel(mode)} - ${sets.length} ${sets.length === 1 ? "set" : "sets"}${sets.length ? ` - ${summarizeExercise({ mode, sets })}` : ""}`;
}

function clearSelectedExercise(card) {
  card.dataset.exerciseId = "";
  card.dataset.exerciseName = "";
  card.querySelector(".exercise-picker").value = "";
}

function updateSetRemoveButtons(card) {
  const setRows = card.querySelectorAll(".set-row");
  setRows.forEach((setRow) => {
    setRow.querySelector(".remove-set").disabled = setRows.length <= 1;
  });
}

function ensureSetSummaryButton(setRow) {
  let button = setRow.querySelector(".set-summary-button");
  if (button) return button;

  button = document.createElement("button");
  button.className = "set-summary-button";
  button.type = "button";
  setRow.prepend(button);
  return button;
}

function setSetExpanded(setRow, expanded) {
  const summaryButton = ensureSetSummaryButton(setRow);
  setRow.classList.toggle("is-collapsed", !expanded);
  summaryButton.hidden = expanded;
  summaryButton.setAttribute("aria-expanded", String(expanded));
  [...setRow.children].forEach((child) => {
    if (child !== summaryButton) child.hidden = !expanded;
  });
}

function collapseSetRows(card) {
  card.querySelectorAll(".set-row").forEach((setRow) => setSetExpanded(setRow, false));
}

function updateSetSummaries(card) {
  const mode = normalizeMode(card.dataset.mode || card.querySelector(".exercise-mode").value);
  card.querySelectorAll(".set-row").forEach((setRow, index) => {
    const set = getSetDataFromRow(setRow, mode);
    ensureSetSummaryButton(setRow).textContent = `Set ${index + 1}: ${describeSet(set, { mode })}`;
  });
}

function addSet(card, data = {}) {
  const mode = normalizeMode(card.dataset.mode || card.querySelector(".exercise-mode").value);
  const template = getSetTemplate(mode);
  const node = template.content.firstElementChild.cloneNode(true);
  if (mode === TRACKING_TYPES.CARDIO) {
    node.querySelector(".cardio-duration").value = data.duration ?? "";
    node.querySelector(".cardio-distance").value = data.distance ?? "";
    node.querySelector(".cardio-intensity").value = data.intensity ?? "";
  } else if (mode === TRACKING_TYPES.TIMED_HOLD) {
    node.querySelector(".timed-duration").value = data.duration ?? "";
    node.querySelector(".timed-weight").value = data.weight ?? 0;
    node.querySelector(".timed-failure").checked = Boolean(data.failure);
  } else if (mode === TRACKING_TYPES.CARRY) {
    node.querySelector(".carry-weight").value = data.weight ?? "";
    node.querySelector(".carry-distance").value = data.distance ?? "";
    node.querySelector(".carry-duration").value = data.duration ?? "";
  } else if (mode === TRACKING_TYPES.MOBILITY) {
    node.querySelector(".mobility-duration").value = data.duration ?? "";
    node.querySelector(".mobility-notes").value = data.notes ?? "";
  } else {
    node.querySelector(".weight-label").textContent = mode === TRACKING_TYPES.BODYWEIGHT_REPS ? "Added weight" : "Weight";
    node.querySelector(".set-reps").value = data.reps ?? 10;
    node.querySelector(".set-weight").value = data.weight ?? 0;
    node.querySelector(".set-failure").checked = Boolean(data.failure);
    (data.dropSets || []).forEach((dropSet) => addDropSetRow(node, dropSet));
    if (data.dropSet && !(data.dropSets || []).length) {
      node.dataset.legacyDropSet = "true";
    }
  }
  card.querySelector(".set-list").append(node);
  setSetExpanded(node, true);
  updateSetRemoveButtons(card);
  updateSetSummaries(card);
  updateExerciseSummary(card);
}

function addDropSetRow(setRow, data = {}) {
  const dropRow = document.createElement("div");
  dropRow.className = "drop-set-row";
  dropRow.innerHTML = `
    <label>
      Drop reps
      <input class="drop-reps" type="number" min="1" max="200" step="1" required />
    </label>
    <label>
      Drop weight
      <input class="drop-weight" type="number" min="0" max="1000" step="0.5" placeholder="kg" />
    </label>
    <button class="secondary-action danger remove-drop-set" type="button">Remove drop</button>
  `;
  dropRow.querySelector(".drop-reps").value = data.reps ?? 8;
  dropRow.querySelector(".drop-weight").value = data.weight ?? "";
  setRow.querySelector(".drop-set-list").append(dropRow);
}

function getSetTemplate(mode) {
  if (mode === TRACKING_TYPES.CARDIO) return cardioSetTemplate;
  if (mode === TRACKING_TYPES.TIMED_HOLD) return timedSetTemplate;
  if (mode === TRACKING_TYPES.CARRY) return carrySetTemplate;
  if (mode === TRACKING_TYPES.MOBILITY) return mobilitySetTemplate;
  return repsSetTemplate;
}

function ensureSetRowsForMode(card, mode) {
  const normalizedMode = normalizeMode(mode);
  const existingMode = getModeFromSetRow(card.querySelector(".set-row"));
  if (card.querySelector(".set-row") && existingMode === normalizedMode) {
    card.querySelectorAll(".weight-label").forEach((label) => {
      label.textContent = normalizedMode === TRACKING_TYPES.BODYWEIGHT_REPS ? "Added weight" : "Weight";
    });
    return;
  }
  card.querySelector(".set-list").replaceChildren();
  addSet(card);
}

function getModeFromSetRow(row) {
  if (!row) return "";
  if (row.classList.contains("cardio-set-row")) return TRACKING_TYPES.CARDIO;
  if (row.classList.contains("timed-set-row")) return TRACKING_TYPES.TIMED_HOLD;
  if (row.classList.contains("carry-set-row")) return TRACKING_TYPES.CARRY;
  if (row.classList.contains("mobility-set-row")) return TRACKING_TYPES.MOBILITY;
  return TRACKING_TYPES.WEIGHTED_REPS;
}

function getDefaultSet(mode) {
  const normalizedMode = normalizeMode(mode);
  if (normalizedMode === TRACKING_TYPES.CARDIO) return { duration: "", distance: "", intensity: "" };
  if (normalizedMode === TRACKING_TYPES.TIMED_HOLD) return { duration: "", weight: 0, failure: false };
  if (normalizedMode === TRACKING_TYPES.CARRY) return { weight: "", distance: "", duration: "" };
  if (normalizedMode === TRACKING_TYPES.MOBILITY) return { duration: "", notes: "" };
  return { reps: 10, weight: 0, failure: false, dropSets: [] };
}

function addExercise(data = {}, options = {}) {
  if (options.collapseExisting !== false) {
    exerciseList.querySelectorAll(".exercise-card").forEach((card) => setExerciseExpanded(card, false));
  }

  const card = exerciseTemplate.content.firstElementChild.cloneNode(true);
  const exerciseDef = data.exerciseId ? findExerciseDefinition(data.exerciseId) : null;
  const fallbackDef = exerciseDef || {
    id: data.exerciseId || "",
    name: data.name || "",
    muscleGroup: data.muscleGroup || "Chest",
    mode: normalizeMode(data.mode || TRACKING_TYPES.WEIGHTED_REPS),
  };
  card.dataset.id = data.id || createId();
  card.dataset.exerciseId = fallbackDef.id;
  card.dataset.exerciseName = fallbackDef.name;
  card.dataset.mode = fallbackDef.mode;

  renderMuscleOptions(card.querySelector(".exercise-muscle"), fallbackDef.muscleGroup);
  renderMuscleOptions(card.querySelector(".custom-muscle"), fallbackDef.muscleGroup);
  renderExercisePicker(card.querySelector(".exercise-picker"), fallbackDef.id, fallbackDef.muscleGroup);
  card.querySelector(".exercise-mode").value = fallbackDef.mode;
  card.querySelector(".custom-mode").value = fallbackDef.mode;

  const sets = data.sets?.length ? data.sets : [getDefaultSet(fallbackDef.mode)];
  sets.forEach((set) => addSet(card, set));
  exerciseList.append(card);
  setExerciseExpanded(card, options.expanded !== false);
  updateExerciseSummary(card);
  updateExerciseCount();
  return card;
}

function resetForm() {
  editingId.value = "";
  form.reset();
  exerciseList.replaceChildren();
  dateInput.value = getTodayValue();
  workoutNameInput.value = "";
  notesInput.value = "";
  addExercise({}, { collapseExisting: false });
  submitButton.textContent = "Save workout";
}

function getExerciseDataFromCard(card) {
  const mode = normalizeMode(card.dataset.mode || card.querySelector(".exercise-mode").value);
  return {
    id: card.dataset.id || createId(),
    exerciseId: card.dataset.exerciseId || "",
    name: card.dataset.exerciseName || "",
    muscleGroup: card.querySelector(".exercise-muscle").value,
    mode,
    sets: [...card.querySelectorAll(".set-row")].map((setRow) => getSetDataFromRow(setRow, mode)),
  };
}

function getSetDataFromRow(setRow, mode) {
  if (mode === TRACKING_TYPES.CARDIO) {
    return {
      duration: Number(setRow.querySelector(".cardio-duration").value || 0),
      distance: Number(setRow.querySelector(".cardio-distance").value || 0),
      intensity: setRow.querySelector(".cardio-intensity").value.trim(),
    };
  }
  if (mode === TRACKING_TYPES.TIMED_HOLD) {
    return {
      duration: Number(setRow.querySelector(".timed-duration").value || 0),
      weight: Number(setRow.querySelector(".timed-weight").value || 0),
      failure: setRow.querySelector(".timed-failure").checked,
    };
  }
  if (mode === TRACKING_TYPES.CARRY) {
    return {
      weight: Number(setRow.querySelector(".carry-weight").value || 0),
      distance: Number(setRow.querySelector(".carry-distance").value || 0),
      duration: Number(setRow.querySelector(".carry-duration").value || 0),
    };
  }
  if (mode === TRACKING_TYPES.MOBILITY) {
    return {
      duration: Number(setRow.querySelector(".mobility-duration").value || 0),
      notes: setRow.querySelector(".mobility-notes").value.trim(),
    };
  }

  return {
    reps: Number(setRow.querySelector(".set-reps").value),
    weight: Number(setRow.querySelector(".set-weight").value || 0),
    failure: setRow.querySelector(".set-failure").checked,
    dropSet: setRow.dataset.legacyDropSet === "true" && !setRow.querySelector(".drop-set-row"),
    dropSets: [...setRow.querySelectorAll(".drop-set-row")].map((dropRow) => ({
      reps: Number(dropRow.querySelector(".drop-reps").value),
      weight: Number(dropRow.querySelector(".drop-weight").value || 0),
    })),
  };
}

function getFormPayload() {
  return {
    userId: state.selectedUserId,
    date: dateInput.value,
    workoutName: workoutNameInput.value.trim(),
    notes: notesInput.value.trim(),
    exercises: [...exerciseList.querySelectorAll(".exercise-card")].map(getExerciseDataFromCard),
  };
}

function validatePayload(payload) {
  if (!payload.workoutName) return "Workout name is required.";
  if (!payload.exercises.length) return "Add at least one exercise.";
  if (payload.exercises.some((exercise) => !exercise.name || !exercise.exerciseId)) {
    return "Choose or add an exercise for every exercise card.";
  }
  if (payload.exercises.some((exercise) => !exercise.muscleGroup || !exercise.mode)) {
    return "Each exercise needs a muscle/type and mode.";
  }
  if (payload.exercises.some((exercise) => !exercise.sets.length)) return "Each exercise needs at least one set.";
  if (payload.exercises.some((exercise) => [TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS].includes(exercise.mode) && exercise.sets.some((set) => !set.reps))) {
    return "Each reps-based set needs reps.";
  }
  if (payload.exercises.some((exercise) => [TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS].includes(exercise.mode) && exercise.sets.some((set) => set.dropSets?.some((dropSet) => !dropSet.reps)))) {
    return "Each drop set needs reps.";
  }
  if (payload.exercises.some((exercise) => [TRACKING_TYPES.CARDIO, TRACKING_TYPES.TIMED_HOLD].includes(exercise.mode) && exercise.sets.some((set) => !set.duration))) {
    return "Each cardio or timed hold set needs duration.";
  }
  if (payload.exercises.some((exercise) => exercise.mode === TRACKING_TYPES.CARRY && exercise.sets.some((set) => !set.distance && !set.duration))) {
    return "Each carry set needs distance or duration.";
  }
  return "";
}

function editSession(session) {
  editingId.value = session.id;
  dateInput.value = session.date;
  workoutNameInput.value = session.workoutName;
  notesInput.value = session.notes;
  exerciseList.replaceChildren();
  session.exercises.forEach((exercise, index) => addExercise(exercise, { collapseExisting: false, expanded: index === 0 }));
  submitButton.textContent = "Update workout";
  hideSessionDetail();
  setActiveView("log");
  workoutNameInput.focus();
}

function renderStats() {
  const sessions = getActiveSessions();
  const streaks = getWorkoutDayStreaks(sessions);
  totalLogs.textContent = formatStreakNumber(streaks.current);
  totalVolume.textContent = `${streaks.thisWeek}/${WEEKLY_STREAK_TARGET}`;
  recentDate.textContent = formatStreakNumber(streaks.best);
  totalVolume.className = getWeekProgressClass(streaks.thisWeek);
  streakStatus.textContent = getStreakStatus(streaks);
  weekProgressBar.style.width = `${Math.min((streaks.thisWeek / WEEKLY_STREAK_TARGET) * 100, 100)}%`;
}

function getWeekStart(dateValue) {
  return addDays(dateValue, -getMondayIndex(dateValue));
}

const WEEKLY_STREAK_TARGET = 4;

function formatStreakNumber(days) {
  if (!days) return "-";
  return String(days);
}

function getWeekProgressClass(days) {
  if (days >= WEEKLY_STREAK_TARGET) return "is-positive";
  if (days === WEEKLY_STREAK_TARGET - 1) return "is-warning";
  return "";
}

function getStreakStatus(streaks) {
  const remaining = Math.max(WEEKLY_STREAK_TARGET - streaks.thisWeek, 0);
  if (streaks.thisWeek >= WEEKLY_STREAK_TARGET) {
    return streaks.thisWeek > WEEKLY_STREAK_TARGET ? "Extra day added" : "Week locked";
  }
  if (!streaks.current) return `${remaining} to start a streak`;
  return `${remaining} more to lock this week`;
}

function getWorkoutDayStreaks(sessions) {
  const datesByWeek = getWorkoutDatesByWeek(sessions);
  const thisWeek = getWeekStart(getTodayValue());
  const sortedWeeks = [...datesByWeek.keys()].filter((weekStart) => weekStart <= thisWeek).sort();
  let runDays = 0;
  let best = 0;
  let previousWeek = "";

  sortedWeeks.forEach((weekStart) => {
    const weekDays = datesByWeek.get(weekStart).size;
    const isCurrentWeek = weekStart === thisWeek;
    const weekQualifies = weekDays >= WEEKLY_STREAK_TARGET;
    const isConsecutive = !previousWeek || weekStart === addDays(previousWeek, 7);

    if (!isConsecutive) runDays = 0;

    if (weekQualifies || isCurrentWeek) {
      runDays += weekDays;
      best = Math.max(best, runDays);
    } else {
      runDays = 0;
    }
    previousWeek = weekStart;
  });

  const thisWeekDays = datesByWeek.get(thisWeek)?.size || 0;
  const current = getCurrentWorkoutDayStreak(datesByWeek, thisWeek);
  return { current, best, thisWeek: thisWeekDays };
}

function getCurrentWorkoutDayStreak(datesByWeek, thisWeek) {
  const currentWeekDays = datesByWeek.get(thisWeek)?.size || 0;
  let weekStart = thisWeek;
  let current = currentWeekDays;

  while (weekStart) {
    const previous = addDays(weekStart, -7);
    const previousDays = datesByWeek.get(previous)?.size || 0;
    if (previousDays < WEEKLY_STREAK_TARGET) break;
    current += previousDays;
    weekStart = previous;
  }

  return current;
}

function getWorkoutDatesByWeek(sessions) {
  const datesByWeek = new Map();
  sessions.forEach((session) => {
    const weekStart = getWeekStart(session.date);
    if (!datesByWeek.has(weekStart)) datesByWeek.set(weekStart, new Set());
    datesByWeek.get(weekStart).add(session.date);
  });
  return datesByWeek;
}

function renderCalendar() {
  const monthStart = calendarMonth;
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart}T00:00:00`));
  calendarTitle.textContent = monthLabel;
  calendarGrid.replaceChildren();

  const activeSessions = getActiveSessions();
  const sessionsByDate = new Map();
  activeSessions.forEach((session) => {
    if (!sessionsByDate.has(session.date)) sessionsByDate.set(session.date, []);
    sessionsByDate.get(session.date).push(session);
  });

  const firstCell = addDays(monthStart, -getMondayIndex(monthStart));
  let hasSessionInMonth = false;
  for (let index = 0; index < 42; index += 1) {
    const dateValue = addDays(firstCell, index);
    const sessions = sessionsByDate.get(dateValue) || [];
    const isCurrentMonth = dateValue.slice(0, 7) === monthStart.slice(0, 7);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.dataset.date = dateValue;
    button.disabled = !sessions.length;
    button.classList.toggle("is-muted", !isCurrentMonth);
    button.classList.toggle("has-session", sessions.length > 0);
    if (sessions.length && isCurrentMonth) hasSessionInMonth = true;
    button.setAttribute(
      "aria-label",
      sessions.length
        ? `${toDisplayDate(dateValue)}, ${sessions.length} workout${sessions.length === 1 ? "" : "s"}`
        : toDisplayDate(dateValue),
    );
    button.innerHTML = `
      <span>${Number(dateValue.slice(8, 10))}</span>
      ${sessions.length ? `<small class="calendar-session-mark" aria-hidden="true">${sessions.length > 1 ? `${sessions.length}x` : "🔥"}</small>` : ""}
    `;
    calendarGrid.append(button);
  }
  calendarEmptyState.classList.toggle("is-visible", !hasSessionInMonth);
}

function renderProgressOptions() {
  const current = progressExerciseInput.value;
  progressExerciseInput.replaceChildren();
  const sessionExercises = new Map();
  getActiveSessions().forEach((session) => {
    session.exercises.forEach((exercise) => {
      if (!sessionExercises.has(exercise.exerciseId)) {
        sessionExercises.set(exercise.exerciseId, exercise);
      }
    });
  });

  if (!sessionExercises.size) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No exercises logged yet";
    progressExerciseInput.append(option);
    return;
  }

  [...sessionExercises.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((exercise) => {
      const option = document.createElement("option");
      option.value = exercise.exerciseId;
      option.textContent = exercise.name;
      option.selected = exercise.exerciseId === current;
      progressExerciseInput.append(option);
    });

  if (![...progressExerciseInput.options].some((option) => option.selected)) {
    progressExerciseInput.selectedIndex = 0;
  }
}

function renderProgress() {
  renderProgressOptions();
  const exerciseId = progressExerciseInput.value;
  progressList.replaceChildren();

  const rows = getActiveSessions()
    .flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .map((exercise) => ({ session, exercise })),
    )
    .sort((a, b) => b.session.date.localeCompare(a.session.date));

  progressEmptyState.classList.toggle("is-visible", rows.length === 0);
  progressSummary.replaceChildren();
  if (!rows.length) return;

  const latest = rows[0].exercise;
  const mode = latest.mode;
  const analysis = getProgressAnalysis(rows);
  const prSessionIds = getPrSessionIds(rows);
  progressSummary.innerHTML = renderProgressSummary(analysis, latest, rows.length);
  progressList.insertAdjacentHTML("beforeend", renderProgressCharts(analysis));

  rows.forEach(({ session, exercise }) => {
    const card = document.createElement("details");
    card.className = "progress-card";
    const point = getProgressPoint(exercise);
    const bestSet = getBestSet(exercise);
    const canTrackFailure = [TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS, TRACKING_TYPES.TIMED_HOLD].includes(exercise.mode);
    const failureCount = canTrackFailure ? exercise.sets.filter((set) => set.failure).length : 0;
    const compactSets = summarizeExercise(exercise);
    const bestLabel = bestSet ? describeRepsSet(bestSet, exercise) : getNonRepsBestLabel(exercise);
    const isPr = prSessionIds.has(session.id);

    card.innerHTML = `
      <summary>
        <span>
          <small>${escapeHtml(toDisplayDate(session.date))}</small>
          <strong>${escapeHtml(session.workoutName)}${isPr ? ' <span class="pr-badge">PR</span>' : ""}</strong>
        </span>
        <span class="progress-main-value">${escapeHtml(point.display)}</span>
      </summary>
      <div class="progress-grid">
        <div><small>Best</small><strong>${escapeHtml(bestLabel)}</strong></div>
        <div><small>Sets</small><strong>${escapeHtml(compactSets)}</strong></div>
        <div><small>Volume</small><strong>${getExerciseVolume(exercise) ? `${formatNumber(getExerciseVolume(exercise))} kg` : "-"}</strong></div>
        <div><small>Failure</small><strong>${canTrackFailure ? failureCount : "-"}</strong></div>
      </div>
    `;
    progressList.append(card);
  });
}

function getProgressAnalysis(rows) {
  const ascending = [...rows].sort((a, b) => a.session.date.localeCompare(b.session.date));
  const points = ascending.map(({ session, exercise }) => ({
    date: session.date,
    sessionId: session.id,
    label: toDisplayDate(session.date),
    ...getProgressPoint(exercise),
    secondary: getSecondaryProgressPoint(exercise),
  }));
  let bestSoFar = -Infinity;
  points.forEach((point) => {
    point.isPr = point.value > bestSoFar && point.value > 0;
    bestSoFar = Math.max(bestSoFar, point.value);
  });
  const latest = points.at(-1);
  const previous = points.at(-2);
  const best = [...points].sort((a, b) => b.value - a.value)[0];
  const change = latest && previous ? latest.value - previous.value : 0;
  return {
    points,
    latest,
    previous,
    best,
    change,
    primaryLabel: latest?.metricLabel || "Progress",
    primaryUnit: latest?.unit || "",
    secondaryLabel: latest?.secondary?.metricLabel || "",
    secondaryUnit: latest?.secondary?.unit || "",
    secondaryPoints: points
      .filter((point) => point.secondary)
      .map((point) => ({
        date: point.date,
        label: point.label,
        value: point.secondary.value,
        display: point.secondary.display,
      })),
  };
}

function getPrSessionIds(rows) {
  return new Set(getProgressAnalysis(rows).points.filter((point) => point.isPr).map((point) => point.sessionId));
}

function getActivePrExerciseKeys() {
  const keys = new Set();
  const bestByExercise = new Map();
  getActiveSessions()
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .forEach((session) => {
      session.exercises.forEach((exercise) => {
        const point = getProgressPoint(exercise);
        const previous = bestByExercise.get(exercise.exerciseId) || 0;
        if (point.value > previous && point.value > 0) {
          keys.add(`${session.id}:${exercise.exerciseId}`);
          bestByExercise.set(exercise.exerciseId, point.value);
        }
      });
    });
  return keys;
}

function getProgressPoint(exercise) {
  if ([TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS].includes(exercise.mode)) {
    const best = getBestSet(exercise) || { weight: 0, reps: 0 };
    return {
      metricLabel: exercise.mode === TRACKING_TYPES.BODYWEIGHT_REPS ? "Added weight" : "Best weight",
      unit: "kg",
      value: Number(best.weight) || 0,
      display: describeRepsSet(best, exercise),
    };
  }
  if (exercise.mode === TRACKING_TYPES.TIMED_HOLD) {
    const best = [...exercise.sets].sort((a, b) => Number(b.duration) - Number(a.duration))[0] || {};
    return {
      metricLabel: "Best hold",
      unit: "sec",
      value: Number(best.duration) || 0,
      display: describeTimedSet(best),
    };
  }
  if (exercise.mode === TRACKING_TYPES.CARDIO) {
    const totalDistance = exercise.sets.reduce((sum, set) => sum + Number(set.distance || 0), 0);
    const totalDuration = exercise.sets.reduce((sum, set) => sum + Number(set.duration || 0), 0);
    return {
      metricLabel: totalDistance ? "Distance" : "Duration",
      unit: totalDistance ? "km" : "min",
      value: totalDistance || totalDuration,
      display: totalDistance ? `${formatNumber(totalDistance)} km` : `${formatNumber(totalDuration)} min`,
    };
  }
  if (exercise.mode === TRACKING_TYPES.CARRY) {
    const best = [...exercise.sets].sort((a, b) => Number(b.distance) - Number(a.distance))[0] || {};
    return {
      metricLabel: "Distance",
      unit: "m",
      value: Number(best.distance) || 0,
      display: describeCarrySet(best),
    };
  }
  if (exercise.mode === TRACKING_TYPES.MOBILITY) {
    const totalDuration = exercise.sets.reduce((sum, set) => sum + Number(set.duration || 0), 0);
    return {
      metricLabel: "Duration",
      unit: "min",
      value: totalDuration,
      display: `${formatNumber(totalDuration)} min`,
    };
  }
  return { metricLabel: "Progress", unit: "", value: 0, display: "-" };
}

function getSecondaryProgressPoint(exercise) {
  if ([TRACKING_TYPES.WEIGHTED_REPS, TRACKING_TYPES.BODYWEIGHT_REPS].includes(exercise.mode)) {
    const bestReps = Math.max(...exercise.sets.map((set) => Number(set.reps) || 0));
    return {
      metricLabel: "Best reps",
      unit: "reps",
      value: bestReps,
      display: `${bestReps} reps`,
    };
  }
  if (exercise.mode === TRACKING_TYPES.TIMED_HOLD) {
    const totalDuration = exercise.sets.reduce((sum, set) => sum + Number(set.duration || 0), 0);
    return {
      metricLabel: "Total hold",
      unit: "sec",
      value: totalDuration,
      display: `${formatNumber(totalDuration)} sec`,
    };
  }
  if (exercise.mode === TRACKING_TYPES.CARDIO) {
    const totalDuration = exercise.sets.reduce((sum, set) => sum + Number(set.duration || 0), 0);
    return {
      metricLabel: "Duration",
      unit: "min",
      value: totalDuration,
      display: `${formatNumber(totalDuration)} min`,
    };
  }
  if (exercise.mode === TRACKING_TYPES.CARRY) {
    const bestWeight = Math.max(...exercise.sets.map((set) => Number(set.weight) || 0));
    return {
      metricLabel: "Weight",
      unit: "kg",
      value: bestWeight,
      display: `${formatNumber(bestWeight)} kg`,
    };
  }
  return null;
}

function renderProgressSummary(analysis, exercise, sessionCount) {
  const changeLabel = getChangeLabel(analysis.change, analysis.primaryUnit);
  return `
    <article class="analysis-card is-featured">
      <small>Latest</small>
      <strong>${escapeHtml(analysis.latest?.display || "-")}</strong>
      <span>${escapeHtml(analysis.primaryLabel)}</span>
    </article>
    <article class="analysis-card">
      <small>Personal best</small>
      <strong>${escapeHtml(analysis.best?.display || "-")}</strong>
      <span>${escapeHtml(analysis.best?.label || "")}</span>
    </article>
    <article class="analysis-card">
      <small>Since previous</small>
      <strong class="${analysis.change > 0 ? "is-positive" : analysis.change < 0 ? "is-negative" : ""}">${escapeHtml(changeLabel)}</strong>
      <span>${analysis.previous ? escapeHtml(analysis.previous.label) : "Need 2 sessions"}</span>
    </article>
    <article class="analysis-card">
      <small>History</small>
      <strong>${sessionCount}</strong>
      <span>${escapeHtml(modeLabel(exercise.mode))} - ${escapeHtml(exercise.muscleGroup)}</span>
    </article>
  `;
}

function getChangeLabel(change, unit) {
  if (!change) return "No change";
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${formatNumber(change)}${unit ? ` ${unit}` : ""}`;
}

function renderProgressCharts(analysis) {
  const charts = [
    renderLineChart(analysis.primaryLabel, analysis.points, analysis.primaryUnit),
  ];
  if (analysis.secondaryPoints.length && analysis.secondaryPoints.some((point) => point.value > 0)) {
    charts.push(renderLineChart(analysis.secondaryLabel, analysis.secondaryPoints, analysis.secondaryUnit));
  }
  return `<section class="chart-grid">${charts.join("")}</section>`;
}

function renderLineChart(title, points, unit) {
  const chartPoints = points.filter((point) => Number.isFinite(point.value));
  const width = 320;
  const height = 150;
  const pad = 20;
  const values = chartPoints.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const coords = chartPoints.map((point, index) => {
    const x = chartPoints.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (chartPoints.length - 1);
    const y = height - pad - ((point.value - min) / range) * (height - pad * 2);
    return { ...point, x, y };
  });
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = coords.at(-1);

  return `
    <article class="chart-card">
      <div class="chart-heading">
        <div>
          <small>${escapeHtml(title)}</small>
          <strong>${escapeHtml(latest ? `${formatNumber(latest.value)}${unit ? ` ${unit}` : ""}` : "-")}</strong>
        </div>
        <span>${chartPoints.length} points</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} chart">
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="chart-axis"></line>
        <polyline points="${polyline}" class="chart-line"></polyline>
        ${coords.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" class="chart-dot"><title>${escapeHtml(`${point.label}: ${point.display}`)}</title></circle>`).join("")}
      </svg>
    </article>
  `;
}

function getNonRepsBestLabel(exercise) {
  if (exercise.mode === TRACKING_TYPES.TIMED_HOLD) {
    const best = [...exercise.sets].sort((a, b) => Number(b.duration) - Number(a.duration))[0];
    return best ? describeTimedSet(best) : "Timed hold";
  }
  if (exercise.mode === TRACKING_TYPES.CARDIO) {
    const best = [...exercise.sets].sort((a, b) => Number(b.duration) - Number(a.duration))[0];
    return best ? describeCardioSet(best) : "Cardio";
  }
  if (exercise.mode === TRACKING_TYPES.CARRY) {
    const best = [...exercise.sets].sort((a, b) => Number(b.distance) - Number(a.distance))[0];
    return best ? describeCarrySet(best) : "Carry";
  }
  if (exercise.mode === TRACKING_TYPES.MOBILITY) {
    const best = [...exercise.sets].sort((a, b) => Number(b.duration) - Number(a.duration))[0];
    return best ? describeMobilitySet(best) : "Mobility";
  }
  return modeLabel(exercise.mode);
}

function renderHistory() {
  renderStats();
  renderCalendar();
  renderProgress();
}

function showSessionDetail(dateValue) {
  const sessions = getActiveSessions()
    .filter((session) => session.date === dateValue)
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!sessions.length) return;
  selectedDetailDate = dateValue;
  detailDate.textContent = toDisplayDate(dateValue);
  detailTitle.textContent = "Training journal";
  detailSessionCount.textContent = `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`;
  detailExercises.replaceChildren();
  const prExerciseKeys = getActivePrExerciseKeys();

  sessions.forEach((session) => {
    const sessionBlock = document.createElement("section");
    sessionBlock.className = "detail-session-block";
    const prCount = session.exercises.filter((exercise) =>
      prExerciseKeys.has(`${session.id}:${exercise.exerciseId}`),
    ).length;
    const exerciseCards = session.exercises
      .map((exercise) => {
        const isPr = prExerciseKeys.has(`${session.id}:${exercise.exerciseId}`);
        const rows = exercise.sets
          .map((set, index) => {
            if (exercise.mode === TRACKING_TYPES.CARDIO) {
              return `<li><span>Set ${index + 1}</span><strong>${escapeHtml(describeCardioSet(set))}</strong></li>`;
            }
            return `<li><span>Set ${index + 1}</span><strong>${escapeHtml(describeSet(set, exercise))}</strong></li>`;
          })
          .join("");
        return `
          <article class="detail-exercise-card">
            <div class="detail-exercise-heading">
              <div>
                <h3>${escapeHtml(exercise.name)}${isPr ? ' <span class="pr-badge">PR</span>' : ""}</h3>
                <p>${escapeHtml(exercise.muscleGroup)} - ${escapeHtml(modeLabel(exercise.mode))}</p>
              </div>
              <span>${exercise.sets.length} ${exercise.sets.length === 1 ? "set" : "sets"}</span>
            </div>
            <ul class="set-detail-list">${rows}</ul>
          </article>
        `;
      })
      .join("");
    sessionBlock.innerHTML = `
      <div class="detail-session-heading">
        <div>
          <h2>${escapeHtml(session.workoutName)}</h2>
          <div class="detail-session-meta">
            <span>${session.exercises.length} exercises</span>
            <span>${getSessionSets(session)} sets</span>
            ${getSessionVolume(session) ? `<span>${formatNumber(getSessionVolume(session))} kg volume</span>` : ""}
            ${prCount ? `<span class="pr-chip">${prCount} PR</span>` : ""}
          </div>
          <p>${session.notes ? escapeHtml(session.notes) : ""}</p>
        </div>
        <div class="detail-session-actions">
          <button class="secondary-action edit-session" type="button" data-id="${session.id}">Edit session</button>
          <button class="secondary-action danger delete-session" type="button" data-id="${session.id}">Delete</button>
        </div>
      </div>
      <div class="detail-exercise-stack">${exerciseCards}</div>
    `;
    detailExercises.append(sessionBlock);
  });

  detailNotes.hidden = true;
  sessionDetail.hidden = false;
  document.body.classList.add("has-detail-open");
}

function describeSet(set, exercise) {
  if (exercise.mode === TRACKING_TYPES.CARDIO) return describeCardioSet(set);
  if (exercise.mode === TRACKING_TYPES.TIMED_HOLD) return describeTimedSet(set);
  if (exercise.mode === TRACKING_TYPES.CARRY) return describeCarrySet(set);
  if (exercise.mode === TRACKING_TYPES.MOBILITY) return describeMobilitySet(set);
  return `${describeRepsSet(set, exercise)}${set.failure ? " - failure" : ""}`;
}

function hideSessionDetail() {
  sessionDetail.hidden = true;
  selectedDetailDate = "";
  document.body.classList.remove("has-detail-open");
}

function deleteSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId && item.userId === state.selectedUserId);
  if (!session) return;
  if (!confirm(`Delete ${session.workoutName} from ${toDisplayDate(session.date)}?`)) return;
  state.sessions = state.sessions.filter((item) => item.id !== sessionId);
  saveState();
  hideSessionDetail();
  renderHistory();
}

function handleDeleteUser() {
  const activeUser = getActiveUser();
  if (!activeUser || state.users.length <= 1) return;
  if (!confirm(`Delete ${activeUser.name} and all of their workout logs?`)) return;

  state.users = state.users.filter((user) => user.id !== activeUser.id);
  state.sessions = state.sessions.filter((session) => session.userId !== activeUser.id);
  state.customExercises = state.customExercises.filter((exercise) => exercise.userId !== activeUser.id);
  state.selectedUserId = state.users[0].id;
  saveState();
  resetForm();
  renderUsers();
  renderAllExercisePickers();
  renderHistory();
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
    if (button.dataset.view === "history") renderHistory();
  });
});

subTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setHistoryView(button.dataset.historyView);
    renderHistory();
  });
});

userSelect.addEventListener("change", () => {
  state.selectedUserId = userSelect.value;
  saveState();
  resetForm();
  renderUsers();
  renderHistory();
});

userForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = newUserNameInput.value.trim();
  if (!name) return;

  const duplicate = state.users.some((user) => user.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    alert("That user already exists.");
    return;
  }

  const user = createUser(name);
  state.users.push(user);
  state.selectedUserId = user.id;
  newUserNameInput.value = "";
  saveState();
  resetForm();
  renderUsers();
  renderHistory();
});

deleteUserButton.addEventListener("click", handleDeleteUser);
exportDataButton.addEventListener("click", exportBackup);
importDataInput.addEventListener("change", () => {
  const file = importDataInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      importBackup(JSON.parse(String(reader.result || "")));
    } catch {
      alert("Could not read that backup file.");
    } finally {
      importDataInput.value = "";
    }
  });
  reader.readAsText(file);
});
resetFormButton.addEventListener("click", resetForm);
addExerciseButton.addEventListener("click", () => addExercise());
prevMonthButton.addEventListener("click", () => {
  calendarMonth = getMonthStart(addMonths(calendarMonth, -1));
  renderCalendar();
});
nextMonthButton.addEventListener("click", () => {
  calendarMonth = getMonthStart(addMonths(calendarMonth, 1));
  renderCalendar();
});
progressExerciseInput.addEventListener("change", renderProgress);
closeDetailButton.addEventListener("click", hideSessionDetail);

calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".calendar-day");
  if (!button || button.disabled) return;
  showSessionDetail(button.dataset.date);
});

detailExercises.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-session");
  const deleteButton = event.target.closest(".delete-session");
  if (editButton) {
    const session = state.sessions.find(
      (item) => item.id === editButton.dataset.id && item.userId === state.selectedUserId,
    );
    if (session) editSession(session);
    return;
  }
  if (deleteButton) deleteSession(deleteButton.dataset.id);
});

exerciseList.addEventListener("input", (event) => {
  const card = event.target.closest(".exercise-card");
  if (card) updateExerciseSummary(card);
});

exerciseList.addEventListener("focusin", (event) => {
  if (event.target.matches('input[type="number"]')) {
    event.target.select();
  }
});

exerciseList.addEventListener("change", (event) => {
  const card = event.target.closest(".exercise-card");
  if (!card) return;

  if (event.target.classList.contains("exercise-picker")) {
    if (event.target.value === "__custom__") {
      card.dataset.exerciseId = "";
      card.dataset.exerciseName = "";
      card.querySelector(".custom-muscle").value = card.querySelector(".exercise-muscle").value;
      card.querySelector(".custom-mode").value = card.querySelector(".exercise-mode").value;
      card.querySelector(".custom-exercise-panel").hidden = false;
      updateExerciseSummary(card);
      return;
    }
    const exercise = findExerciseDefinition(event.target.value);
    if (exercise) applyExerciseDefinition(card, exercise);
  }

  if (event.target.classList.contains("exercise-mode")) {
    card.dataset.mode = event.target.value;
    ensureSetRowsForMode(card, event.target.value);
    updateExerciseSummary(card);
  }

  if (event.target.classList.contains("exercise-muscle")) {
    const muscleGroup = event.target.value;
    const nextMode = defaultModeForMuscle(muscleGroup);
    card.querySelector(".exercise-mode").value = nextMode;
    card.dataset.mode = nextMode;
    card.querySelector(".custom-muscle").value = muscleGroup;
    card.querySelector(".custom-mode").value = nextMode;
    clearSelectedExercise(card);
    renderExercisePicker(card.querySelector(".exercise-picker"), "", muscleGroup);
    card.querySelector(".custom-exercise-panel").hidden = true;
    ensureSetRowsForMode(card, nextMode);
    updateExerciseSummary(card);
  }
});

exerciseList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = button.closest(".exercise-card");

  if (button.classList.contains("exercise-summary-button")) {
    setExerciseExpanded(card, card.classList.contains("is-collapsed"));
    return;
  }

  if (button.classList.contains("set-summary-button")) {
    const setRow = button.closest(".set-row");
    setSetExpanded(setRow, setRow.classList.contains("is-collapsed"));
    return;
  }

  if (button.classList.contains("save-custom-exercise")) {
    const name = card.querySelector(".custom-exercise-name").value.trim();
    const muscleGroup = card.querySelector(".custom-muscle").value;
    const mode = card.querySelector(".custom-mode").value;
    if (!name || !muscleGroup || !mode) {
      alert("New exercises need a name, muscle/type, and mode.");
      return;
    }
    const duplicate = getExerciseLibrary().find(
      (exercise) => exercise.name.toLowerCase() === name.toLowerCase() && exercise.mode === mode,
    );
    const exercise =
      duplicate ||
      {
        id: `custom:${state.selectedUserId}:${slug(name)}:${mode}:${Date.now()}`,
        userId: state.selectedUserId,
        name,
        muscleGroup,
        mode,
        createdAt: Date.now(),
      };
    if (!duplicate) state.customExercises.push(exercise);
    saveState();
    renderAllExercisePickers();
    renderExercisePicker(card.querySelector(".exercise-picker"), exercise.id, exercise.muscleGroup);
    applyExerciseDefinition(card, exercise);
    renderProgress();
    return;
  }

  if (button.classList.contains("add-set")) {
    collapseSetRows(card);
    addSet(card);
    return;
  }

  if (button.classList.contains("add-drop-set")) {
    addDropSetRow(button.closest(".set-row"));
    updateExerciseSummary(card);
    return;
  }

  if (button.classList.contains("collapse-exercise")) {
    setExerciseExpanded(card, false);
    return;
  }

  if (button.classList.contains("remove-drop-set")) {
    button.closest(".drop-set-row").remove();
    updateExerciseSummary(card);
    return;
  }

  if (button.classList.contains("remove-set")) {
    const setRows = card.querySelectorAll(".set-row");
    if (setRows.length > 1) {
      button.closest(".set-row").remove();
      updateSetRemoveButtons(card);
      updateExerciseSummary(card);
    }
    return;
  }

  if (button.classList.contains("remove-exercise") && exerciseList.children.length > 1) {
    card.remove();
    updateExerciseCount();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = getFormPayload();
  const validationMessage = validatePayload(payload);
  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  if (editingId.value) {
    state.sessions = state.sessions.map((session) =>
      session.id === editingId.value
        ? { ...session, ...payload, updatedAt: Date.now() }
        : session,
    );
  } else {
    state.sessions = [
      {
        id: createId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...payload,
      },
      ...state.sessions,
    ];
  }

  saveState();
  calendarMonth = getMonthStart(payload.date);
  resetForm();
  renderHistory();
  setActiveView("history");
  setHistoryView("sessions");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

saveState();
renderUsers();
resetForm();
renderHistory();
