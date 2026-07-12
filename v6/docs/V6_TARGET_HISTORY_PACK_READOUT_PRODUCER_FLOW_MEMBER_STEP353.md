# V6 Target History Pack Readout Producer Flow Member Step 353

## Status

Accepted.

## Outcome

Step 353 adds the Step 352 materialization diagnostics readout producer-flow
browser smoke as an optional focused member of the target-history diagnostics
regression pack.

The new member id is:

- `readout-producer-flow`

It maps to:

- `v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`

The default target-history pack remains unchanged at eight members. The existing
optional `replay-coordination` member remains available and is not replaced.

## Usage

Run only this focused member:

```bash
TARGET_HISTORY_PACK_MEMBERS=readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js
```

Run it together with the existing replay coordination optional member:

```bash
TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js
```

## Boundary

This step only changes pack selection metadata and pack selection tests:

- no default pack membership changes;
- no Step 352 standalone browser smoke changes;
- no direct `updateSnapshot` use introduced into producer-flow browser coverage;
- no shell target-bar API calls;
- no producer runtime changes;
- no replay cursor, target loading, chart-data, viewport, request sizing, or
  chart-history fast-path behavior changes.

## Coverage

- `v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`

## Verification

- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 354 should verify the optional pack-member combination path, especially
`TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow`, and
then decide whether the diagnostics/readout chain is sufficiently packaged to
move from observability work back to the next target-materialization foundation
slice.
