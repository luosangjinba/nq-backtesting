# V6 Session - Step 185 Pane Maximize / Restore State

Date: 2026-07-08

## Completed

Step 185 added the pane maximize / restore state model.

Commits:

- `1d4bdd5e feat(v6): add pane maximize restore state`
- `a51bdf90 test(v6): cover pane maximize restore in browser`

## Changes

- Added `maximizePane(paneId)` and `restorePane()` to
  `workstation-chart-surface`.
- Added maximize state to chart surface snapshots.
- Preserve and restore the previous layout snapshot while showing one pane.
- Hide pane resize handles while maximized and restore previous pane resize
  ratios afterward.
- Added unit and browser coverage.
- Added the browser smoke to the chart browser regression pack.

## Verification

- `node v6/tests/pane-maximize-state-step185-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 186 should wire maximize/restore buttons into the pane action rail. Keep
the bridge UI-only: buttons call chart surface APIs, while chart data, replay,
bar-data, viewport, and pane runtimes remain unchanged.
