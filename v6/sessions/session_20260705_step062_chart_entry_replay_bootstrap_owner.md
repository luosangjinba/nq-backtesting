# V6 Step 62 - Chart Entry Replay Bootstrap Owner

Date: 2026-07-05

## Summary

Step 62 introduced the replay bootstrap owner after bounded context load.

`runtime.chartEntryReplayBootstrap` subscribes to `chartEntryContext:loaded`,
reads the session through `session.getById`, and calls `replay.loadSession`.
It exposes bootstrap state through `chartEntryReplayBootstrap.getState` and emits
`chartEntryReplayBootstrap:loaded`.

This makes replay state ready after entering a chart, but it still does not
advance playback, write chart data, mutate viewport intent, project default
walls, or call chart adapter APIs. The app shell smoke now verifies that replay
is ready while `chartData.getSummary` remains empty.

## Commits

- `c868f975 docs(v6): scope step sixty two replay bootstrap`
- `7ae20b36 feat(v6): add chart entry replay bootstrap runtime`
- `3b4adbe0 feat(v6): register chart entry replay bootstrap runtime`

## Verification

- `node v6/tests/chart-entry-replay-bootstrap-runtime-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 63 should introduce the first explicit projection owner after replay
bootstrap. A good next boundary is a default-wall bootstrap plan that decides
which loaded context bars become initially visible, while keeping chart-data and
viewport writes isolated behind their own explicit owner or delayed until the
following step.
