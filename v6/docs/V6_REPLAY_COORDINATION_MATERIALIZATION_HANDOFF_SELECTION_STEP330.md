# V6 Replay Coordination Materialization Runtime Handoff Slice Selection - Step 330

## Status

Accepted.

## Outcome

Step 330 selects the first bounded runtime handoff slice for replay
coordination materialization:

`replay-coordination-materialization-pure-handoff-plan`

New selection helper:

`v6/src/replay/replay-coordination-materialization-handoff-slice-selection.js`

New coverage:

- `v6/tests/replay-coordination-materialization-handoff-slice-selection-step330-smoke.js`
- `v6/tests/replay-coordination-materialization-handoff-boundary-step330-static-smoke.js`

## Decision

The Step 329 owner contract is ready, but the next safe move is still not
runtime wiring. The first handoff slice should be a pure plan that maps display
materialization intent to existing owner surfaces before any runtime starts
dispatching new materialization behavior.

Selected next slice:

`replay-coordination-materialization-pure-handoff-plan`

Reason:

- source `1m` replay cursor remains the authority;
- target bars may be display materialization inputs only;
- Chart Data Runtime owns no-future filtering;
- Bar Data Runtime owns target bar cache/load ownership;
- Chart History remains request coordination only;
- target-history request sizing remains unchanged;
- chart-history fast path remains unchanged;
- the selection step must not add runtime wiring.

## Boundary

This step added a pure handoff slice selector, boundary smoke, documentation,
and TODO/index/handoff updates.

It did not change replay cursor movement, no-bar gap skipping, bar-data
requests, chart-data projection, chart-history runtime loading, target-history
request sizing, chart viewport intent, chart-engine behavior, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/replay-coordination-materialization-handoff-slice-selection-step330-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-boundary-step330-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-closeout-step329-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 331 should define the
`replay-coordination-materialization-pure-handoff-plan`: the exact read-only
mapping from display materialization intent to existing bar-data and chart-data
owner command surfaces, still without runtime wiring.
