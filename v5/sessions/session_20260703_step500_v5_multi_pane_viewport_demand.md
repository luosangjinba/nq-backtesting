# Step 500 - Multi-Pane Viewport Demand

Date: 2026-07-03

## Goal

Harden pane-local viewport demand after an independent active-pane timeframe
change.

The concrete acceptance case is: a secondary pane switches from `1m` to `5m`,
then a pane-local manual visible range exposes missing left-side history. The
secondary pane must request and merge the older bars without requiring a
mouseup/click stimulus, while the primary pane remains unchanged.

## Plan

1. Add a browser smoke for secondary-pane `5m` viewport demand after active-pane
   TF change.
2. Inspect the display-window merge path for non-primary panes.
3. Fix runtime ownership without letting route UI request bars or write chart
   series.
4. Update the multi-pane contract, workstation decision backlog, visual-system
   verification list, TODO, and session index.
5. Run focused smoke tests and `git diff --check`, then commit.

## Changes

- Added `v5/tests/multi-pane-viewport-demand-browser-smoke.js`.
- Extended `chart.getRenderedBars` to accept `paneId` and return a
  replay-readable target-pane snapshot with `timestamp` values.
- Updated non-primary display-window loading to:
  - use the target pane's existing bars as the merge base;
  - key duplicate in-flight demand by pane id;
  - compare display changes against the target pane base instead of the global
    primary replay display state.
- Documented the pane-local viewport-demand rule in:
  - `v5/TODO.md`
  - `v5/docs/specs/layout-split-panes-contract.md`
  - `v5/docs/specs/workstation-decision-backlog.md`
  - `v5/docs/specs/workstation-visual-system.md`

## Verification

- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`

## Next

Recommended Step 501: polish split-pane resize and active-pane UX details,
including resize-handle hit area, minimum pane wall behavior, active-pane
visibility while resizing, and a browser acceptance gate for ratio-based split
state.
