# V6 Step 36 - Workflow Panel Mutual Exclusivity

Date: 2026-07-05

## Scope

Step 36 added shell-owned mutual exclusivity for workflow panels. Opening one
workflow panel now closes the other workflow panels and clears their top-action
active states.

## Commits

- `618f2b6 feat(v6): coordinate workflow panel exclusivity`
- `d7a99dd test(v6): cover workflow panel coordinator`

## Implementation Notes

- Added `v6/src/shell/workflow-panel-coordinator.js`.
- Mounted the coordinator in `v6/src/app.js` after shell controllers are
  created.
- Added optional `onOpen` callbacks to Sessions, Replay, Journal, and Settings
  controllers.
- Extended `v6/tests/workflow-panels-browser-smoke.js` to verify that only the
  most recently opened workflow panel remains open and active.
- Added `v6/tests/workflow-panel-coordinator-smoke.js` for focused coordinator
  coverage.
- Kept coordination through shell controller public APIs only: `setOpen(false)`.

## Verification

- `node v6/tests/workflow-panel-coordinator-smoke.js`
- `node v6/tests/workflow-panel-close-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 37 should audit the workflow shell changes from Steps 32-36 before adding
more UI behavior.
