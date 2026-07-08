# V6 Session - Step 187 Replay-Safe Leftward History Latency Gate

Date: 2026-07-08

## Completed

Step 187 added a browser gate for replay-safe leftward history latency.

Commits:

- `e392659e docs(v6): define step 187 latency gate`
- `39241564 test(v6): gate replay-safe history latency`

## Changes

- Added `V6_REPLAY_SAFE_LEFTWARD_HISTORY_LATENCY_STEP187.md`.
- Added `replay-safe-leftward-history-latency-browser-step187-smoke.js`.
- Added the Step 187 browser smoke to `chart-browser-regression-pack.js`.
- Updated `TODO.md` so Step 187 is the latest completed roadmap step.

## Gate Behavior

- A real browser session triggers leftward history through chart interaction.
- Replay `Next` is executed while leftward history is still delayed or pending.
- The test asserts browser-side `Next` command latency remains within budget.
- The test waits for leftward history completion and proves replay state is
  unchanged by historical extension.
- The test asserts older-window metadata remains canvas-left capped.
- The test asserts visible logical range is compensated by the actual prepended
  chart-data count, preserving current-screen visual stability.

## Verification

- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 188 should clarify futures Globex session boundaries in the UI/model. The
default session card shows trading dates such as `2026-06-01 / 2026-06-05`,
while valid NQ chart data for the June 1 trading day can begin at Sunday
`2026-05-31 18:00`. The next gate should prevent users from interpreting that
valid Globex boundary as a left-extension failure.
