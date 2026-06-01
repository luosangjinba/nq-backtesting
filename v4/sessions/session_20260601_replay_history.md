# 2026-06-01 Replay History / 使用修复

## Step 169: Replay History Data Model

Goal:

- Add a small persistence layer for user-triggered Replay workspace restore.
- Do not auto-restore on app startup.
- Do not store K-line arrays in localStorage.

Implemented:

- Added `v4/src/ui/replay-history-store.js`.
- Added localStorage key `v4.replayHistory`.
- Replay history entries include:
  - `primary`: main chart instrument, timeframe, loaded `start/end`, optional 1m `outerRange`.
  - `replay`: enabled flag, cursor timestamp, cursor index, speed index.
  - `split`: enabled flag, secondary instrument, secondary timeframe, layout.
  - `label`, `createdAt`, `updatedAt`, `id`, and a dedupe `key`.
- Added normalization helpers for persisted input.
- Added `saveReplayHistoryItem()`, `getReplayHistory()`, `deleteReplayHistoryItem()`, `clearReplayHistory()`.
- History is deduped by workspace shape and cursor timestamp.
- History is capped at 10 items.
- In non-browser module tests, the store falls back to in-memory storage.

Main files:

- `v4/src/ui/replay-history-store.js`
- `v4/TODO.md`
- `v4/sessions/session_20260601_replay_history.md`

Validation:

- `node --check v4/src/ui/replay-history-store.js`
- Module smoke covered:
  - localStorage key and 10-item limit exports.
  - save/list.
  - dedupe update by replay workspace key.
  - capped retention after more than 10 saves.
  - delete single item.
  - clear all items.

Next:

- Step 170 should wire checkpoint saving from Replay cursor and workspace state changes.

## Step 170: Auto-save Replay Checkpoints

Goal:

- Persist valid Replay workspace checkpoints as the user moves through Replay.
- Do not auto-restore on app startup.
- Do not delete history when Replay is turned off.

Implemented:

- Added `v4/src/ui/replay-history-persistence.js`.
- `replay:changed` now carries `speedIndex` in addition to cursor state.
- Replay History persistence listens to:
  - `replay:changed`
  - `bars:loaded`
  - `secondary-chart:settings-changed`
- Valid checkpoints are saved only when Replay is enabled and has a finite `cursorTimestamp`.
- Saves are debounced by 800ms so active playback does not write every bar.
- `beforeunload` flushes the pending checkpoint.
- Checkpoints capture:
  - main chart timeframe and loaded window
  - 1m `outerRange` when present
  - replay cursor timestamp/index/speed
  - split enabled/instrument/timeframe/layout
- Main chart instrument is currently saved as `NQ` because the primary chart does not yet have an instrument selector/store.

Main files:

- `v4/src/ui/replay-history-persistence.js`
- `v4/src/ui/replay-controls.js`
- `v4/src/app.js`
- `v4/TODO.md`

Validation:

- `node --check` passed for touched JS files.
- Checkpoint creation smoke confirmed current main window, 1m `outerRange`, replay cursor/speed, and split state are captured.
- Invalid replay state smoke confirmed disabled/null-cursor replay does not create a checkpoint.
- Event-path smoke confirmed `initReplayHistoryPersistence()` saves a history entry from `replay:changed`.

Next:

- Step 171 should add the Replay History UI in the Replay control bar.

## Step 171: Replay History UI

Goal:

- Add a visible Replay History entry point without implementing restore yet.

Implemented:

- Replay control bar now has a `History` button.
- The History button opens a compact panel above the replay controls.
- The panel lists recent replay checkpoints from `v4.replayHistory`.
- Each row shows:
  - checkpoint label
  - main loaded window date range
  - split state (`Split Off` or secondary instrument/timeframe/layout)
- `Delete` removes a single checkpoint.
- `Clear` removes all checkpoints.
- `Load` is shown but disabled until Step 172 implements workspace restore.

Main files:

- `v4/src/ui/replay-controls.js`
- `v4/style.css`
- `v4/TODO.md`

Validation:

- `node --check v4/src/ui/replay-controls.js`
- Store action smoke covered list/delete/clear backing behavior used by the UI.
- Full `v4/src/**/*.js` syntax check passed.
- `git diff --check` passed.
- Web `8001/index.html` returned `200 OK`.
- API health returned OK.

Next:

- Step 172 should implement the `Load` action to restore the saved workspace.

## Step 172: Manual Replay Workspace Restore

Goal:

- Make Replay History `Load` restore the saved workspace on demand.
- Keep startup behavior unchanged: no automatic restore.

Implemented:

- Replay History rows now have an enabled `Load` action.
- `Load` fetches the saved main chart window and calls `store.setBars()`.
- Saved 1m `outerRange` is passed back into the main bar store.
- If the saved cursor timestamp is outside the saved loaded window but inside `outerRange`, restore first resolves and loads a 45-day window around the cursor timestamp.
- Toolbar hidden start/end inputs and timeframe selector are synchronized to the restored main chart window.
- Split state is restored:
  - enabled/disabled
  - secondary instrument
  - secondary timeframe
  - layout
- Replay is restored by `cursorTimestamp` and left paused.
- Added exported `restoreReplayToTimestamp()` for timestamp-based replay positioning after data loads.

Main files:

- `v4/src/ui/replay-controls.js`
- `v4/TODO.md`
- `v4/sessions/session_20260601_replay_history.md`

Validation:

- `node --check v4/src/ui/replay-controls.js`
- Full `v4/src/**/*.js` syntax check passed.
- `git diff --check` passed.
- Web `8001/index.html` returned `200 OK`.
- API health returned OK.
- Module smoke confirmed a cursor inside a 1m outer range can resolve to a target 45-day restore window.

Next:

- Step 173 should validate the full browser workflow including refresh, history panel load, split restore, and 1m outerRange restore.

## Step 173: Replay History Validation and Closeout

Goal:

- Validate the end-to-end Replay History workflow in the browser.
- Close the milestone before moving into real usage and issue discovery.

Implemented:

- Added a browser-level smoke script for local validation of History `Load`.
- Fixed a toolbar sync gap found by the smoke test:
  - Programmatic Split restore updated `secondary-chart-store`.
  - The toolbar select values were synchronized, but the `Split` checkbox itself was not written back.
  - `syncSplitScreenLayout()` now also updates `splitScreenToggle.checked`.
  - Toolbar now listens to `secondary-chart:settings-changed`, so programmatic restore and manual UI changes share the same layout/control sync path.

Validated browser workflow:

- Seeded `localStorage.v4.replayHistory` with a saved replay checkpoint.
- Opened the Replay `History` panel.
- Loaded the saved checkpoint.
- Confirmed restored main chart state:
  - start `2024-01-01 00:00`
  - end `2024-02-15 00:00`
  - timeframe `1`
  - replay position `2024-01-02 09:57`
- Confirmed restored Split state:
  - enabled
  - instrument `NQ`
  - timeframe `60`
  - layout `side`
- Confirmed the History panel closes after load.

Validation:

- `node tmp/replay_history_restore_smoke.js`
- Full `v4/src/**/*.js` syntax check passed.
- `git diff --check` passed.
- Web `8001/index.html` returned `200 OK`.
- API health returned OK.

Status:

- Replay History milestone is closed.
- Startup still does not auto-restore.
- Recovery is manual through Replay `History` -> `Load`.
- Next work should come from actual usage and bug discovery.
