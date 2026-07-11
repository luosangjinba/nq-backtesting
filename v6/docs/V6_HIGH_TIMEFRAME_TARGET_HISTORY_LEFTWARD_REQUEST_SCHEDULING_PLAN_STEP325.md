# V6 High-Timeframe Target-History Leftward Request Scheduling Plan - Step 325

## Status

Accepted.

## Outcome

Step 325 converted the Step 324 attribution into a bounded scheduling plan.

New pure planner:

`v6/src/chart-history/high-timeframe-target-history-leftward-request-scheduling-plan.js`

New coverage:

- `v6/tests/high-timeframe-target-history-leftward-request-scheduling-plan-step325-smoke.js`
- `v6/tests/high-timeframe-target-history-leftward-request-scheduling-boundary-step325-static-smoke.js`

## Finding

The current `leftward-history-input-bridge` has two scheduling paths:

- native visible-range input schedules leftward requests through
  `requestDelayMs`, currently `500ms`;
- runtime events such as `DISPLAY_TIMEFRAME_EVENTS.APPLIED` and
  `CHART_VIEWPORT_EVENTS.PROJECTED` first schedule a zero-delay surface check,
  then use the same delayed request scheduling path.

Step 324 showed that this second delay dominates high-timeframe target-history
visual latency after display-timeframe application.

## Plan

The implementation should stay inside:

`chart-history.leftward-history-input-bridge`

The next implementation slice should:

- keep native visible-range drag/wheel scheduling on `requestDelayMs`;
- introduce an explicit runtime-event scheduling reason for display-timeframe
  and viewport projection checks;
- allow high-timeframe target-history programmatic scheduling to bypass the
  second `requestDelayMs` debounce after the zero-delay surface check;
- continue requiring measured visible-range validation before dispatch;
- continue resolving target-history activation through the bridge before
  dispatch;
- keep chart-history runtime, chart viewport intent, chart-engine, replay, and
  shell behavior unchanged.

## Decision

The next slice should be:

`target-history-programmatic-leftward-request-fast-path`

Recommended first sub-slice: add a pure scheduling delay resolver and tests for
native input, runtime display-timeframe apply, runtime viewport projection,
target-history disabled, and visible-range validation. Wire it into the bridge
only after the resolver boundary is explicit.

## Boundary

This step added only planning logic, static boundary coverage, documentation,
and TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-leftward-request-scheduling-plan-step325-smoke.js`
- `node v6/tests/high-timeframe-target-history-leftward-request-scheduling-boundary-step325-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-attribution-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-leftward-request-scheduling-closeout-step325-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 326 should add the programmatic leftward request fast-path scheduling
resolver before wiring it into the bridge.
