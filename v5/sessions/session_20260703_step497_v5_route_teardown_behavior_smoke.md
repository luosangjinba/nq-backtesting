# Step 497 - Route Teardown Behavior Smoke

Date: 2026-07-03

## Plan

1. Add a browser smoke that enters a real chart route and creates route-local
   controller state.
2. Trigger route teardown by navigating back to setup.
3. Dispatch stale events against detached chart-route elements and assert no
   stale listener/timer mutates layout, replay, playback, or route state.
4. Update lifecycle docs, TODO, and session handoff.

## Changes

- Added `v5/tests/route-teardown-browser-smoke.js`.
- The smoke opens Layout and Settings, renders a split-pane handle, queues rapid
  replay Next clicks, navigates to setup, then sends click/change/pointer/resize
  events to detached chart-route elements.
- The smoke asserts stale Layout controls do not change layout state.
- The smoke asserts stale Next/Play controls and pending Next batching do not
  change replay cursor/display state or restart playback.
- The smoke asserts the setup route remains active and no uncaught browser
  errors are emitted.
- Updated lifecycle audit/spec, `v5/TODO.md`, static lifecycle smoke, and
  session handoff.

## Verification

- `node v5/tests/route-teardown-browser-smoke.js`
- `node v5/tests/lifecycle-cleanup-static-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `git diff --check`

## Next

- Step 498 can return to product/UI work now that the current lifecycle cleanup
  backlog is closed. Likely candidates are Settings polish or multi-pane UX
  acceptance.
