# V6 Symbol/Interval Sync Runtime - Step 170

Date: 2026-07-08

## Boundary

Step 170 adds the dedicated Symbol/Interval sync runtime skeleton.

The runtime listens to:

- layout sync state changes;
- pane Symbol intent changes;
- pane Interval intent changes.

It creates sync plans for visible target panes and emits
`paneIntentSync:planned`, but it does not mutate target panes, request bars,
replace chart-data, project viewport, or touch replay state.

## Runtime API

Command:

- `paneIntentSync.getState`

Event:

- `paneIntentSync:planned`

## Ownership

- `pane-intent-sync-model` is pure plan calculation.
- `pane-intent-sync-runtime` owns sync planning and state.
- Pane runtime still owns pane-local Symbol/Interval intent.
- Layout runtime still owns sync toggle state.
- Bar-data, chart-data, chart-viewport, chart-engine, and replay ownership is
  unchanged.

## Verification

- `node v6/tests/pane-intent-sync-model-step170-smoke.js`
- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/pane-intent-sync-boundary-step170-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 171 can implement tested intent fan-out to target panes while still avoiding
bar reloads, chart-data writes, viewport projection, and replay mutation.
