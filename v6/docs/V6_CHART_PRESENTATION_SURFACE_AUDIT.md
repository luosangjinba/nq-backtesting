# V6 Chart Presentation Surface Audit

Date: 2026-07-05

## Decision

The real chart engine path is functional and protected by browser gates. The
workstation shell now reserves an engine-owned chart host, mounts a real
Lightweight chart adapter into that host, and demotes static placeholder visuals
to fallback status. Chart-data snapshots now reach the mounted workstation
adapter through a chart-engine bridge, and chart-viewport projections now write
adapter logical ranges through a separate chart-engine bridge.
The running app now has a default-wall load/next browser gate covering the
full replay -> chart-data -> chart-viewport -> chart-engine path. It also has a
manual-wall running-app gate proving manual projection is preserved across
default-wall next.

## Current Presentation Paths

| Path | Files | Current role | Finding |
| --- | --- | --- | --- |
| Workstation chart host | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | `data-v6-chart-engine-host` reserves the engine-owned default pane host | Primary workstation chart target is explicit |
| Workstation shell fallback | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | Static candles, static price scale, static time scale, chart title overlay | Fallback only; visually reduced and hidden from accessibility |
| Lightweight chart adapter | `v6/src/chart-engine/lightweight-chart-adapter.js` | Real chart lifecycle, `setData`, `update`, logical range writes, measured logical range | Functional and browser-tested |
| Chart host manager | `v6/src/chart-engine/chart-host-manager.js` | Pane-local chart hosts and adapter ownership | Functional and browser-tested |
| Workstation chart surface | `v6/src/chart-engine/workstation-chart-surface.js`, `v6/src/app.js` | Mounts the default workstation chart host with a real adapter | Mounted in the running app with zero data until chart-data drives it |
| Chart-data surface bridge | `v6/src/chart-engine/chart-data-surface-bridge.js`, `v6/src/app.js` | Subscribes to `chartData:barsChanged` and applies pane-local records to the mounted adapter | Functional and browser-tested |
| Chart-viewport surface bridge | `v6/src/chart-engine/chart-viewport-surface-bridge.js`, `v6/src/app.js` | Subscribes to `chartViewport:projected` and applies projected logical ranges to the mounted adapter | Functional and browser-tested |

## Gate Results

Passed:

- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`

## Findings

- The real chart adapter can mount, render data, update candles, write logical
  ranges, and measure visible logical range in the browser.
- The chart host manager can mount separate pane hosts and keep pane-local chart
  data and ranges.
- Replay wall browser gates already exercise chart adapter behavior, but they
  mount chart hosts inside the test harness rather than through the default
  workstation shell chart surface.
- The default shell now exposes `[data-v6-chart-engine-host]` with
  `data-v6-pane-id="main"`.
- The running app now mounts that default host through
  `mountWorkstationChartSurface(root)`.
- The mounted adapter state reports `dataLength: 0` at boot, then updates when
  chart-data emits a pane-local record for the default pane.
- The chart-data bridge ignores records for other panes until those panes have
  their own mounted chart surface.
- The chart-viewport bridge applies projected logical ranges for the default
  pane and ignores other panes until those panes have their own mounted chart
  surface.
- The running app default-wall flow gate verifies load and next update mounted
  chart data and projected range without route/shell writing the adapter.
- The running app manual-wall flow gate verifies manual wall offset/span are
  projected to the mounted chart and preserved across default-wall next.
- The default shell still contains `.static-chart-visual`,
  `.price-scale-placeholder`, and `.time-scale-placeholder`, but these live
  under `[data-v6-chart-fallback]` with reduced opacity and `aria-hidden="true"`.

## Risk

The next gap is no longer manual-wall delivery; it is documenting the FXReplay
UI reference kernel so workstation UI parity can expand without drifting into a
dashboard/debug-console shape.

## Next Direction

The next executable step should capture FXReplay UI reference guardrails. The
step must preserve:

- visible-latency gates;
- default and manual wall replay gates;
- multi-pane chart host and manual wall gates;
- shell/runtime ownership boundaries.
