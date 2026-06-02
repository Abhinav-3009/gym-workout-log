# Gym Workout Log

Gym Workout Log is an offline-first workout tracking app designed for quick phone use in the gym. It runs as a static Progressive Web App, so it can be hosted on GitHub Pages and installed on Android from Chrome without a backend.

The app is currently built for simple personal use: choose a user, log a workout, review sessions by date, and track exercise progress over time.

## Current Features

- Multi-user support through a simple dropdown.
- Add/delete simple local users.
- Log daily workouts with multiple exercises and sets.
- Built-in exercise library grouped by muscle/type.
- Add custom exercises for the selected user.
- Tracking types:
  - Weighted reps
  - Bodyweight reps
  - Timed holds
  - Cardio
  - Carry / distance
  - Mobility
- Failure set checkbox where relevant.
- Drop set checkbox for reps-based sets.
- Notes per workout.
- Monday-first calendar for workout history with compact workout-day markers.
- Weekly consistency streaks in workout history.
- Full-screen Training Journal detail view for selected dates.
- Progress view with:
  - summary cards
  - simple charts
  - expandable session rows
  - PR badges
- Dark performance theme.
- Offline support through a service worker.
- JSON export/import backup from the collapsible user panel.

## How The App Works Today

This app is fully static:

- No backend.
- No login.
- No cloud sync.
- No database server.
- No package manager or build step.

Data is stored in the browser/PWA local storage on the device where the app is used.

This means:

- Closing the tab or app does not delete data.
- Restarting Chrome or the phone does not normally delete data.
- Clearing Chrome site data can delete data.
- Opening the same hosted URL on another phone starts with separate empty data.
- Use `Export backup` regularly if the data matters.

## Install On Android

Android Chrome can install this app as a PWA only from a secure origin, so use an HTTPS static host.

Recommended path:

1. Deploy this repository to GitHub Pages.
2. Open the GitHub Pages HTTPS URL in Chrome on Android.
3. Open Chrome menu.
4. Tap `Add to Home screen` or `Install app`.
5. Open it from the Android home screen.

After the first load, the app should work offline.

## Deploy With GitHub Pages

This repo includes a GitHub Actions workflow:

```text
.github/workflows/pages.yml
```

To deploy:

```sh
git push
```

The workflow runs on pushes to `main` and publishes the static app to GitHub Pages.

If Pages is not enabled yet:

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Go to `Pages`.
4. Select `GitHub Actions` as the source.
5. Re-run the workflow if needed.

## Run Locally

From the project folder:

```sh
python3 -m http.server 5173
```

Open:

```text
http://localhost:5173
```

Service workers require HTTP/HTTPS, so avoid opening `index.html` directly from the filesystem for PWA testing.

## Data And Backup

Current storage keys:

- Current data: `gym-workout-log:v2`
- Legacy data: `gym-workout-log:v1`

Legacy `v1` logs are migrated into the default user `Abhinav` on first launch.

Backup behavior:

- `Export backup` downloads the full local app state as JSON.
- `Import backup` replaces current local data after confirmation.
- Import does not merge data yet.
- Backup files contain personal workout data, so treat them as private.

## Project Structure

```text
.
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── assets/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── app.js
│   ├── constants.js
│   ├── utils.js
│   ├── workout.js
│   └── styles.css
├── AI_CONTEXT.md
└── .github/workflows/pages.yml
```

Code roles:

- `src/app.js`: DOM wiring, rendering, state mutation, app flow.
- `src/constants.js`: storage keys, built-in exercises, muscle groups, tracking types.
- `src/utils.js`: date, ID, formatting, and escaping helpers.
- `src/workout.js`: workout calculations, tracking type normalization, set summaries.
- `src/styles.css`: visual design and responsive layout.
- `AI_CONTEXT.md`: handoff notes for future AI/chat sessions.

## Contributing

Contributions are welcome, especially around usability, data safety, and mobile ergonomics.

Suggested workflow:

1. Fork or clone the repository.
2. Create a feature branch:

```sh
git checkout -b feature/my-change
```

3. Run locally:

```sh
python3 -m http.server 5173
```

4. Make your changes.
5. Run checks:

```sh
node --check src/app.js
node --check src/constants.js
node --check src/utils.js
node --check src/workout.js
node --check service-worker.js
python3 -m json.tool manifest.webmanifest >/dev/null
```

6. Smoke test in browser.
7. Commit with a clear message.
8. Open a pull request.

Important contribution notes:

- Keep the app dependency-free unless there is a strong reason.
- Keep it mobile-first.
- Preserve offline behavior.
- Bump `CACHE_NAME` in `service-worker.js` when app files change.
- Do not introduce cloud sync or auth without a clear design discussion.

## Future Plan

The app can stay as a PWA for a long time, but the long-term direction is to make it strong enough to package as a Play Store app.

Planned improvements:

- Better backup flow:
  - import preview
  - merge import
  - backup reminders
- Exercise library management:
  - edit custom exercises
  - delete custom exercises
  - fix accidental duplicates
- Faster logging:
  - repeat previous workout
  - copy previous set
  - duplicate set
- Better progress insights:
  - clearer PR history
  - plain-English trend summaries
  - better comparison for same weight over time
- More app structure:
  - split `app.js` further into view-specific modules
  - add state-specific module
  - add lightweight tests for data migration/calculations
- Optional Play Store packaging:
  - Capacitor wrapper, or
  - Trusted Web Activity / Bubblewrap

Before Play Store upload, the app should have:

- Reliable backup/export/import.
- Clear privacy/data explanation.
- Better error handling.
- App icons/screenshots.
- A stable versioning/release process.

## Privacy

Workout data stays on the device/browser where the app is used. The current app does not send workout data to any server.

If hosted on GitHub Pages or another static host, that host serves the app files only. It does not receive or store the workout logs.

## Current Limitations

- No cloud sync.
- No account login.
- Import replaces data instead of merging.
- Custom exercises can be added but not managed through a dedicated library screen yet.
- No Play Store package yet.
