# V6 Step 19 - Mixed Timeframe Panes

Date: 2026-07-05

## Scope

Step 19 added mixed-timeframe replay projection for default-wall panes. The
step kept timeframe state pane-local and added tests that fail if active-pane
display timeframe leaks into inactive panes. It did not add pane-local manual
wall drag behavior; that is Step 20.

## Commits

- `114baec feat(v6): project default wall pane timeframes`
- `6ac7883 feat(v6): support mixed timeframe wall fanout`
- `644da85 test(v6): measure mixed timeframe visible latency`
- `b65aaf3 test(v6): guard pane timeframe isolation`

## Implementation Notes

- Added `v6/src/default-wall/default-wall-pane-projection.js`.
- `1m` panes continue to use append payloads.
- Higher timeframe panes use replace payloads with projected bars, avoiding
  duplicate partial buckets.
- Default-wall runtime resolves display timeframe by pane id. It does not fall
  back to active pane state.
- `paneDisplayTimeframes` can provide explicit pane-local display timeframes
  for multi-pane browser harnesses.
- `displayTimeframe.apply` remains active-pane scoped when `paneId` is omitted.

## Verification

- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 20 should keep manual wall intent pane-local. Drag or wheel on one pane
must not mutate another pane's viewport intent, and multi-pane visible latency
must remain gated.
