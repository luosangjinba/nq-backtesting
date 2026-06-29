# Step 364 - V5 Replay Navigation

## Goal

Implement controlled replay progression after initial loading is stable.

## Completed

### Step 364.1 - Next Reveals One Bar

- Added `replay.next`.
- `Next` loads a bounded forward window through bar data runtime.
- It reveals only the first active-timeframe bar after the current cursor.
- Chart writes remain behind `chart.replaceBars`.

Commit: `d34e8a8 Add V5 replay next command`

### Step 364.2 - Play Reveals Repeated Bars

- Added `replay.play`, `replay.pause`, and `replay.getPlaybackState`.
- Play advances by repeatedly dispatching the same one-bar `Next` path.
- Playback pauses while an advance is in flight and stops when no next bar can
  be revealed.

Commit: `2c640a6 Add V5 replay play command`

### Step 364.3 - Stop At Session End

- Added explicit replay runtime helpers for session-end checks.
- `Next` now returns `advanced: false` with `reason: "session-end"` when the
  cursor is at or after `sessionEnd`.
- Candidate next bars whose timestamp is after `sessionEnd` are rejected before
  chart state changes.
- Added smoke coverage for 1m, 5m, and 1h exact-end cases, plus a case where
  the next active-timeframe bar would overshoot session end.

Commit: `017940f Stop V5 replay at session end`

### Step 364.4 - Prevent Right Pan Into Unrevealed Future

- Added chart runtime commands for visible range and the replay right-edge
  limit.
- Chart runtime clamps visible range `to` at the latest revealed replay bar.
- Replay runtime syncs that right-edge limit after initial load and each
  successful `Next`.
- Added smoke coverage proving attempted right-pan is clamped at start before
  reveal, then moves forward by one bar after `Next`.

## Checks

- `node v5/tests/replay-session-end-smoke.js`
- `node v5/tests/replay-right-pan-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- `Next` advances to a bar exactly equal to `sessionEnd`.
- A following `Next` does not advance and does not issue another bar request.
- If the next active-timeframe bar would be after `sessionEnd`, replay does not
  reveal it.
- The same stop behavior is available to Play because Play uses `Next`.
- Right-pan cannot move the visible range beyond the latest revealed replay bar.

## Next Step

Step 365 should add prefix demand and retention. Keep left-drag demand detection
owned by chart runtime events/commands, older-bar requests behind bar data
runtime, and replay cursor ownership inside replay runtime.
