# Step 509 - Pane Replay Follow Initialization Race

Date: 2026-07-04

## Trigger

Manual testing found a race after Step 508:

- open a two-pane vertical layout;
- do not interact with the panes;
- click replay `Next` immediately;
- the right/secondary pane can lose visible candles while primary advances.

The reproduced path happens before the secondary pane-local display window has
finished initializing.

## Fix

- `chart-replay-pane-orchestrator.js` now stores pane display initialization
  promises by pane/timeframe key.
- `ensurePaneLocalDisplay()` returns the existing in-flight promise when a pane
  is already initializing instead of allowing replay-follow work to race it.
- `syncPaneForReplayNext()` waits for pane-local initialization before appending
  same-timeframe revealed bars or loading an independent-timeframe display
  window.
- The route still only delegates through commands. UI does not write chart
  series or request bars directly.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `git diff --check`

## Status

Completed.
