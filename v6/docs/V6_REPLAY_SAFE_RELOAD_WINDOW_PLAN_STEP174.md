# V6 Replay-Safe Reload Window Planning - Step 174

Date: 2026-07-08

## Boundary

Step 174 converts pane reload-intent records into replay-safe bar-data window
plans.

The planner accepts:

- a reload-intent record from `pane-intent-reload`;
- the current replay state;
- an optional bounded bar count.

It returns a pane-scoped planning record with a backward bar window capped at
the current replay cursor.

## Ownership

- `pane-intent-reload-window-plan` is a pure planner.
- It uses the existing bar-data window domain helper to shape a bounded window.
- It does not dispatch commands, register runtime handlers, request bars, write
  chart-data, project viewport state, or mutate replay state.
- Replay state remains the source of the no-future cursor cap.
- Bar-data runtime remains the only owner that may later request/cache this
  planned window.

## No-Future Rule

Reload window plans always use the replay cursor as the anchor and plan
backward from that point. The returned window includes `requestCap:
replay-cursor` and `noFuture: true`.

That means a Symbol/Interval reload can prepare the window it needs without
loading candles after the replay cursor.

## Non-Goals

This step does not:

- call `BAR_DATA_COMMANDS.LOAD_WINDOW`;
- call chart-data commands;
- call chart-viewport projection commands;
- register a reload planning runtime;
- write chart series;
- mutate replay cursor or reveal state.

## Verification

- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 175 should add the runtime handoff that listens for reload-intent records,
reads replay state through the replay owner, and emits/stores replay-safe window
plans without yet calling the bar-data load command.
