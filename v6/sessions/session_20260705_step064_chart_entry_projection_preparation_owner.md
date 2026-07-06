# V6 Step 64 - Chart Entry Projection Preparation Owner

Date: 2026-07-05

## Summary

Step 64 introduced the first projection-preparation owner after default-wall
planning.

`runtime.chartEntryProjectionPreparation` subscribes to
`chartEntryDefaultWallPlan:planned`, reads the already-loaded bounded context
through `barData.getWindow`, and prepares:

- a chart-data replace payload for the planned pane;
- a viewport intent payload for the default wall position;
- wall-state and source summaries for future owners.

This step still does not write chart data, mutate viewport intent, call
`defaultWall.load`, fetch bars, advance replay, or call chart adapter APIs. App
shell smoke verifies prepared payloads exist while `chartData.getSummary` and
`defaultWall.getState` remain empty.

## Commits

- `2741c2cd docs(v6): scope step sixty four projection prep`
- `d7b50ae7 feat(v6): define chart entry projection preparation`
- `ceade2a4 feat(v6): add chart entry projection preparation runtime`
- `282c287f feat(v6): register chart entry projection preparation runtime`

## Verification

- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 65 should introduce the explicit projection apply owner. It can consume the
prepared payload and dispatch chart-data/viewport commands in a controlled order,
while still keeping chart adapter writes behind the existing chart surface
bridges.
