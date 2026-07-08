# V6 Session - Step 166 Layout Sync Effects

Date: 2026-07-08

## Completed

Step 166 connected selected layout sync toggles to bounded chart-only effects.

Commits:

- `2b86013c feat(v6): add layout sync effect model`
- `16fddba3 feat(v6): sync layout visible ranges`

## Changes

- Added a pure layout sync effect model.
- Marked `crosshair`, `time`, and `dateRange` as chart-only sync keys.
- Added a layout sync surface bridge for visible logical range sync.
- Wired the bridge into V6 app startup.
- Kept date-range/time sync inside chart surface viewport projection.
- Added Node and browser smoke coverage for the sync path.

## Verification

- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/layout-sync-visible-range-browser-step166-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-resize-drag-browser-step165-smoke.js`
- `git diff --check`

## Next

Step 167 should connect the Crosshair sync toggle as a chart-only effect.
