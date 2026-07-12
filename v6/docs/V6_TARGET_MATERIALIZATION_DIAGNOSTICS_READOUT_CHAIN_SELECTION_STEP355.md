# V6 Target Materialization Diagnostics Readout Chain Selection Step 355

## Status

Accepted.

## Outcome

Step 355 closes the current target-materialization diagnostics/readout
observability chain and selects the next bounded foundation slice.

Evidence used:

- Step 337 covers replay coordination while `8h` target materialization is
  active.
- Step 352 covers real Display-Timeframe, Manual Next, and Auto Play producer
  flows updating the pane-status materialization diagnostics readout.
- Step 353 exposes the Step 352 browser smoke as optional target-history pack
  member `readout-producer-flow`.
- Step 354 verifies the optional pack combination
  `replay-coordination,readout-producer-flow`, running Step 337 then Step 352.

Decision:

- the diagnostics/readout chain is packaged enough for now;
- stop adding observability-only diagnostics UI or pack wiring in this line;
- select `narrow-replay-materialization-runtime-handoff-readiness-audit` as the
  next bounded target-materialization foundation slice.

## Selector

The pure selector lives at:

- `v6/src/replay/target-materialization-diagnostics-readout-chain-selection.js`

It selects the readiness-audit slice only when these gates are true:

- Step 337 replay-coordination browser coverage exists;
- Step 352 producer-flow readout browser coverage exists;
- Step 354 combination pack coverage exists;
- default eight-member target-history pack is preserved;
- optional pack members are preserved;
- source `1m` replay cursor authority is preserved;
- target bars remain display input only;
- producer-flow browser coverage does not dispatch `updateSnapshot` directly;
- shell readout consumption is command/event-only through `getSnapshot` and
  `snapshotReady`;
- producer runtimes remain unchanged;
- target-history request sizing and chart-history fast path remain unchanged.

## Boundary

This step is selection-only:

- no runtime behavior changes;
- no command or event registration;
- no target-bar API calls;
- no replay cursor movement changes;
- no no-bar gap skipping changes;
- no target-history request sizing changes;
- no chart-history fast-path changes;
- no chart-data, viewport, chart-engine, journal, order-ticket, prop-firm,
  indicator, or seconds changes.

## Coverage

- `v6/tests/target-materialization-diagnostics-readout-chain-selection-step355-smoke.js`
- `v6/tests/target-materialization-diagnostics-readout-chain-boundary-step355-static-smoke.js`
- `v6/tests/target-materialization-diagnostics-readout-chain-closeout-step355-static-smoke.js`

## Verification

- `node v6/tests/target-materialization-diagnostics-readout-chain-selection-step355-smoke.js`
- `node v6/tests/target-materialization-diagnostics-readout-chain-boundary-step355-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-combination-closeout-step354-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 356 should perform `narrow-replay-materialization-runtime-handoff-readiness-audit`.
It should audit the exact runtime handoff surfaces before any behavior changes,
keep replay source `1m` authority explicit, keep target bars display-only, and
avoid routing target bars through replay runtime.
