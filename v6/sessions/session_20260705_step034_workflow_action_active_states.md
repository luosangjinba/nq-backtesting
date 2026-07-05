# V6 Step 34 - Workflow Action Active States

Date: 2026-07-05

## Scope

Step 34 made the top workflow action buttons communicate open state through a
shared shell-owned helper. The step stayed in UI/controller code and did not add
chart, replay, bar-data, viewport, pane, or feature-runtime ownership paths.

## Commits

- `1b2f788 feat(v6): add workflow action active states`
- `661ce3a test(v6): cover workflow action state helper`

## Implementation Notes

- Added `v6/src/shell/workflow-action-state.js`.
- Updated Sessions, Replay, Journal, and Settings panel controllers to use the
  shared active-state helper.
- Added `aria-controls` and `aria-pressed` to the top workflow actions.
- Added `id` attributes to workflow panels so actions point at their controlled
  panels.
- Added a restrained active button style that marks the open workflow without
  competing with the chart workspace.
- Extended `v6/tests/workflow-panels-browser-smoke.js` to check active class,
  active data state, `aria-expanded`, `aria-pressed`, and `aria-controls`.
- Added `v6/tests/workflow-action-state-smoke.js` for focused helper coverage.

## Verification

- `node v6/tests/workflow-action-state-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 35 should add consistent close behavior for workflow panels while keeping
the ownership in shell UI controllers.
