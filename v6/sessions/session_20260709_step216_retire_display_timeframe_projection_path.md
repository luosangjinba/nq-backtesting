# V6 Session - Step 216 Retire Display-Timeframe Projection Path

Date: 2026-07-09

## Summary

Step 216 removed the standalone display-timeframe HTF projection implementation
and routed remaining consumers through the chart-data projection owner/domain
path.

## Changes

- Deleted `v6/src/display-timeframe/display-timeframe-projection.js`.
- Updated `v6/src/display-timeframe/display-timeframe-runtime.js` to dispatch
  `CHART_DATA_PROJECTION_COMMANDS.PROJECT` and apply the returned projection
  bars.
- Updated `v6/src/default-wall/default-wall-pane-projection.js` to use
  `projectSourceBarsToChartData` directly for pure default-wall payload
  construction.
- Updated display-timeframe/default-wall/static smokes so the retired helper
  cannot return unnoticed.

## Preserved Boundaries

- Display-timeframe runtime remains a command orchestrator; projection math is
  owned by the projection owner/domain.
- Default-wall pure payload preparation remains synchronous and uses the
  projection domain rather than a second projection implementation.
- No new TFs, indicators, Pine Script compatibility, SMC/ICT overlays, trading,
  order tickets, prop firm rule engines, or pseudo-live simulation behavior were
  added.

## Verification

- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step200-smoke.js`
- `node v6/tests/next-foundation-slice-selection-step213-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commit

- `78237969 refactor(v6): retire display timeframe projection path`

## Next

Step 217 should wrap remaining local TF/timestamp normalization in
chart-history, replay, panes, and chart-viewport through `time-domain` while
preserving each runtime's ownership.
