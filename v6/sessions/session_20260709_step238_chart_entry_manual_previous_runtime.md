# V6 Session - 2026-07-09 - Step 238 Chart Entry Manual Previous Runtime Skeleton

## Scope

Step 238 implemented the chart-entry manual Previous runtime skeleton while
keeping the transport Previous button disabled and shell transport unwired.

## Changes

- Added `CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS`.
- Added `CHART_ENTRY_MANUAL_PREVIOUS_EVENTS`.
- Added `v6/src/chart-entry/chart-entry-manual-previous-runtime.js`.
- Registered the runtime in `v6/src/app.js`.
- Added `v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`.
- Updated the Step 237 contract smoke to allow the accepted chart-entry runtime
  while continuing to guard shell/transport wiring.

## Behavior

- `chartEntryManualPrevious.previous` dispatches `REPLAY_COMMANDS.PREVIOUS`.
- It resolves target panes using the manual-next pane payload model.
- It prefers current chart-data filtering at or before the new replay cursor.
- It falls back to bounded bar-data loading only when current chart-data is not
  sufficient.
- It replaces pane-local chart-data through `CHART_DATA_COMMANDS.REPLACE_BARS`.

## Non-Goals

- Did not enable the transport Previous button.
- Did not wire shell transport to chart-entry manual Previous.
- Did not reset viewport or mutate chart adapter series directly.
- Did not change indicators, trading simulation, order tickets, prop firm rule
  engines, or journal workflows.

## Verification

- `node v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`
- `node v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`
- `node v6/tests/replay-previous-domain-command-step236-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`
