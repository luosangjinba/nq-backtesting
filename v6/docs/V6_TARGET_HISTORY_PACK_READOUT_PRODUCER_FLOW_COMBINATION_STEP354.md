# V6 Target History Pack Readout Producer Flow Combination Step 354

## Status

Accepted.

## Outcome

Step 354 verifies the optional target-history diagnostics pack combination:

```bash
TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js
```

The pack runs the Step 337 replay-coordination browser smoke first and the Step
352 materialization diagnostics readout producer-flow browser smoke second.

The default target-history diagnostics pack remains unchanged at eight members.
The standalone optional members remain available:

- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination`
- `TARGET_HISTORY_PACK_MEMBERS=readout-producer-flow`

## Boundary

This step is verification-only:

- no pack default membership changes;
- no pack runner behavior changes;
- no Step 337 or Step 352 browser smoke behavior changes;
- no direct `updateSnapshot` use introduced into producer-flow browser coverage;
- no shell target-bar API calls;
- no producer runtime changes;
- no replay cursor, target loading, chart-data, viewport, request sizing, or
  chart-history fast-path behavior changes.

## Coverage

- `v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

## Verification

- `node v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-closeout-step353-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Decision

The diagnostics/readout chain is now packaged enough to stop adding more
observability-only pack wiring. The next bounded step should select the next
target-materialization foundation slice instead of extending diagnostics UI.

## Next

Step 355 should perform a compact target-materialization diagnostics/readout
chain closeout and next-slice selection. It should use the Step 337, Step 352,
and Step 354 pack coverage as evidence, then select the next bounded
foundation slice without changing runtime behavior.
