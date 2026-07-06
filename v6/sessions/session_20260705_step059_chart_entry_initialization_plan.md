# V6 Step 59 - Chart Entry Initialization Plan

Date: 2026-07-05

## Summary

Step 59 defined the first chart-entry initialization plan produced from
chart-entry activation.

`runtime.chartEntry` now stores an `initializationPlan` after session create/open
activation. The plan includes active session identity and named future steps:

- `resolve-start-bar`
- `load-bounded-replay-context`
- `load-replay-state`
- `project-default-wall`
- `apply-chart-data-and-viewport`

The plan is intentionally a contract, not execution. Chart-entry still does not
dispatch replay, bar-data, chart-data, chart-viewport, or adapter commands.
Missing-session failures leave the existing plan unchanged.

## Commits

- `cbcacf07 docs(v6): scope step fifty nine init plan`
- `73aaeb18 feat(v6): define chart entry initialization plan`
- `abc9b19d feat(v6): attach initialization plan to chart entry`

## Verification

- `node v6/tests/chart-entry-plan-smoke.js`
- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 60 should introduce the first executable initialization owner for resolving
the start bar and bounded context, still without letting session surface or route
shell load data directly.
