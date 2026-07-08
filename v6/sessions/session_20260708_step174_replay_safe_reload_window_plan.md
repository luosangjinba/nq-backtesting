# V6 Session - Step 174 Replay-Safe Reload Window Planning

Date: 2026-07-08

## Completed

Step 174 added pure replay-safe reload window planning for pane
Symbol/Interval reload intents.

Commits:

- `cc7877d5 feat(v6): add replay safe reload window planning`

## Changes

- Added `pane-intent-reload-window-plan` as a pure planner.
- Converts reload-intent records into pane-scoped backward bar windows.
- Caps planned windows at replay `cursorTime` or a compatible cursor timestamp.
- Marks planned windows with `requestCap: replay-cursor` and `noFuture: true`.
- Added smoke coverage that guards against bar-data load commands, chart-data
  writes, viewport projection, runtime registration, network access, and chart
  series writes.

## Verification

- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 175 should add a reload window planning runtime handoff that listens for
reload-intent events, reads replay state through the replay owner, and records
the planned windows without making actual bar-data requests.
