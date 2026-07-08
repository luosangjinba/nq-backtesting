# V6 Symbol/Interval Intent Fan-Out - Step 171

Date: 2026-07-08

## Boundary

Step 171 extends the dedicated pane-intent sync runtime to fan out Symbol and
Interval intent changes to eligible visible panes.

The runtime now:

- plans target panes from layout sync state and current pane snapshot;
- dispatches target pane intent commands;
- suppresses programmatic target events to avoid feedback loops;
- emits `paneIntentSync:planned` and `paneIntentSync:applied`.

## Non-Goals

This step still does not:

- request bar-data windows;
- replace or append chart-data;
- project chart viewport;
- write chart series;
- mutate replay cursor or reveal state.

## Verification

- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/pane-intent-sync-boundary-step170-smoke.js`
- `node v6/tests/pane-intent-sync-model-step170-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 172 should decide and test the data reload trigger boundary for a synced
Symbol/Interval intent change before any bar-data request or chart-data write is
implemented.
