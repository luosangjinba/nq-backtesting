# V6 Step 25 - Journal Persistence Command Bridge

Date: 2026-07-05

## Scope

Step 25 added an explicit opt-in command bridge between journal state and
persistence. Journal modules still do not import persistence internals, and
loading a persisted journal snapshot mutates only journal entries.

## Commits

- `6d79441 feat(v6): allow journal snapshot persistence`
- `104a8e0 feat(v6): add journal persistence bridge`
- `aeb6055 feat(v6): register journal persistence bridge`
- `8797c2a test(v6): enforce journal persistence bridge boundaries`

## Implementation Notes

- Added `journalSnapshots` to the narrow persistence collection allowlist.
- Added `v6/src/journal-persistence/` as a dedicated bridge boundary.
- Added `journalPersistence.saveSnapshot`, `journalPersistence.loadSnapshot`,
  and `journalPersistence.deleteSnapshot` commands.
- The bridge uses dispatchable journal and persistence contracts instead of
  importing journal store or persistence repository internals.
- Loading a snapshot calls `journal.replaceEntries` only. Browser/chart/replay,
  bar-data, viewport, pane, layout, settings, storage, and network state are not
  touched.
- Boundary tests protect the bridge from importing unrelated feature runtimes,
  UI, V4/vendor modules, browser storage, or network APIs.

## Verification

- `node v6/tests/persistence-repository-smoke.js`
- `node v6/tests/persistence-runtime-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 26 should audit the accumulated V6 boundaries and tests before moving into
broader visual polish or workflow UI work.
