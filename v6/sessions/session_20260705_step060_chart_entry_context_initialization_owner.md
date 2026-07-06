# V6 Step 60 - Chart Entry Context Initialization Owner

Date: 2026-07-05

## Summary

Step 60 introduced the first executable initialization owner after chart-entry
activation.

`runtime.chartEntryInitialization` subscribes to chart-entry activation, reads
session metadata through `session.getById`, and prepares a start-bar plus
bounded-context plan. The plan includes:

- the start-bar anchor from session `startTime`;
- a bounded backward context window for prefix plus start-bar coverage;
- the planned bar-data window produced by `barData.planWindow`.

This step does not call `barData.loadWindow`, replay load, chart-data writes,
viewport mutation, or adapter APIs. It only prepares input that later data owners
can execute.

## Commits

- `43caa27f docs(v6): scope step sixty context initialization`
- `53c05106 feat(v6): define chart entry context plan`
- `91f38936 feat(v6): add chart entry initialization runtime`
- `f2b607de feat(v6): register chart entry initialization runtime`

## Verification

- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 61 should introduce the bounded context load owner. It can consume the
planned window and call `barData.loadWindow`, but still must keep replay load,
chart-data writes, viewport mutation, and adapter writes out of session surface
and route shell.
