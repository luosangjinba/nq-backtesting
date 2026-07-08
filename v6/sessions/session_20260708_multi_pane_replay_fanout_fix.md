# V6 Session - Multi-Pane Replay Fanout Fix

Date: 2026-07-08

## Completed

Fixed the multi-pane replay transport path where toolbar Next/Play advanced
only the left/top pane.

## Root Cause

Replay transport dispatched manual-next and auto-play start without pane
context. Chart-entry runtimes therefore fell back to the default `main` pane,
so only the first visible pane received appended replay bars.

## Changes

- Replay transport now resolves visible pane ids from the chart surface.
- Manual-next accepts `paneIds` while preserving the existing single `paneId`
  API.
- Manual-next advances the replay cursor once per step, then appends the cursor
  bar to each requested pane.
- Auto-play stores `paneIds` and forwards the same pane set on every tick.
- Multi-pane append and transport controller smoke tests now cover pane fanout.

## Verification

- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/multi-pane-replay-append-step156-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-step157-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `git diff --check`

## Notes

The fix keeps bar-data ownership unchanged. Multiple panes may reuse the same
loaded bar window through the bar-data cache; pane fanout is verified by chart
data append results, not by requiring one adapter fetch per pane.
