# V6 Display-Timeframe Target Materialization Readiness Audit - Step 333

## Status

Accepted.

## Outcome

Step 333 implements the read-only
`display-timeframe-target-materialization-readiness-audit`.

New audit helper:

`v6/src/replay/display-timeframe-target-materialization-readiness-audit.js`

New coverage:

- `v6/tests/display-timeframe-target-materialization-readiness-audit-step333-smoke.js`
- `v6/tests/display-timeframe-target-materialization-readiness-boundary-step333-static-smoke.js`

## Finding

The owner surfaces needed by the Step 331 pure handoff plan exist:

- Display-Timeframe Runtime has `displayTimeframe.apply` and a target-history
  branch.
- Bar Data Runtime has target window plan/load owner surfaces.
- Chart Data Runtime has replace and source-bar preservation surfaces.
- Replay Runtime exposes cursor state through its read surface.
- The Step 329 target-bar reveal policy is available.

The audit report resolves to:

- status: `ready`;
- reason: `display-timeframe-target-materialization-owner-surfaces-ready`;
- next slice: `display-timeframe-target-materialization-wiring-plan`.

## Boundary

This step added a pure readiness audit and static source-surface coverage.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart viewport intent, chart-engine behavior, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/display-timeframe-target-materialization-readiness-audit-step333-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-boundary-step333-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-selection-step332-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-boundary-step332-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-closeout-step332-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 334 should define the
`display-timeframe-target-materialization-wiring-plan`: the minimal behavior
wiring plan for display-timeframe target materialization, still without runtime
behavior changes.
