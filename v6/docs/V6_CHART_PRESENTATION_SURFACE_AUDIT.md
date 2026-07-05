# V6 Chart Presentation Surface Audit

Date: 2026-07-05

## Decision

The real chart engine path is functional and protected by browser gates. The
workstation shell now reserves an engine-owned chart host and demotes static
placeholder visuals to fallback status.

## Current Presentation Paths

| Path | Files | Current role | Finding |
| --- | --- | --- | --- |
| Workstation chart host | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | `data-v6-chart-engine-host` reserves the engine-owned default pane host | Primary workstation chart target is now explicit |
| Workstation shell fallback | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | Static candles, static price scale, static time scale, chart title overlay | Fallback only; visually reduced and hidden from accessibility |
| Lightweight chart adapter | `v6/src/chart-engine/lightweight-chart-adapter.js` | Real chart lifecycle, `setData`, `update`, logical range writes, measured logical range | Functional and browser-tested |
| Chart host manager | `v6/src/chart-engine/chart-host-manager.js` | Pane-local chart hosts and adapter ownership | Functional and browser-tested |

## Gate Results

Passed:

- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
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
- The default shell still contains `.static-chart-visual`,
  `.price-scale-placeholder`, and `.time-scale-placeholder`, but these live
  under `[data-v6-chart-fallback]` with reduced opacity and `aria-hidden="true"`.

## Risk

The next gap is no longer host reservation; it is mounting the real chart
adapter into the workstation host and letting replay/chart data drive that
surface.

## Next Direction

The next executable step should mount a real chart adapter into
`[data-v6-chart-engine-host]` through a shell/chart boundary that does not give
the route direct chart-data, replay, or viewport ownership. The step must
preserve:

- visible-latency gates;
- default and manual wall replay gates;
- multi-pane chart host and manual wall gates;
- shell/runtime ownership boundaries.
