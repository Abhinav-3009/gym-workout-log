# AI Context: Gym Workout Log

## Project Summary

This is a dependency-free static PWA for logging gym workouts on Android via browser install. It is currently hosted/deployed through GitHub Pages using `.github/workflows/pages.yml`. The app stores all data locally in the phone/browser `localStorage`; there is no backend, auth, or sync.

Current user-facing capabilities:
- Multi-user dropdown with simple create/delete users.
- Daily workout logging with multiple exercises and sets.
- Exercise library grouped by muscle/type, plus user-scoped custom exercises.
- Tracking types: weighted reps, bodyweight reps, timed hold, cardio, carry/distance, mobility.
- History view with Monday-first calendar and full-screen Training Journal detail.
- Progress view with exercise-specific summary cards, simple inline SVG charts, expandable rows, and PR badges.
- Dark performance theme: charcoal surfaces, lime progress/active color, orange PR/energy color.

## Current Architecture

The app is intentionally static and has no package manager/build step.

Important files:
- `index.html`: all DOM structure and templates.
- `src/app.js`: app bootstrap, DOM wiring, state mutation, and view rendering.
- `src/constants.js`: storage keys, muscle groups, tracking types, and built-in exercises.
- `src/utils.js`: ID, date, number formatting, and HTML escaping helpers.
- `src/workout.js`: tracking-type normalization, calculations, set descriptions, and workout display helpers.
- `src/styles.css`: all styling and responsive behavior.
- `manifest.webmanifest`: PWA metadata.
- `service-worker.js`: offline cache. Cache version must be bumped after app-file changes.
- `.github/workflows/pages.yml`: GitHub Pages static deploy workflow.

Current problem:
- `src/app.js` is still the largest file because views and event wiring remain there.
- Pure constants, utilities, and workout/domain helpers have been extracted.
- A future refactor can still split `log-view`, `history-view`, `progress-view`, `users`, and `state`.

## Data Model Notes

Storage key:
- `gym-workout-log:v2`

Legacy key:
- `gym-workout-log:v1`, migrated into `Abhinav` on first launch.

Current stored shape is conceptually:
```js
{
  users: [{ id, name, createdAt }],
  selectedUserId: string,
  customExercises: [{ id, userId, name, muscleGroup, mode, createdAt }],
  sessions: [
    {
      id,
      userId,
      date,
      workoutName,
      notes,
      exercises: [
        {
          id,
          exerciseId,
          name,
          muscleGroup,
          mode,
          sets: [...]
        }
      ],
      createdAt,
      updatedAt
    }
  ]
}
```

Tracking type values currently stored in `exercise.mode`:
- `weighted-reps`
- `bodyweight-reps`
- `timed-hold`
- `cardio`
- `carry`
- `mobility`

Compatibility:
- Old `strength` normalizes to `weighted-reps`.
- Old `bodyweight` normalizes to `bodyweight-reps`.

## UX Decisions Already Made

- Do not add recent/favorite exercises for now; user rejected that idea.
- Muscle/type is selected before exercise; exercise dropdown is filtered by muscle/type.
- PR means Personal Record and is computed per selected exercise/progress metric over time.
- Training Journal detail should not show duplicate top global chips. Each workout block should have its own summary chips.
- Numeric inputs should select their current value on focus, so typing replaces defaults.
- App is local-only; JSON backup export/import exists for safety.

## Implemented Refactor And Backup

Current module split:

```text
src/
  app.js              // bootstrap, views, events, state mutation
  constants.js        // storage keys, built-ins, tracking constants
  utils.js            // dates, ids, numbers, escaping
  workout.js          // calculations, formatting, tracking helpers
  styles.css
```

The app now uses native ES modules. `index.html` loads `src/app.js` with `type="module"`.

Backup/import is implemented in the collapsible user panel:
- `Export backup` downloads a JSON file with metadata and full app state.
- `Import backup` accepts `.json`, validates basic shape, confirms replacement, then saves to localStorage and re-renders.
- Import replaces current device data. It does not merge.
- Backup remains local-only; no cloud.

Future possible backup improvements:
- Add merge import mode.
- Show import summary before replacement.
- Add automatic reminder to export periodically.

## Verification Checklist

After changes:
- `node --check` all JS module files.
- `python3 -m json.tool manifest.webmanifest >/dev/null`.
- Run local server:
  ```sh
  python3 -m http.server 5173
  ```
- Smoke check:
  ```sh
  curl -fsS http://localhost:5173/ >/dev/null
  curl -fsS http://localhost:5173/src/app.js >/dev/null
  curl -fsS http://localhost:5173/service-worker.js >/dev/null
  ```
- Manually verify in browser:
  - app loads with modules
  - create/edit/delete workout
  - user switch
  - calendar detail
  - progress view
  - export JSON
  - import JSON

## Deployment Notes

Deploy with:
```sh
git push
```

GitHub Actions deploys to GitHub Pages automatically on `main`.

Installed PWA updates through service worker. Always bump `CACHE_NAME` in `service-worker.js` after app file changes so phone installs pull the new version.
