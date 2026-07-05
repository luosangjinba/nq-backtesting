# V6 Step 33 - Workflow Panel Product Copy And Layout

Date: 2026-07-05

## Scope

Step 33 refined the opened workflow panels so Sessions, Replay, Journal, and
Settings read like product UI instead of developer controls. The step stayed in
the shell/UI boundary and did not add chart, replay, bar-data, viewport, or pane
ownership paths.

## Commits

- `546a9f9 feat(v6): refine workflow panel product copy`
- `3fe49ed test(v6): protect workflow panel layout`

## Implementation Notes

- Added consistent panel copy, metrics, and actions structure across workflow
  panels.
- Replaced development-facing labels such as `Add sample`, `Snapshot none`,
  `Replay not loaded`, and `Wall not loaded` with user-facing copy.
- Updated sessions, replay workflow, and journal surface models so refreshed
  state preserves the new copy.
- Fixed workstation grid rows so visible workflow panels use auto-sized rows
  and cannot take the chart main row.
- Added `v6/tests/workflow-panels-browser-smoke.js` to protect panel titles,
  compact panel height, chart workspace height, and old-copy regressions.

## Verification

- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 34 should add clear active states for top workflow actions and preserve
the same shell/UI-only ownership boundary.
