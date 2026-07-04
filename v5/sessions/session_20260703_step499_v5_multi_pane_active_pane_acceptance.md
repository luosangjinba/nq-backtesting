# Step 499 - Multi-Pane Active Pane Acceptance

Date: 2026-07-03

## Plan

1. Keep the step focused on multi-pane acceptance, not a new layout system.
2. Preserve V5 ownership: route UI dispatches commands, chart runtime owns
   visible ranges and chart writes, layout runtime owns active pane state, and
   replay/bar-data remain the only replay/data owners.
3. Make shared pane-local navigation controls target the active pane.
4. Prevent interactive controls/popovers embedded in pane DOM from accidentally
   changing the active pane through event bubbling.
5. Add browser coverage for active-pane TF, Go to, Jump cursor, and pane-local
   reset behavior.

## Changes

- `chart.goToTime`, `chart.zoomVisibleRange`, and `chart.panVisibleRange` now
  derive ranges from the target pane state when a `paneId` is supplied.
- Route Go to and Jump cursor pass the current active pane id.
- Pane shell selection ignores buttons, form controls, popovers, and dialogs so
  clicking primary-hosted controls cannot reselect `primary`.
- Added `v5/tests/multi-pane-active-pane-browser-smoke.js`.
- Extended pane-local viewport smoke coverage for pane-targeted Go to and
  resume follow.
- Updated layout/workstation specs, TODO, and session handoff.

## Verification

- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `git diff --check`

## Next

- Step 500 should continue multi-pane hardening with viewport-demand and
  left-extension acceptance after pane-local TF changes, then decide whether to
  polish split resize handles or return to remaining Settings controls.
