# V6 Chart Presentation Surface Audit

Date: 2026-07-05

## Decision

The real chart engine path is functional and protected by browser gates, but the
default workstation shell still presents a static chart visual as the main chart
surface. That placeholder should not remain the long-term primary visual path.

## Current Presentation Paths

| Path | Files | Current role | Finding |
| --- | --- | --- | --- |
| Workstation shell placeholder | `v6/src/shell/workstation-shell.js`, `v6/src/styles/app.css` | First-screen static candles, static price scale, static time scale, chart title overlay | Useful for early shell layout, but now competes with the real chart path |
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
- `node v6/tests/boundary-smoke.js`

## Findings

- The real chart adapter can mount, render data, update candles, write logical
  ranges, and measure visible logical range in the browser.
- The chart host manager can mount separate pane hosts and keep pane-local chart
  data and ranges.
- Replay wall browser gates already exercise chart adapter behavior, but they
  mount chart hosts inside the test harness rather than through the default
  workstation shell chart surface.
- The default shell still contains `.static-chart-visual`,
  `.price-scale-placeholder`, `.time-scale-placeholder`, and
  `[data-v6-chart-placeholder]`.

## Risk

Leaving static placeholder candles as the dominant workstation chart surface can
hide gaps in the real chart mounting path. It also creates two visual truths:
the shell placeholder and the engine-backed replay chart.

## Next Direction

The next executable step should make the workstation chart surface reserve an
engine-owned host and reduce the static placeholder to an empty/loading fallback
or remove it entirely. The step must preserve:

- visible-latency gates;
- default and manual wall replay gates;
- multi-pane chart host and manual wall gates;
- shell/runtime ownership boundaries.
