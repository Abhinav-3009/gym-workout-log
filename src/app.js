const STORAGE_KEY = "gym-workout-log:v2";
const LEGACY_STORAGE_KEY = "gym-workout-log:v1";
const SELECTED_USER_KEY = "gym-workout-log:selected-user";
const DEFAULT_USERS = ["Abhinav", "Ankur"];
const MUSCLE_GROUPS = [
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
const BUILT_IN_EXERCISES = [
  ["bench-press", "Bench press", "Chest", "strength"],
  ["incline-dumbbell-press", "Incline dumbbell press", "Chest", "strength"],
  ["chest-fly", "Chest fly", "Chest", "strength"],
  ["lat-pulldown", "Lat pulldown", "Back", "strength"],
  ["barbell-row", "Barbell row", "Back", "strength"],
  ["seated-cable-row", "Seated cable row", "Back", "strength"],
  ["overhead-press", "Overhead press", "Shoulders", "strength"],
  ["lateral-raise", "Lateral raise", "Shoulders", "strength"],
  ["rear-delt-fly", "Rear delt fly", "Shoulders", "strength"],
  ["barbell-curl", "Barbell curl", "Biceps", "strength"],
  ["dumbbell-curl", "Dumbbell curl", "Biceps", "strength"],
  ["hammer-curl", "Hammer curl", "Biceps", "strength"],
  ["triceps-pushdown", "Triceps pushdown", "Triceps", "strength"],
  ["skull-crusher", "Skull crusher", "Triceps", "strength"],
  ["overhead-triceps-extension", "Overhead triceps extension", "Triceps", "strength"],
  ["squat", "Squat", "Legs", "strength"],
  ["leg-press", "Leg press", "Legs", "strength"],
  ["leg-curl", "Leg curl", "Legs", "strength"],
  ["leg-extension", "Leg extension", "Legs", "strength"],
  ["deadlift", "Deadlift", "Legs", "strength"],
  ["plank", "Plank", "Core", "bodyweight"],
  ["crunches", "Crunches", "Core", "bodyweight"],
  ["push-ups", "Push-ups", "Bodyweight", "bodyweight"],
  ["pull-ups", "Pull-ups", "Bodyweight", "bodyweight"],
  ["dips", "Dips", "Bodyweight", "bodyweight"],
  ["treadmill", "Treadmill", "Cardio", "cardio"],
  ["cycling", "Cycling", "Cardio", "cardio"],
  ["elliptical", "Elliptical", "Cardio", "cardio"],
  ["rowing-machine", "Rowing machine", "Cardio", "cardio"],
].map(([id, name, muscleGroup, mode]) => ({ id: `builtin:${id}`, name, muscleGroup, mode }));

const activeUserName = document.querySelector("#activeUserName");
const userSelect = document.querySelector("#userSelect");
const userForm = document.querySelector("#userForm");
const newUserNameInput = document.querySelector("#newUserName");
const deleteUserButton = document.querySelector("#deleteUser");
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
const detailMetrics = document.querySelector("#detailMetrics");
const detailExercises = document.querySelector("#detailExercises");
const detailNotes = document.querySelector("#detailNotes");
const exerciseTemplate = document.querySelector("#exerciseTemplate");
const strengthSetTemplate = document.querySelector("#strengthSetTemplate");
const cardioSetTemplate = document.querySelector("#cardioSetTemplate");

let state = loadState();
let calendarMonth = getMonthStart(getTodayValue());
let selectedDetailDate = "";

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
      customExercises: Array.isArray(stored.customExercises) ? stored.customExercises : [],
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
      const mode = exercise.mode || (exercise.muscleGroup === "Cardio" ? "cardio" : "strength");
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

function normalizeSets(sets, mode) {
  if (mode === "cardio") {
    return sets.map((set) => ({
      duration: Number(set.duration) || 0,
      distance: Number(set.distance) || 0,
      intensity: set.intensity || "",
    }));
  }

  return sets.map((set) => ({
    reps: Number(set.reps) || 1,
    weight: Number(set.weight) || 0,
    failure: Boolean(set.failure),
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
          mode: "strength",
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
          mode: exercise.mode || "strength",
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

function toDisplayDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getTodayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMonthStart(dateValue) {
  return `${dateValue.slice(0, 7)}-01`;
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

function addMonths(dateValue, months) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);
  return toDateValue(date);
}

function getMondayIndex(dateValue) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return (day + 6) % 7;
}

function getSetVolume(set) {
  return Number(set.reps || 0) * Number(set.weight || 0);
}

function getExerciseVolume(exercise) {
  if (exercise.mode === "cardio") return 0;
  return exercise.sets.reduce((sum, set) => sum + getSetVolume(set), 0);
}

function getSessionVolume(session) {
  return session.exercises.reduce((sum, exercise) => sum + getExerciseVolume(exercise), 0);
}

function getSessionSets(session) {
  return session.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
}

function getFailureSetCount(session) {
  return session.exercises.reduce((count, exercise) => {
    if (exercise.mode === "cardio") return count;
    return count + exercise.sets.filter((set) => set.failure).length;
  }, 0);
}

function describeStrengthSet(set, exercise) {
  const weightLabel = exercise.mode === "bodyweight" ? "added" : "kg";
  return `${formatNumber(set.weight || 0)}${weightLabel === "kg" ? "kg" : "kg added"} x ${set.reps}`;
}

function describeCardioSet(set) {
  const parts = [`${formatNumber(set.duration || 0)} min`];
  if (set.distance) parts.push(`${formatNumber(set.distance)} km`);
  if (set.intensity) parts.push(set.intensity);
  return parts.join(" / ");
}

function summarizeExercise(exercise) {
  if (exercise.mode === "cardio") {
    return exercise.sets.map(describeCardioSet).join(", ");
  }
  return exercise.sets.map((set) => describeStrengthSet(set, exercise)).join(", ");
}

function getBestSet(exercise) {
  if (exercise.mode === "cardio") return null;
  return [...exercise.sets].sort((a, b) => {
    if (Number(b.weight) !== Number(a.weight)) return Number(b.weight) - Number(a.weight);
    return Number(b.reps) - Number(a.reps);
  })[0];
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
  const mode = card.dataset.mode || card.querySelector(".exercise-mode").value || "strength";
  const muscle = card.querySelector(".exercise-muscle").value || "Other";
  const sets = getExerciseDataFromCard(card).sets;
  const title = card.querySelector(".summary-title");
  const meta = card.querySelector(".summary-meta");
  title.textContent = name;
  meta.textContent = `${muscle} - ${modeLabel(mode)} - ${sets.length} ${sets.length === 1 ? "set" : "sets"}${sets.length ? ` - ${summarizeExercise({ mode, sets })}` : ""}`;
}

function modeLabel(mode) {
  if (mode === "bodyweight") return "Bodyweight";
  if (mode === "cardio") return "Cardio";
  return "Strength";
}

function defaultModeForMuscle(muscleGroup) {
  if (muscleGroup === "Cardio") return "cardio";
  if (muscleGroup === "Bodyweight" || muscleGroup === "Core") return "bodyweight";
  return "strength";
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

function addSet(card, data = {}) {
  const mode = card.dataset.mode || card.querySelector(".exercise-mode").value || "strength";
  const template = mode === "cardio" ? cardioSetTemplate : strengthSetTemplate;
  const node = template.content.firstElementChild.cloneNode(true);
  if (mode === "cardio") {
    node.querySelector(".cardio-duration").value = data.duration ?? "";
    node.querySelector(".cardio-distance").value = data.distance ?? "";
    node.querySelector(".cardio-intensity").value = data.intensity ?? "";
  } else {
    node.querySelector(".weight-label").textContent = mode === "bodyweight" ? "Added weight" : "Weight";
    node.querySelector(".set-reps").value = data.reps ?? 10;
    node.querySelector(".set-weight").value = data.weight ?? 0;
    node.querySelector(".set-failure").checked = Boolean(data.failure);
  }
  card.querySelector(".set-list").append(node);
  updateSetRemoveButtons(card);
  updateExerciseSummary(card);
}

function ensureSetRowsForMode(card, mode) {
  const existingMode = card.querySelector(".set-row")?.classList.contains("cardio-set-row")
    ? "cardio"
    : "strength";
  if (card.querySelector(".set-row") && (mode === "cardio") === (existingMode === "cardio")) {
    card.querySelectorAll(".weight-label").forEach((label) => {
      label.textContent = mode === "bodyweight" ? "Added weight" : "Weight";
    });
    return;
  }
  card.querySelector(".set-list").replaceChildren();
  addSet(card);
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
    mode: data.mode || "strength",
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

  const sets = data.sets?.length ? data.sets : [fallbackDef.mode === "cardio" ? {} : { reps: 10, weight: 0, failure: false }];
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
  submitButton.textContent = "Save session";
}

function getExerciseDataFromCard(card) {
  const mode = card.dataset.mode || card.querySelector(".exercise-mode").value;
  return {
    id: card.dataset.id || createId(),
    exerciseId: card.dataset.exerciseId || "",
    name: card.dataset.exerciseName || "",
    muscleGroup: card.querySelector(".exercise-muscle").value,
    mode,
    sets: [...card.querySelectorAll(".set-row")].map((setRow) => {
      if (mode === "cardio") {
        return {
          duration: Number(setRow.querySelector(".cardio-duration").value || 0),
          distance: Number(setRow.querySelector(".cardio-distance").value || 0),
          intensity: setRow.querySelector(".cardio-intensity").value.trim(),
        };
      }

      return {
        reps: Number(setRow.querySelector(".set-reps").value),
        weight: Number(setRow.querySelector(".set-weight").value || 0),
        failure: setRow.querySelector(".set-failure").checked,
      };
    }),
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
  if (payload.exercises.some((exercise) => exercise.mode !== "cardio" && exercise.sets.some((set) => !set.reps))) {
    return "Each strength/bodyweight set needs reps.";
  }
  if (payload.exercises.some((exercise) => exercise.mode === "cardio" && exercise.sets.some((set) => !set.duration))) {
    return "Each cardio set needs duration.";
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
  submitButton.textContent = "Update session";
  hideSessionDetail();
  setActiveView("log");
  workoutNameInput.focus();
}

function createMetric(label) {
  const metric = document.createElement("span");
  metric.textContent = label;
  return metric;
}

function renderStats() {
  const sessions = getActiveSessions();
  const volume = sessions.reduce((sum, session) => sum + getSessionVolume(session), 0);
  const latest = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  totalLogs.textContent = sessions.length;
  totalVolume.textContent = formatNumber(volume);
  recentDate.textContent = latest ? toDisplayDate(latest.date) : "-";
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
    button.innerHTML = `<span>${Number(dateValue.slice(8, 10))}</span>${sessions.length ? `<small>${sessions.length} workout${sessions.length === 1 ? "" : "s"}</small>` : ""}`;
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
  progressSummary.replaceChildren(
    createMetric(`${rows.length} sessions`),
    createMetric(modeLabel(mode)),
    createMetric(latest.muscleGroup),
  );

  rows.forEach(({ session, exercise }) => {
    const card = document.createElement("article");
    card.className = "progress-card";
    const bestSet = getBestSet(exercise);
    const failureCount = exercise.mode === "cardio" ? 0 : exercise.sets.filter((set) => set.failure).length;
    const compactSets = summarizeExercise(exercise);

    card.innerHTML = `
      <div>
        <p class="log-date">${escapeHtml(toDisplayDate(session.date))}</p>
        <h3>${escapeHtml(session.workoutName)}</h3>
      </div>
      <div class="progress-grid">
        <div><small>Best</small><strong>${escapeHtml(bestSet ? describeStrengthSet(bestSet, exercise) : "Cardio")}</strong></div>
        <div><small>Sets</small><strong>${escapeHtml(compactSets)}</strong></div>
        <div><small>Volume</small><strong>${exercise.mode === "cardio" ? "-" : `${formatNumber(getExerciseVolume(exercise))} kg`}</strong></div>
        <div><small>Failure</small><strong>${exercise.mode === "cardio" ? "-" : failureCount}</strong></div>
      </div>
    `;
    progressList.append(card);
  });
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
  detailTitle.textContent = "Workout details";
  detailSessionCount.textContent = `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`;
  detailMetrics.replaceChildren(
    createMetric(`${sessions.reduce((sum, session) => sum + session.exercises.length, 0)} exercises`),
    createMetric(`${sessions.reduce((sum, session) => sum + getSessionSets(session), 0)} sets`),
    createMetric(`${formatNumber(sessions.reduce((sum, session) => sum + getSessionVolume(session), 0))} kg volume`),
    createMetric(`${sessions.reduce((sum, session) => sum + getFailureSetCount(session), 0)} failure`),
  );
  detailExercises.replaceChildren();

  sessions.forEach((session) => {
    const sessionBlock = document.createElement("section");
    sessionBlock.className = "detail-session-block";
    const exerciseCards = session.exercises
      .map((exercise) => {
        const rows = exercise.sets
          .map((set, index) => {
            if (exercise.mode === "cardio") {
              return `<li><span>Set ${index + 1}</span><strong>${escapeHtml(describeCardioSet(set))}</strong></li>`;
            }
            return `<li><span>Set ${index + 1}</span><strong>${escapeHtml(describeStrengthSet(set, exercise))}${set.failure ? " - failure" : ""}</strong></li>`;
          })
          .join("");
        return `
          <article class="detail-exercise-card">
            <div class="detail-exercise-heading">
              <div>
                <h3>${escapeHtml(exercise.name)}</h3>
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
    addSet(card);
    return;
  }

  if (button.classList.contains("collapse-exercise")) {
    setExerciseExpanded(card, false);
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
