# V6 Chart Presentation Surface Audit

Date: 2026-07-05

## Decision

The real chart engine path is functional and protected by browser gates. The
workstation shell now reserves an engine-owned chart host, mounts a real
Lightweight chart adapter into that host, and demotes static placeholder visuals
to fallback status.

## Current Presentation Paths

| Path | Files | Current role | Finding |
| --- | --- | --- | --- |
| Workstation chart host | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | `data-v6-chart-engine-host` reserves the engine-owned default pane host | Primary workstation chart target is explicit |
| Workstation shell fallback | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | Static candles, static price scale, static time scale, chart title overlay | Fallback only; visually reduced and hidden from accessibility |
| Lightweight chart adapter | `v6/src/chart-engine/lightweight-chart-adapter.js` | Real chart lifecycle, `setData`, `update`, logical range writes, measured logical range | Functional and browser-tested |
| Chart host manager | `v6/src/chart-engine/chart-host-manager.js` | Pane-local chart hosts and adapter ownership | Functional and browser-tested |
| Workstation chart surface | `v6/src/chart-engine/workstation-chart-surface.js`, `v6/src/app.js` | Mounts the default workstation chart host with a real adapter | Mounted in the running app with zero data until chart-data drives it |

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
  `data-v6-pane-id="default"`.
- The running app now mounts that default host through
  `mountWorkstationChartSurface(root)`.
- The mounted adapter state intentionally reports `dataLength: 0`; chart-data
  has not yet been connected to the real workstation surface.
- The default shell still contains `.static-chart-visual`,
  `.price-scale-placeholder`, and `.time-scale-placeholder`, but these live
  under `[data-v6-chart-fallback]` with reduced opacity and `aria-hidden="true"`.

## Risk

The next gap is no longer adapter mounting; it is connecting chart-data snapshots
to the mounted adapter without allowing route or shell code to own bars, replay
cursor, or viewport intent.

## Next Direction

The next executable step should connect pane-local chart-data snapshots to the
mounted workstation adapter through an explicit integration boundary. The step
must preserve:

- visible-latency gates;
- default and manual wall replay gates;
- multi-pane chart host and manual wall gates;
- shell/runtime ownership boundaries.
