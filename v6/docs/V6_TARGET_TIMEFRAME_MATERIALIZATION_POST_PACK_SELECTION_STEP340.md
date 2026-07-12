# V6 Target-Timeframe Materialization Post-Pack Selection - Step 340

## Status

Accepted.

## Outcome

Step 340 re-selects the next bounded target-timeframe materialization slice
after the replay coordination browser smoke became a focused pack member.

New selection helper:

- `v6/src/replay/target-timeframe-materialization-post-pack-selection.js`

New coverage:

- `v6/tests/target-timeframe-materialization-post-pack-selection-step340-smoke.js`
- `v6/tests/target-timeframe-materialization-post-pack-boundary-step340-static-smoke.js`

## Decision

Selected next slice:

`target-materialization-replay-coordination-diagnostics-readout`

Reason:

- display target materialization is browser-covered;
- replay coordination is browser-covered;
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination` runs the Step 337 browser
  smoke directly;
- the default eight-member target-history pack remains preserved;
- diagnostics/readout integration is a safer next slice before any runtime
  handoff.

## Boundary

This is a pure selection step. It does not change replay cursor movement,
no-bar gap skipping, target-history request sizing, chart-history fast-path
scheduling, chart viewport intent, chart-engine APIs, shell behavior, journal,
order-ticket, prop-firm, indicator, or seconds behavior.

Replay remains source `1m` driven. Target bars remain display materialization
inputs only. A narrow runtime handoff remains deferred until diagnostics/readout
ownership is explicit.

## Verification

- `node v6/tests/target-timeframe-materialization-post-pack-selection-step340-smoke.js`
- `node v6/tests/target-timeframe-materialization-post-pack-boundary-step340-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-closeout-step339-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 341 should define the diagnostics/readout owner contract for materialized
replay coordination. It should decide what read-only fields are exposed, which
runtime owns the state, and how shell reads it, without changing replay cursor
movement or target-bar loading behavior.
