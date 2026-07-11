# V6 Replay Coordination Materialization Runtime Wiring Slice Selection - Step 332

## Status

Accepted.

## Outcome

Step 332 selects the first bounded runtime wiring slice:

`display-timeframe-target-materialization-readiness-audit`

New selection helper:

`v6/src/replay/replay-coordination-materialization-runtime-wiring-selection.js`

New coverage:

- `v6/tests/replay-coordination-materialization-runtime-wiring-selection-step332-smoke.js`
- `v6/tests/replay-coordination-materialization-runtime-wiring-boundary-step332-static-smoke.js`

## Decision

The Step 331 pure handoff plan is accepted, but behavior wiring should still not
start until the first wiring point is audited in read-only form.

Selected next slice:

`display-timeframe-target-materialization-readiness-audit`

Reason:

- the future wiring point is `display-timeframe-target-materialization-handoff`;
- the owner remains `display-timeframe-runtime`;
- target bar plan/load and chart-data replace owner surfaces are planned;
- source `1m` replay cursor authority remains explicit;
- the Step 329 target-bar reveal policy remains covered;
- target-history request sizing remains unchanged;
- chart-history fast path remains unchanged;
- the selection step does not add runtime wiring.

## Boundary

This step added a pure runtime wiring slice selector, static boundary coverage,
documentation, and TODO/index/handoff updates.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart viewport intent, chart-engine behavior, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/replay-coordination-materialization-runtime-wiring-selection-step332-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-boundary-step332-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-boundary-step331-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-closeout-step331-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 333 should implement the read-only
`display-timeframe-target-materialization-readiness-audit`: inspect the existing
display-timeframe, bar-data, chart-data, and replay cursor owner surfaces and
report whether runtime wiring can begin. It should still avoid behavior wiring.
