# V6 Target-History Pack Replay Coordination Member - Step 339

## Status

Accepted.

## Outcome

Step 339 adds the Step 337 replay coordination browser smoke as a focused
optional member of the target-history browser regression pack.

Changed files:

- `v6/tests/helpers/target-history-pack-cost-control.js`
- `v6/tests/target-history-pack-cost-control-step309-smoke.js`

New coverage:

- `v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`

## Pack Member

New optional member:

`replay-coordination`

Script:

`v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`

Focused command:

`TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

## Boundary

The new member is optional so the default target-history pack remains the
existing eight-member browser pack. Existing groups such as `fallback`,
`session-aware`, and `sizing` keep their current member sets.

This step changes test harness membership only. It does not change replay cursor
movement, no-bar gap skipping, target-history request sizing, chart-history
fast-path scheduling, chart viewport intent, chart-engine APIs, shell behavior,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

Replay remains source `1m` driven. Target bars remain display materialization
inputs only.

## Verification

- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-browser-pack-cost-control-closeout-step309-static-smoke.js`
- `node v6/tests/target-timeframe-materialization-next-slice-closeout-step338-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 340 should re-select the next target-timeframe materialization slice after
pack member integration. Good candidates are a diagnostics/readout integration
slice for materialized replay coordination, or a narrow runtime handoff only if
pack coverage and rollback criteria remain explicit.
