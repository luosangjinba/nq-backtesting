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
