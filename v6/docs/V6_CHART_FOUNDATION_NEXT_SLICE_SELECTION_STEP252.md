# V6 Step 252 - Chart Foundation Next Slice Selection

Date: 2026-07-09

## Decision

Step 253 should implement **Multi-Pane Chart Foundation Regression Pack**.

This is a bounded chart-foundation regression slice. It should add a compact
pack focused on multi-pane foundation behavior, separate from the full chart
browser regression pack.

## Why This Slice

Steps 245-251 closed the replay/transport chain, date-range entry alignment,
drag/scroll stability, and active-pane focus/readout consistency. The remaining
foundation risk is not one missing feature. It is regression drift across the
multi-pane combination path:

- pane data bootstrap should create visible pane-local chart data;
- replay append should update all visible panes through the coordinated path;
- replay viewport projection should stay pane-local;
- leftward history should remain pane-isolated;
- pane-local reset view should target the intended pane;
- maximize/restore should preserve active pane and chart state;
- display-timeframe commands should target the active pane;
- active focus/readout state should remain consistent while these behaviors
  evolve.

The full `chart-browser-regression-pack.js` already covers these areas, but it
is intentionally broad. Step 253 should provide a smaller multi-pane foundation
pack that can be run quickly when touching pane, layout, replay, display
timeframe, reset, or chart-data ownership.

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

## Step 253 Scope

Implement Multi-Pane Chart Foundation Regression Pack:

- add a compact pack runner for core multi-pane foundation browser gates;
- include data bootstrap, replay append, viewport projection, leftward history,
  pane-local reset, maximize/restore, display-timeframe active-pane targeting,
  and active focus chain coverage;
- document pack purpose, membership, and expected use;
- keep the pack focused enough to run during multi-pane foundation work;
- add no runtime behavior unless the pack exposes a specific owner regression.

## Non-Goals

- Do not replace the full chart browser regression pack.
- Do not add new pane layout modes.
- Do not add new timeframes or custom interval UI.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.
- Do not move chart-data, bar-data, replay, pane, layout, or viewport ownership
  into shell UI.

## Suggested Verification For Step 253

- `node v6/tests/multi-pane-chart-foundation-regression-pack-step253-smoke.js`
- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 253 has one multi-pane foundation pack target.
- The selected slice stays inside chart foundation regression coverage.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 252.
