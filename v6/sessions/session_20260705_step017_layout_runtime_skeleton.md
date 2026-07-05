# V6 Step 17 - Layout Runtime Skeleton

Date: 2026-07-05

## Scope

Step 17 established the first layout ownership boundary for future multi-pane
work. The step added layout mode, a unified pane list, active pane id, and sync
flags without introducing a separate pane class or a hidden chart ownership
path.

## Commits

- `30f73f8 feat(v6): add layout model store`
- `ab02217 feat(v6): add layout runtime`
- `80087de feat(v6): register layout runtime`
- `862219b test(v6): enforce layout boundaries`

## Implementation Notes

- Added `v6/src/layout/layout-model.js` and `v6/src/layout/layout-store.js` as
  pure layout state helpers.
- Added `v6/src/layout/layout-runtime.js` with command/event contracts for
  snapshot, mode, active pane, and sync flag updates.
- Registered `runtime.layout` in the V6 app startup path.
- Reused the existing pane record shape for layout pane entries.
- Added boundary coverage so layout code cannot import chart, data, replay,
  session, shell, V4/vendor, or chart engine modules.

## Verification

- `node v6/tests/layout-model-smoke.js`
- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 18 should mount multiple chart hosts through one lifecycle path and keep
pane-local chart data and viewport intent coordinated by explicit fan-out, not
by a separate catch-up path.
