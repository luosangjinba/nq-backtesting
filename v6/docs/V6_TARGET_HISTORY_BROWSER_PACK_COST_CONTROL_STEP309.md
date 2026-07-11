# V6 Target-History Browser Pack Cost Control - Step 309

## Status

Accepted.

## Outcome

Step 309 added test-only cost controls for the target-history browser
regression pack. The full Step 293 pack remains the default comprehensive
command and still runs all eight target-history browser paths.

The pack now builds its execution plan through
`v6/tests/helpers/target-history-pack-cost-control.js` and logs the selected
plan before running members:

- `TARGET_HISTORY_PACK_GROUP=all` runs the full eight-member pack;
- `TARGET_HISTORY_PACK_GROUP=fallback` runs the four fallback members;
- `TARGET_HISTORY_PACK_GROUP=fixed` runs the fixed-duration readout members;
- `TARGET_HISTORY_PACK_GROUP=session-aware` runs daily, weekly, and monthly
  sizing/fallback members;
- `TARGET_HISTORY_PACK_GROUP=sizing` runs daily, weekly, and monthly sizing
  members;
- `TARGET_HISTORY_PACK_MEMBERS=<comma-separated ids>` overrides the group and
  runs only the named members.

Example targeted run:

```bash
TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js
```

## Boundary

This step changed only browser pack orchestration, runtime reporting, optional
targeted member selection, tests, and documentation.

It did not change replay cursor movement, no-bar gap skipping, chart viewport
intent, chart-engine behavior, chart-history behavior, target-history runtime
behavior, journal, order-ticket, prop-firm, indicator, or seconds behavior.
Replay remains source `1m` driven.

## Verification

- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-browser-pack-cost-control-closeout-step309-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 310 should audit high-timeframe target-history responsiveness now that
fixed, daily, weekly, and monthly success/fallback browser coverage is complete
and the full browser pack can be narrowed during iteration.

Keep Step 310 focused on measurement, report shape, and next-slice selection
unless the audit finds a concrete mismatch that justifies a bounded runtime
change.
