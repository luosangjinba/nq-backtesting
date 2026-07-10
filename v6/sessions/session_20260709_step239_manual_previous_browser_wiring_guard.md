# V6 Session - 2026-07-09 - Step 239 Manual Previous Browser Wiring Guard

## Scope

Step 239 added browser-level coverage for the chart-entry manual Previous
runtime while keeping the transport Previous button disabled.

## Changes

- Added `v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`.
- Updated `v6/TODO.md` to mark Step 239 complete and select Step 240.

## Behavior Verified

- The app lifecycle starts `runtime.chartEntryManualPrevious`.
- Page commands include `chartEntryManualPrevious.getState` and
  `chartEntryManualPrevious.previous`.
- The reserved `data-v6-transport-step-back` button remains disabled and has no
  transport action.
- Clicking the disabled Previous control and sending keyboard events do not move
  replay state or chart-data.
- Direct command dispatch to `chartEntryManualPrevious.previous` rewinds replay
  state and replaces pane-local chart-data.
- Viewport intent origin/span are preserved across the manual previous command.

## Non-Goals

- Did not enable the transport Previous button.
- Did not wire shell transport to chart-entry manual Previous.
- Did not change indicators, trading simulation, order tickets, prop firm rule
  engines, or journal workflows.

## Verification

- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`
- `node v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

