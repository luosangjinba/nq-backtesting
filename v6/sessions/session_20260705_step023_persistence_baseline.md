# V6 Step 23 - Persistence Baseline

Date: 2026-07-05

## Scope

Step 23 established the first V6 persistence boundary. Persistence is opt-in:
feature runtimes do not persist themselves through side effects, and persisted
records are not restored into chart, replay, data, viewport, pane, layout, or
settings state.

## Commits

- `7046048 feat(v6): add persistence repository`
- `3b8dcbf feat(v6): add persistence runtime`
- `6cde633 feat(v6): register persistence runtime`
- `7c6ef9c test(v6): enforce persistence boundaries`

## Implementation Notes

- Added `v6/src/persistence/` with record normalization, memory adapter, web
  storage adapter, repository, and runtime.
- Persistence writes are explicit `persistence.*` commands.
- Persistence runtime emits only persistence events and does not subscribe to
  feature runtime events.
- Allowed persistence collections are narrow metadata collections:
  `recentSessions`, `userNotes`, and `workspaceDrafts`.
- Boundary tests prevent persistence modules from importing feature runtimes or
  owning chart/replay/data/viewport state.

## Verification

- `node v6/tests/persistence-repository-smoke.js`
- `node v6/tests/persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 24 should define the first journal/orders/analytics boundary without
coupling analytics to live feature runtime internals.
