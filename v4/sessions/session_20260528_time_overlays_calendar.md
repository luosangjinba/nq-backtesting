# V4 Session - 2026-05-28 Time Overlays / Calendar Navigator

## Context

- Branch: `feature/chart-first-order-setup`
- Phase: Phase 9 Time Overlays / Calendar Review Navigator
- Goal: add chart-level time helpers for manual review without mutating PDA, Segment, SMT, or Order Review records.

## Completed

- Step 84: documented Phase 9 boundaries and data ownership.
- Step 85: added shared time coordinate helper for exact timestamps and intra-bar interpolation.
- Step 86: added session-scoped Time Overlay Store.
- Step 87: added Time Marker primitive/renderer for day boundaries and event time lines.
- Changed event time behavior from default global presets to manual-only event lines.
- Event time lines now bind to exact `date + time`; adding a line on one day no longer draws the same time on every loaded day.
- Right-click menu `Time Overlays` now supports:
  - add current bar date/time line
  - delete current bar date/time line
  - clear all manual time lines
- Added toolbar `Grid` toggle to show/hide the original LightweightCharts background grid on both primary and secondary charts.
- Time marker style adjusted to be thicker but lower opacity.
- Step 88: added `KillzoneBandPrimitive`, rendered as top-of-canvas bands independent of price coordinates.
- Right-click menu `Time Overlays` now supports multi-killzone Start/End creation, free-form naming, rename, delete, and clear actions.

## Decisions

- Event lines are review marks for a specific chart date/time, not recurring daily schedules.
- Default event-time list is empty. Users must add lines explicitly from the chart.
- `clearEventTimes()` only clears manual event lines and does not reset day boundary, selected date, grid visibility, or future killzone settings.
- Grid visibility is chart display state, separate from Time Overlay Store.
- Killzones are fully manual and do not use built-in presets yet.
- Each killzone binds to a concrete `date + startTime/endTime`.
- Overlapping killzones are not merged; renderer assigns them to stacked top layers so their separate meanings remain visible.

## Validation

- `node --check` passed for modified modules during implementation.
- `git diff --check` passed after the latest changes.
- Browser visual checks are still manual for this step.

## Current Git State

- Last committed work:
  - `1491c04 feat(v4): add manual time overlays controls`
  - `2d14105 feat(v4): make time markers manual`
  - `eb0a738 feat(v4): render time overlay markers`
- Uncommitted changes include:
  - multi-killzone store refactor
  - layered killzone renderer for overlaps
  - Start/End create, rename, delete, and clear killzones from chart context menu
  - TODO/session updates
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

## Next Steps

- Commit current Phase 9 interaction updates when visually accepted.
- Continue with Step 89-94: calendar jump, calendar index, day details, object locate, monthly badge view, and selectedDate overlay linkage.
