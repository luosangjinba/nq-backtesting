# Step 389 - V5 Chart Overlay Visibility

## Goal

Keep chart navigation controls available without covering the time axis, bottom
chart area, or right price axis across common desktop and low-height viewports.

This step advances Historical Replay Review. It is an overlay/layout step, not
a chart runtime command, replay cursor, or bar-loading change.

## Planned Steps

### Step 389.1 - Plan And Specs

- Add Step 389 to `v5/TODO.md`.
- Update chart interaction specs with overlay visibility requirements.
- Create this session handoff.

Completed:

- Added Step 389 to `v5/TODO.md`.
- Updated `v5/docs/specs/chart-interaction-contracts.md`.
- Created this session handoff.

Status: complete.

### Step 389.2 - Overlay Placement

- Move the chart zoom/pan/reset overlay away from the time axis.
- Preserve right price-axis clearance.
- Preserve existing data selectors and chart command wiring.

Completed:

- Moved `.chart-toolbar` from bottom center to the chart's upper-right area.
- Added right-side clearance from the price axis.
- Reduced button footprint while keeping existing controls and selectors.

Status: complete.

### Step 389.3 - Multi-Viewport Verification

- Add browser smoke coverage for desktop and low-height desktop viewports.
- Assert clearance from top, right price axis, time-axis/bottom area, and
  footer.
- Keep existing chart navigation and workstation layout smoke passing.

Completed:

- Added `chart-overlay-visibility-browser-smoke.js`.
- Added the new smoke to `v5/scripts/smoke_all.js`.
- Ran related checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- The chart zoom/pan/reset controls do not cover the time axis.
- The overlay has clearance from the right price axis.
- The overlay remains visible and usable on desktop and low-height desktop
  viewports.
- Existing zoom/pan/reset commands, native Lightweight interaction, replay
  cursor, and bar-data ownership remain unchanged.

## Checks

- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 389 is complete.
- Recommended next step: Step 390 should add screenshot-level visual acceptance
  across additional viewport sizes and browser zoom/system UI conditions.
