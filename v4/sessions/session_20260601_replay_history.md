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
