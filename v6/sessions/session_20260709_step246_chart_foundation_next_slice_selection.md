# V6 Session - Step 246 Chart Foundation Next Slice Selection

Date: 2026-07-09

## Summary

Step 246 selected the next bounded chart-foundation slice after the Step 245
replay/transport regression pack passed.

## Decision

Step 247 should implement **Date-Range Entry Viewport Alignment Audit/Gate**.

## Rationale

- Step 245 covered replay transport, Manual Previous, leftward history,
  multi-pane bootstrap, pane-local reset view, and display timeframe switching.
- The product direction still lists date ranges as part of the current chart
  foundation phase.
- User-observed behavior showed a date-range entry path where chart data could
  exist while K-lines initially appeared outside the visible canvas.
- The next slice should therefore focus on session date range -> actual loaded
  boundary -> chart-entry initial window -> viewport projection.

## Preserved Boundaries

- Session dashboard owns selected trading-date display.
- Chart-entry owns session-to-chart initial window orchestration.
- Bar-data owns bounded requests and loaded boundary metadata.
- Chart-data owns pane-local bar records.
- Chart viewport owns default-wall visible range intent.
- Shell UI does not own date-range math, bar requests, chart-data writes, or
  viewport projection.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step246-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 247 should add the owner-path audit/gate and only fix runtime behavior if
that gate exposes a specific owner bug.
