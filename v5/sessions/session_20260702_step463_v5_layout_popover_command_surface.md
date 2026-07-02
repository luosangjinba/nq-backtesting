# Step 463 - V5 Layout Popover Command Surface

Status: completed.

Date: 2026-07-02

## Goal

Enable the first Layout command surface for `single`, `twice`, `triple`, and
the five sync switches without rendering extra chart panes.

## Implementation

- Added `layout.setMode` and `layout.setSync` commands to the layout contract
  and runtime.
- Added mode normalization so `single`, `twice`, and `triple` produce one, two,
  or three serializable pane records.
- Added a chart route Layout popover controller that dispatches layout commands
  and renders layout state.
- Enabled the toolbar Layout button and added Single/Twice/Triple plus
  `symbol`, `interval`, `crosshair`, `time`, and `dateRange` switches.
- Kept `symbol` visible but disabled in the UI while replay sessions remain
  single-instrument.
- Kept the route on one real chart host. Mode changes update route metadata
  only until the Step 464 DOM pane shell.

## Boundaries

- Route UI dispatches layout commands only.
- Route UI does not create chart series or request bar data.
- Chart runtime remains the only chart writer.
- Bar-data runtime remains the only bar requester.
- Replay runtime remains the owner of replay cursor and reveal state.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-layout.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 464 should render the multi-pane DOM shell from layout state. It should
still keep one real chart host initially, use placeholders for
secondary/tertiary panes, and dispatch `layout.setActivePane` when a pane is
selected.
