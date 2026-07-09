# V6 Session - Step 199 Auto-Play HTF Projection Path

Date: 2026-07-08

## Completed

Step 199 verified the auto-play higher-timeframe path and kept auto-play as a
timer/scheduler over manual-next.

Commits:

- `a6151f79 docs(v6): audit auto-play HTF projection path`
- `b5d06177 fix(v6): update HTF candle append merges`
- `85da4685 test(v6): cover auto-play HTF visible latency`
- `b6d2408e test(v6): add auto-play HTF to regression pack`

## Changes

- Added an auto-play HTF projection audit documenting that auto-play must not
  directly dispatch projection, bar-data, or chart-data commands.
- Added runtime coverage proving 5m auto-play ticks route through manual-next
  and record `projectionSource`.
- Fixed chart-data duplicate timestamp merge behavior so in-progress HTF
  candles update close/high/low on repeated appends.
- Adjusted prepend merge ordering so older projected/prepended bars are treated
  as earlier input than current chart bars.
- Added browser coverage for 5m auto-play visible latency.
- Added the auto-play HTF browser smoke to the chart browser regression pack.

## Verification

- `node v6/tests/auto-play-htf-projection-audit-step199-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step199-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next

Step 200 should audit and route reset-view HTF calculations through display
chart-data without moving aggregation into chart engine or replay runtime.
