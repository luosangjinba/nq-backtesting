# V6 Session - Replay Gap Continuation Fix

Date: 2026-07-10

## Context

Manual testing showed the previous replay gap fix only crossed the session
break from `16:59` to `18:00`. A following manual `Next` could not continue to
`18:01`.

## Root Cause

`replay.setCursorTime` updated `cursorTime` but left `cursorIndex` and
`revealedCount` at their pre-gap values. After chart-entry aligned the replay
cursor to the next real source bar at `18:00`, the next replay `Next` still
advanced from the old index and therefore resolved back to the first
post-break minute.

## Fix

Replay domain cursor-time alignment now recalculates:

- `cursorIndex`;
- `previousAvailable`;
- `revealedCount`.

The owner boundary stays inside replay domain/runtime. Chart-entry manual-next
still coordinates the gap skip, but it does not own replay index math.

## Verification

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Notes

The browser gap smoke now verifies 1m, 5m, and 15m paths skip to `18:00` and
then continue to `18:01`. Higher-timeframe paths still validate the projected
bucket's last source timestamp rather than requiring the bucket start timestamp
to equal the source minute.
