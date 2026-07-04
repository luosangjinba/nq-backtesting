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
- Step 514.2: in progress. The coordinator module and pure lifecycle smoke are
  being added before production integration.
- Step 514.3: pending.
