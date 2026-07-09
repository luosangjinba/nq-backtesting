# V6 Session - Step 217 Wrap Remaining TF / Timestamp Consumers

Date: 2026-07-09

## Summary

Step 217 routed the remaining replay, pane, chart-viewport, and chart-history
TF/timestamp consumers through the shared `time-domain` helper while preserving
runtime ownership boundaries.

## Changes

- Updated `v6/src/replay/replay-domain.js` to use shared minute timeframe,
  Unix-millisecond, and minute-second helpers.
- Updated `v6/src/panes/pane-model.js` to normalize pane display timeframes
  through `time-domain`.
- Updated `v6/src/chart-viewport/chart-viewport-runtime.js` and
  `v6/src/chart-viewport/chart-viewport-store.js` to normalize cursor
  timestamps through `time-domain`.
- Updated `v6/src/chart-history/leftward-extension-planner.js` and
  `v6/src/chart-history/leftward-history-extension-runtime.js` to use shared
  timeframe, timestamp, projection-source, and minute-second helpers.
- Updated the Step 214 static audit so migrated consumers must import
  `time-domain`.
- Adjusted left-boundary planning so same-TF drag extension keeps the
  canvas-left request cap and higher-TF display extension requests complete
  source buckets.

## Preserved Boundaries

- Replay still owns cursor and reveal state.
- Panes still own selected pane-local display timeframe.
- Chart-viewport still owns viewport intent and cursor timestamp state.
- Chart-history still orchestrates leftward history extension.
- Bar-data still owns API request-window planning, cache/window keys, and
  request caps.
- No new TFs, indicators, Pine Script compatibility, SMC/ICT overlays, trading,
  order tickets, prop firm rule engines, or pseudo-live simulation behavior were
  added.

## Verification

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/leftward-history-gap-scan-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `b9775988 refactor(v6): wrap replay pane viewport time helpers`
- `6d87ffae refactor(v6): wrap chart history time helpers`

## Next

Step 218 should consolidate `bar-data/bar-window.js` with `time-domain` while
preserving bounded older-window requests, chunk caps, session-boundary
metadata, HTF left-extension, and replay-safe latency behavior.
