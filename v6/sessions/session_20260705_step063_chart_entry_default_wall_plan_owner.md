# V6 Step 63 - Chart Entry Default Wall Plan Owner

Date: 2026-07-05

## Summary

Step 63 introduced the default wall planning owner after replay bootstrap.

`runtime.chartEntryDefaultWallPlan` subscribes to
`chartEntryReplayBootstrap:loaded` and creates a deterministic initial wall plan
from bounded context and replay state. The plan includes session id, cursor
anchor, pane id, prefix bars, visible span, latest offset, replay metadata, and
loaded context summary.

This step deliberately does not call `defaultWall.load`, write chart data,
mutate viewport intent, advance replay, or call chart adapter APIs. App shell
smoke verifies the wall plan exists while `defaultWall.getState` remains empty
and `chartData.getSummary` remains empty.

## Commits

- `2000f87e docs(v6): scope step sixty three wall plan`
- `6f11cc51 feat(v6): define chart entry wall plan`
- `9d261a9e feat(v6): add chart entry wall plan runtime`
- `82aa9359 feat(v6): register chart entry wall plan runtime`

## Verification

- `node v6/tests/chart-entry-default-wall-plan-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/chart-entry-replay-bootstrap-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 64 should introduce the first projection-preparation owner. It can consume
the wall plan and produce chart-data/viewport payloads, but should still avoid
direct adapter writes and keep visible projection behind an explicit owner.
