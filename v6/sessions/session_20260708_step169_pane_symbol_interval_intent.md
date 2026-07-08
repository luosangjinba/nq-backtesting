# V6 Session - Step 169 Pane Symbol/Interval Intent

Date: 2026-07-08

## Completed

Step 169 added explicit pane-local Symbol/Interval intent state.

Commits:

- `85ba111b feat(v6): add pane intent store setters`
- `d7bd83fc feat(v6): expose pane intent commands`
- `b699c6f8 test(v6): guard pane intent boundary`

## Changes

- Exported pane instrument/timeframe normalizers.
- Added pane store setters for Symbol and Interval intent.
- Added `pane.setSymbolIntent` and `pane.setIntervalIntent`.
- Added `pane:symbolIntentChanged` and `pane:intervalIntentChanged`.
- Kept `pane.setDisplayTimeframe` and `pane:displayTimeframeChanged`
  compatible with existing runtime listeners.
- Added a boundary smoke proving pane intent does not request bars, write
  chart-data, project viewport, or mutate replay.

## Verification

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 170 should add the dedicated Symbol/Interval sync runtime skeleton without
implementing bar reloads.
