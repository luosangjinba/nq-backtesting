# Session 2026-07-04 - Step 514 Pane Display Coordinator

## Goal

Extract pane display initialization from the chart replay pane orchestrator into
a dedicated coordinator so multi-pane display lifecycle state has a clear
owner before replay projection is rebuilt.

## Plan

1. Document the Step 514 coordinator boundary, lifecycle states, and acceptance
   checks.
2. Add a `chart-replay-pane-display-coordinator` module with pure smoke coverage
   for skip, dedupe, ready, and error states.
3. Wire `chart-replay-pane-orchestrator` through the coordinator, run the Step
   512 rebuild contract and related layout/replay smokes, then update handoff
   docs.

## Ownership Rules

- The coordinator may dispatch layout and replay display-timeframe commands.
- The coordinator must not call Lightweight Charts, write chart series, request
  bar-data directly, or own replay cursor/reveal state.
- Replay pane projection remains Step 515 work.

## Status

- Step 514.1: completed. The rebuild plan now defines coordinator lifecycle,
  command boundaries, and acceptance checks.
- Step 514.2: completed. Added
  `chart-replay-pane-display-coordinator.js` and a pure smoke covering primary
  skip, display-timeframe initialization, duplicate load dedupe, concurrent
  dedupe, ready state, and error state.
- Step 514.3: completed. `chart-replay-pane-orchestrator.js` delegates pane
  initialization and readiness marking to the coordinator.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-display-coordinator.js`
- `node v5/tests/chart-replay-pane-display-coordinator-smoke.js`
- `node v5/tests/multi-pane-rebuild-contract-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

All listed checks passed. Node emitted the repository's existing ES module
package warning for browser/test files.

## Next

Step 515 should rebuild replay pane projection. The target is one shared replay
cursor advance per tick, then pane-targeted projection for every visible pane in
the same logical step.
