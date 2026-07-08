# V6 Session - Step 172 Synced Intent Reload Boundary

Date: 2026-07-08

## Completed

Step 172 defined and tested the reload trigger boundary for synced
Symbol/Interval intent changes.

Commits:

- `2384b258 docs(v6): define synced intent reload boundary`
- `4d853f90 feat(v6): add pane intent reload model`

## Changes

- Documented that `pane-intent-sync-runtime` must not request bars directly.
- Selected a future `pane-intent-reload-runtime` as the reload trigger owner.
- Added a pure reload-intent model for pane intent and sync-applied inputs.
- Kept reload-intent records separate from bar-data requests.
- Added smoke coverage that forbids bar-data, chart-data, viewport, replay, and
  chart-engine calls in the reload intent model.

## Verification

- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-sync-boundary-step170-smoke.js`
- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 173 should add the reload trigger runtime skeleton that emits reload-intent
records without making bar-data requests or chart-data writes.
