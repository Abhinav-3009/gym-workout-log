# Gym Workout Log

Offline-first gym workout log for phone use. The app stores data locally on the device and supports multiple simple users through the collapsible selector at the top.

## Features

- Log daily workout sessions with multiple exercises and sets.
- Track exercises with purpose-built tracking types: weighted reps, bodyweight reps, timed holds, cardio, carries, and mobility.
- Track reps, weight or added weight, failure sets, hold duration, cardio distance, carry distance, intensity, notes, and muscle/type.
- Use the built-in exercise library or add custom exercises for the selected user.
- Keep logs separate per selected user.
- Review saved sessions in a Monday-first calendar with highlighted workout days.
- Open a full-screen workout detail view for a selected date.
- Track exercise progress with one summarized row per session.

## Run Locally

```sh
python3 -m http.server 5173
```

Open `http://localhost:5173` on the Mac.

## Install On Android

Android Chrome can install this as a PWA only from a secure origin. The practical path is:

1. Deploy this folder to an HTTPS static host such as GitHub Pages, Netlify, or Cloudflare Pages.
2. Open the deployed HTTPS URL in Chrome on Android.
3. Use Chrome menu > Add to Home screen.

After the first load, the app works offline. Logs remain local to the phone/browser storage.

## Data

- Default users: `Abhinav`, `Ankur`
- Storage key: `gym-workout-log:v2`
- Legacy data from `gym-workout-log:v1` is migrated into `Abhinav` on first launch.
