# Step 495 - Pane-Local Chart State Release

Date: 2026-07-03

## Plan

1. Add a chart-runtime command that receives the current layout pane ids and
   releases chart-owned resources for pane ids no longer present.
2. Have the chart route dispatch that command after layout state rendering and
   host mounting, without giving route UI direct adapter ownership.
3. Extend lifecycle docs and smoke coverage so removed panes cannot retain
   pane-local bars, ranges, host refs, or chart adapters.

## Changes

- Added `CHART_COMMANDS.RELEASE_PANES`.
- Added `chart.releasePanes` handling in chart runtime.
- Chart runtime now releases stale non-primary pane display state, pane host
  refs, and adapters when a layout no longer retains those pane ids.
- Chart runtime `stop()` now clears `paneDisplayStateByPaneId`.
- Chart replay route now dispatches current pane ids to chart runtime after
  applying layout state.
- Extended pane-local viewport smoke coverage to assert removed secondary panes
  do not receive later primary chart writes.
- Updated lifecycle cleanup audit/spec, `v5/TODO.md`, and session handoff.

## Verification

- `node v5/tests/lifecycle-cleanup-static-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next

- Step 496 should continue the lifecycle backlog with bar-data cache retention
  checks for multi-pane workloads, or add a browser route teardown smoke for
  controller cleanup behavior.
