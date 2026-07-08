# V6 Session - Step 186 Pane Maximize / Restore Control

Date: 2026-07-08

## Completed

Step 186 wired maximize / restore controls into each pane action rail.

Commits:

- `7032a7d6 feat(v6): wire pane maximize restore controls`
- `eca9b1b9 test(v6): cover pane maximize restore controls`

## Changes

- Added `maximize-restore-control-bridge`.
- Added maximize/restore buttons to every pane action rail.
- The button toggles between `Maximize chart` and `Restore chart`.
- Exposed the mounted controls through `root.__v6MaximizeRestoreControl`.
- Kept reset view in the same action rail with existing pane-local routing.
- Added unit and browser coverage, and added the browser smoke to the chart
  browser regression pack.

## Verification

- `node v6/tests/maximize-restore-control-bridge-step186-smoke.js`
- `node v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `node v6/tests/pane-action-rail-browser-step184-smoke.js`
- `node v6/tests/maximize-restore-control-browser-step186-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 187 should add the replay-safe leftward history latency gate. This returns
to the earlier chart foundation requirement: request older history only near
the canvas-left boundary, while replay stays visibly responsive.
