# V6 Display-Timeframe Target Materialization Wiring Plan - Step 334

## Status

Accepted.

## Outcome

Step 334 defines the read-only
`display-timeframe-target-materialization-wiring-plan`.

New plan module:

`v6/src/replay/display-timeframe-target-materialization-wiring-plan.js`

New coverage:

- `v6/tests/display-timeframe-target-materialization-wiring-plan-step334-smoke.js`
- `v6/tests/display-timeframe-target-materialization-wiring-boundary-step334-static-smoke.js`

## Plan

Future runtime wiring is owned by `display-timeframe-runtime` and may begin only
after the Step 333 readiness report is `ready`.

The minimal command/data sequence is:

1. read source replay cursor through `replay.getState`;
2. preserve source bars through `chartData.getSourceBars`;
3. plan the target display window through `barData.planTargetWindow`;
4. load target display bars through `barData.loadTargetWindow`;
5. resolve target-bar reveal state with the Step 329 source-cursor policy;
6. apply visible target display bars through `chartData.replaceBars` with
   source preservation;
7. let the existing chart-data revision path reapply viewport intent through
   chart-viewport ownership.

## Fallback Gates

Runtime wiring must fall back to the current projection path if any of these
gates fails:

- Step 333 readiness report is not `ready`;
- target-history is not enabled for the display timeframe;
- source `1m` replay cursor cannot be read;
- source bars cannot be preserved before target replacement;
- target window planning fails;
- target window loading returns no usable bars;
- target-bar reveal policy cannot resolve visible bars;
- chart-data replacement cannot preserve source bars;
- target-history request sizing would change;
- chart-history fast-path behavior would change.

## Rollback Criteria

Disable or revert the future runtime wiring if it:

- mutates replay cursor state;
- mutates viewport intent directly;
- writes chart-engine series/range APIs directly;
- regresses high-timeframe target-history pack latency;
- loses preserved source bars when switching back to `1m`;
- allows future target bars beyond the source `1m` replay cursor.

## Boundary

This step added a pure wiring plan and static boundary coverage.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart-history fast-path scheduling, chart viewport intent,
chart-engine behavior, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior.

## Verification

- `node v6/tests/display-timeframe-target-materialization-wiring-plan-step334-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-wiring-boundary-step334-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-audit-step333-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-boundary-step333-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-closeout-step333-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 335 should implement the first bounded
`display-timeframe-target-materialization-runtime-handoff` wiring slice inside
Display-Timeframe Runtime. It should keep fallback to the current projection
path, preserve source `1m` bars, and avoid replay cursor, viewport intent,
chart-history request sizing, chart-history fast-path, and chart-engine
behavior changes.
