# V6 Target-Timeframe Materialization Next Slice Selection - Step 338

## Status

Accepted.

## Outcome

Step 338 re-selects the next bounded target-timeframe materialization slice
after display apply, manual next, autoplay, fallback, and source-cursor append
filtering are covered.

New selection helper:

- `v6/src/replay/target-timeframe-materialization-next-slice-selection.js`

New coverage:

- `v6/tests/target-timeframe-materialization-next-slice-selection-step338-smoke.js`
- `v6/tests/target-timeframe-materialization-next-slice-boundary-step338-static-smoke.js`

## Decision

Selected next slice:

`target-history-pack-replay-coordination-member`

Reason:

- Step 336 covers browser-visible `8h`, `1D`, and `1W` display target
  materialization;
- Step 337 covers manual next, autoplay, source `1m` no-bar gap skipping, and
  target-data-missing fallback while `8h` target materialization is active;
- Step 309 pack member controls already allow focused browser pack runs;
- the next safest slice is to integrate the Step 337 browser coordination smoke
  into the target-history browser regression pack before broader runtime
  materialization changes.

## Boundary

This is a pure selection step. It does not change target-history request sizing,
chart-history fast-path scheduling, replay cursor movement, no-bar gap
skipping, chart viewport intent, chart-engine APIs, shell behavior, journal,
order-ticket, prop-firm, indicator, or seconds behavior.

Replay remains source `1m` driven. Target bars remain display materialization
inputs only.

## Verification

- `node v6/tests/target-timeframe-materialization-next-slice-selection-step338-smoke.js`
- `node v6/tests/target-timeframe-materialization-next-slice-boundary-step338-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-replay-coordination-closeout-step337-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 339 should add the Step 337 replay coordination browser smoke as a focused
member of the target-history browser regression pack. The default full pack
should remain available, existing pack groups should keep their current member
sets unless intentionally extended, and `TARGET_HISTORY_PACK_MEMBERS` should be
able to run the new replay coordination member directly.
