# V6 Step 253 - Multi-Pane Chart Foundation Regression Pack

Date: 2026-07-09

## Decision

Step 253 adds a compact multi-pane chart foundation regression pack.

The pack is intentionally smaller than `v6/tests/chart-browser-regression-pack.js`.
It is the focused gate to run when changing pane, layout, replay, chart-data,
chart viewport, display-timeframe, reset-view, maximize/restore, or active-pane
focus/readout code.

## Pack

`v6/tests/multi-pane-chart-foundation-regression-pack-step253-smoke.js`
runs these browser gates in sequence:

- `v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `v6/tests/multi-pane-leftward-history-browser-step155-smoke.js`
- `v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `v6/tests/maximize-restore-control-browser-step186-smoke.js`
- `v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `v6/tests/multi-pane-active-focus-chain-browser-step251-smoke.js`

## Coverage

- Pane data bootstrap creates visible pane-local chart data.
- Replay append updates visible panes through the coordinated multi-pane path.
- Replay viewport projection remains pane-local.
- Leftward history remains pane-isolated.
- Pane-local reset targets the intended pane.
- Maximize and restore preserve pane state.
- Display-timeframe commands target the active pane.
- Active focus/readout state remains consistent across chart surface, pane
  runtime, shell toolbar, pane status readout, and chart-data.

## Owner Boundaries

- Layout runtime owns layout mode, visible pane ids, and active pane id.
- Pane runtime owns pane records, active pane state, instrument state, and
  display timeframe state.
- Chart surface owns chart host lifecycle, pane activation events, and visible
  chart host state.
- Chart-data runtime owns pane-local bar records and replacement/append state.
- Chart viewport owns pane-local viewport intent and projection state.
- Replay runtime owns cursor/reveal state and does not write chart series.
- Display-timeframe control owns shell UI state and active-pane command target
  selection.
- Reset-view and maximize/restore controls dispatch owner commands only.
- Bar-data runtime remains the only owner that requests and caches bars.

## Non-Goals

- This pack does not replace the full chart browser regression pack.
- No runtime behavior changes were made for Step 253.
- No new pane layout modes, timeframes, custom interval UI, indicators, Pine
  Script compatibility, SMC/ICT overlays, trading simulation, order tickets,
  prop firm rule engines, or journal workflows were added.

## Verification

- `node v6/tests/multi-pane-chart-foundation-regression-pack-step253-smoke.js`
- `node v6/tests/multi-pane-active-focus-chain-browser-step251-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
