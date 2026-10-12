# Шүдхэн — React doctor dashboard

Separate Mongolian React admin for the Flutter child app. This is a local demo without authentication or cross-device synchronization.

## Build and preview

Requires Node.js and npm.

```sh
npm ci
npm test
npm run dev
```

Open http://127.0.0.1:5173/admin/ for the standalone dashboard.

```sh
npm run build
```

The production files are in `dist/`. Serve those files at `/admin/` on your host (the Vite base path). To share local data with the Flutter app, serve the Flutter web build at `/` and this dashboard at `/admin/` on the same origin. The Flutter app is maintained separately and is not included in this repository.

Both must use the same browser profile and origin. React reads the existing Flutter SharedPreferences localStorage keys (`flutter.doctorClients`, `flutter.careEvents`), including JSON-string event encoding. Doctor-issued IDs become available when a child submits login; the Flutter preferences cache is refreshed first. Data is not sent to a server. A separate port has separate storage. Do not deploy this as a protected clinical system.

## Calendar and charts

Four section averages, daily active minutes, completed sessions, floss records, selected child and month, daily details, and rule-based doctor observations. Red days have recorded sections below 30 seconds, a session missing confirmations, or an anomalous measurement above 180 seconds. Today's incomplete sessions may still be in progress. Cross-midnight sessions are checked across their full record. Green means recorded app targets met, not proven cleaning quality. Gray means no brushing records; future days are inactive. Motion/manual data cannot establish dental cleanliness or diagnose risk.

`npm test` covers calendar classification, midnight sessions, duplicates, storage interoperability, corruption handling and ID creation.

## Children and rewards

Register children with name, age, registration number and phone number; the dashboard generates a six-digit login ID. Configure seven- or thirty-day streak gifts, view earned stars, and redeem stars for a named clinic reward with a saved history and balance checks.

Profiles, gifts and redemptions use `shudkhen.childProfiles`, `shudkhen.gifts` and `shudkhen.redemptions` in localStorage. No patient records are included in this repository. The standalone dashboard starts empty. The Android offline app does not synchronize with this browser demo.
