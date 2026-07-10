# V6 Step 251 - Multi-Pane Active Focus Chain Gate

Date: 2026-07-09

## Decision

Step 251 adds a browser-visible chain gate for multi-pane active focus and
readout ownership.

The gate keeps the existing owner model and does not change runtime behavior.
It verifies that a user-facing pane focus action is reflected consistently
through chart host visual state, pane runtime active id, top toolbar
symbol/timeframe presentation, pane-local OHLC headers, and display-timeframe
command targeting.

## Owner Chain

- Chart surface owns chart host pointer activation and active-pane visual
  presentation.
- Pane active surface bridge routes chart host activation to pane runtime.
- Pane runtime owns active pane id, pane instrument, and pane display
  timeframe.
- Shell top toolbar owns read-only active-pane symbol and timeframe
  presentation.
- Display-timeframe control owns shell UI state and active-pane command target
  selection.
- Pane status readout owns pane-local symbol, timeframe, and OHLC DOM
  presentation.
- Chart-data runtime owns pane-local bar replacement after a display-timeframe
  command.
- Bar-data runtime remains the only owner that requests and caches bars.
- Replay runtime remains the only owner of replay cursor/reveal state.

## Gate

`v6/tests/multi-pane-active-focus-chain-step251-smoke.js` opens the real V6
browser surface, creates a triple-pane layout, assigns different symbol and
timeframe state to each pane, emits pane-local OHLC values, focuses the
secondary pane, and then applies a toolbar timeframe change.

It verifies:

- visible active-pane outline/state agrees with chart surface active pane id;
- pane runtime active id is the focused pane;
- top toolbar symbol and timeframe mirror the active pane;
- pane-local symbol/timeframe/OHLC headers remain isolated;
- display-timeframe control targets the active pane;
- applying the toolbar timeframe changes secondary pane data only;
- main and tertiary pane chart-data records are unchanged.

## Non-Goals

- No layout redesign, resizing rewrite, or maximize/restore change.
- No interval sync behavior.
- No new supported timeframes.
- No indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

## Verification

- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/pane-active-visual-outline-browser-smoke.js`
- `node v6/tests/pane-active-surface-bridge-step207-smoke.js`
- `node v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `node v6/tests/pane-local-header-state-browser-step210-smoke.js`
- `node v6/tests/top-symbol-active-pane-browser-step212-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
