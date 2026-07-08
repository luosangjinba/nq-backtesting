# V6 Session - Post-Step 186 Chart Drag / Leftward-History Stability

Date: 2026-07-08

## Completed

Post-step 186 stabilized manual chart dragging and leftward history loading.

Commits:

- `c75dfe99 fix(v6): stop drag range input after release`
- `f630e51f fix(v6): avoid native drag projection feedback`
- `e49cfe2e fix(v6): stabilize drag during history loads`

## Decisions

- Current K-line visual stability has priority over immediate leftward history
  loading.
- Native Lightweight Charts drag owns the immediate chart position. The V6
  manual-wall bridge records manual viewport intent but does not immediately
  project the measured range back into the chart.
- Leftward history input is delayed and coalesced by default. Continuous drag
  should keep only the latest canvas-left request candidate.
- Oversized leftward history windows are chunked instead of rejected or loaded
  in one large request.
- When older bars are prepended, the chart surface compensates the visible
  logical range by the prepended bar count so the current screen remains
  visually stable.
- Chart viewport runtime skips `prepend`-triggered manual projection because a
  history prepend is not a replay advance or an explicit reset.

## Changes

- Tightened chart-surface range input lifecycle so drag release stops manual
  visible-range propagation after a short grace window.
- Removed immediate `APPLY_CHART_DATA_REVISION` dispatch from
  `manual-wall-input-bridge`.
- Added delayed/coalesced `REQUEST_LEFT_EXTENSION` scheduling to
  `leftward-history-input-bridge`.
- Added capped/chunked canvas-left older-window planning in `bar-window`.
- Passed chart-data operation type through `chart-data-surface-bridge`.
- Added prepend visible-range compensation in `workstation-chart-surface`.
- Updated chart control bridge contract/audit docs to reflect manual intent
  only for native drag.
- Added browser and unit coverage for drag release, fast right drag stability,
  manual prepend projection suppression, and prepend visible-range compensation.

## Verification

- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 187 should convert this stability policy into a replay-safe latency gate:
older-history loading may be delayed and chunked, but replay Next/Play and
manual drag must remain visibly responsive while leftward history work is
pending or completing.
