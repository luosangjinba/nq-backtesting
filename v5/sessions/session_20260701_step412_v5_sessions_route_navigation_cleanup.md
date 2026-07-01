# Step 412 - V5 Sessions Route Navigation Cleanup

Date: 2026-07-01

Status: completed.

## Goal

Move session-selection navigation out of the chart-control toolbar and make the
destination wording clear.

## Plan

1. Move the setup-route link from active chart controls into route-level heading
   navigation.
2. Rename the visible action from `Setup` to `Sessions`.
3. Add minimal route-navigation styling so it reads separately from chart
   controls.
4. Update browser smoke coverage for the new placement and absence from the
   chart toolbar.
5. Update TODO, interaction contracts, and session handoff before commit.

## Implementation

- Added a `data-route-navigation` heading action group on the chart route.
- Moved the setup route link into that group and changed its visible label to
  `Sessions`.
- Removed the old `Setup` button from `[data-chart-navigation-controls]`.
- Added `.panel-heading-actions` and `.route-back-button` styling.
- Updated `replay-workstation-layout-browser-smoke.js` to click the heading
  `Sessions` action, verify it returns to setup, and assert the chart toolbar
  no longer contains a setup-route link.

## Acceptance

- The chart-control toolbar no longer contains `Setup`.
- The chart heading exposes `Sessions` as route-level navigation.
- Clicking `Sessions` returns to the session selection/creation route.
- Replay cursor, display bars, bar-data windows, and chart runtime ownership are
  unchanged.

## Checks

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue single-pane polish before layout split panes. Setup route visual
cleanup and chart settings surface refinement remain good next candidates.
