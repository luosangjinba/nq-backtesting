# V6 Step 12 - Single-Pane Default Wall Replay

Date: 2026-07-04

## Scope

Step 12 implemented the first V6 default-wall replay path for a single pane. It
keeps replay data in memory for the visible Next path, uses append/update for
new candles, and verifies the visible chart behavior with the Step 11 latency
harness.

## Completed Commits

- `2d67dfe feat(v6): add default wall replay domain`
- `dd79182 feat(v6): add default wall replay runtime`
- `3387e05 feat(v6): register default wall runtime`
- `9f22053 test(v6): gate default wall replay visibility`
- `91a89ba test(v6): enforce default wall boundaries`

## Implementation Notes

- Added `v6/src/default-wall/default-wall-replay.js` for initial prefix plus
  start bar, forward-buffer advancement, append payloads, and default-wall
  logical range projection.
- Added `v6/src/default-wall/default-wall-runtime.js` as the orchestration
  boundary. It calls replay, chart-data, and chart-viewport commands but does
  not touch DOM, chart engine APIs, bar-data adapters, or network fetch.
- Registered default-wall runtime in the V6 app startup sequence.
- Added a browser smoke that runs on the real V6 page, advances five cached
  Next steps, applies updates through the Lightweight Charts adapter, and
  records visible latency phases.
- The browser smoke asserts no fetch, p95 visible latency under `120ms`, latest
  candle offset fixed at the default wall, and logical range movement of one bar
  per Next.
- Added boundary rules for the default-wall modules.

## Verification

- `node v6/tests/default-wall-replay-domain-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The default-wall browser smoke required local browser-test permissions because
it starts a temporary HTTP server and headless Chrome.

## Next Step

Step 13 should add manual-wall replay: native drag or wheel captures the current
logical offset/span as manual intent, and later Next/Play preserves that wall.
