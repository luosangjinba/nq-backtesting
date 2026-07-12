# V6 Target Materialization Replay Diagnostics Contract - Step 341

## Status

Accepted.

## Outcome

Step 341 defines the read-only diagnostics/readout owner contract for
materialized replay coordination.

New contract:

- `v6/src/replay/target-materialization-replay-diagnostics-contract.js`

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-boundary-step341-static-smoke.js`

## Owner Boundary

Owner:

`target-materialization-replay-diagnostics-contract`

The contract defines read-only fields for:

- display apply status;
- target-history status and reason;
- projection owner;
- manual next status;
- autoplay status;
- fallback status;
- source cursor time and authority;
- target-bars-display-input-only state;
- latest source/display timestamps.

Shell consumption is documented as `command-event-diagnostic-snapshot`.
Shell must read diagnostics snapshots and must not call target APIs, mutate
replay cursor state, or write chart series.

## Boundary

This is a read-only contract step. Runtime command wiring is not ready,
runtime behavior is unchanged, and write readiness remains false.

Replay remains source `1m` driven. Target bars remain display materialization
inputs only. Target-history request sizing and chart-history fast-path behavior
remain unchanged.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-boundary-step341-static-smoke.js`
- `node v6/tests/target-timeframe-materialization-post-pack-closeout-step340-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 342 should implement the smallest diagnostics runtime state surface behind
the Step 341 contract. It should expose a read-only diagnostic snapshot command
or event path, still without changing replay cursor movement, target-bar
loading, request sizing, or shell target API access.
