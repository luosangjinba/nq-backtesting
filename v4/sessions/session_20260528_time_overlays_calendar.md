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
- Step 89-90: added Inspector Calendar navigator:
  - defaults to the current loaded chart start/end range
  - date click locates the primary chart to selected date 09:30
  - selected date lists Order Setup, SMT, PDA, Segment, Composite, Killzone, and Time Line objects
  - Order Setup dates show a red calendar badge
- Calendar object rows now support chart-first navigation:
  - `Locate` only scrolls/flashes the object time range and does not switch Inspector panels
  - PDA / Segment / Composite rows expose a separate `Open` action for detail panels
  - detail panels opened from Calendar show `Back to Calendar`, preserving selected date and month
- Locate feedback now uses a transient chart flash primitive and guards against empty timestamps being treated as epoch 0.

## Decisions

- Event lines are review marks for a specific chart date/time, not recurring daily schedules.
- Default event-time list is empty. Users must add lines explicitly from the chart.
- `clearEventTimes()` only clears manual event lines and does not reset day boundary, selected date, grid visibility, or future killzone settings.
- Grid visibility is chart display state, separate from Time Overlay Store.
- Killzones are fully manual and do not use built-in presets yet.
- Each killzone binds to a concrete `date + startTime/endTime`.
- Overlapping killzones are not merged; renderer assigns them to stacked top layers so their separate meanings remain visible.
- Calendar is an Inspector navigation surface, not a new persistence owner; it derives rows from existing stores.
- Locate and Open are intentionally separate because most review navigation needs spatial context, not immediate object-detail editing.

## Validation

- `node --check` passed for modified modules during implementation.
- `git diff --check` passed after the latest changes.
- `node --check` passed for Calendar panel, Inspector sidebar, viewport controller, and locate flash primitive during Calendar implementation.
- Browser visual checks are still manual for this step.

## Current Git State

- Last committed work:
  - `0919ed0 feat(v4): separate calendar locate and open`
  - `83e0664 feat(v4): mark calendar order setup days`
  - `1ad867f fix(v4): flash located order setup range`
- Uncommitted changes include:
  - Calendar detail `Back to Calendar` return action
  - TODO/session updates
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

## Next Steps

- Commit current Calendar return action and documentation updates.
- Next likely step: refine Calendar row summaries so rows show useful review fields instead of long ids.
