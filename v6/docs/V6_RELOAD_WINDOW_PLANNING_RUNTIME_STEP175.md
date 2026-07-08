# V6 Reload Window Planning Runtime - Step 175

Date: 2026-07-08

## Boundary

Step 175 adds the runtime handoff from pane reload-intent events to
replay-safe reload window plans.

The runtime listens to `paneIntentReload:intentCreated`, reads replay state
through `REPLAY_COMMANDS.GET_STATE`, converts the records with the Step 174 pure
planner, stores the latest plans, and emits `paneIntentReloadPlan:planned`.

## Ownership

- `pane-intent-reload-runtime` still owns reload-intent emission only.
- `pane-intent-reload-window-plan` still owns pure replay-safe planning.
- `pane-intent-reload-window-runtime` owns the handoff from reload-intent events
  to planned reload windows.
- Replay runtime remains the only source for replay cursor state.
- Bar-data runtime remains the only owner that may later request/cache planned
  windows.

## Contract

New contract surface:

- `paneIntentReloadPlan.getState`
- `paneIntentReloadPlan:planned`

The planned event payload is an array of pane-scoped records with `noFuture:
true` and a backward bar window capped with `requestCap: replay-cursor`.

## Non-Goals

This step does not:

- call `BAR_DATA_COMMANDS.LOAD_WINDOW`;
- request or cache bars;
- call chart-data commands;
- call chart-viewport projection commands;
- write chart series;
- mutate replay cursor or reveal state.

## Verification

- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 176 should define the next owner boundary for consuming planned reload
windows through bar-data runtime. That step should still keep chart-data writes
and viewport projection separate unless an explicit follow-up boundary is
accepted.
