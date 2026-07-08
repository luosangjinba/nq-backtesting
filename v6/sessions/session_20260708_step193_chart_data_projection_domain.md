# V6 Session - Step 193 Chart Data Projection Domain

Date: 2026-07-08

## Completed

Step 193 added the pure chart-data projection domain required before higher
timeframe routing work. It intentionally did not wire projection into UI,
replay, pane reload, leftward history, reset view, chart-data runtime, or chart
engine.

Commits:

- `4aa9145c feat(v6): add chart data projection domain`
- `465554d7 test(v6): guard chart data projection boundary`

## Changes

- Added `v6/src/chart-data-projection/chart-data-projection-domain.js`.
- Added `display-timeframe-projection-domain-step193-smoke.js`.
- Added `display-timeframe-no-wiring-step193-smoke.js`.
- Extended `boundary-smoke.js` so `chart-data-projection` stays pure.
- Relaxed the Step 192 no-feature guard so Step 193 can add a pure domain while
  still blocking runtime, contract, UI, and pane reload wiring.

## Domain Behavior

The new domain helper projects source bars into chart-ready display bars:

- 1m -> 5m, 15m, and 60m OHLC aggregation;
- cursor-capped no-future filtering;
- deterministic duplicate timestamp merge;
- sorted unique output;
- bucket metadata with start/end timestamps, source count, expected source
  count, complete/in-progress, and cursor-capped flags;
- Sunday 18:00 Globex/session-aligned bucket starts through
  `sessionStartTimestamp`.

## Verification

- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 194 should add the chart-data projection owner runtime and explicit
contract. It should use the pure domain but still avoid routing the owner into
initial load, pane reload, manual next, auto-play, leftward history, reset view,
chart-data runtime, UI, or chart engine.
