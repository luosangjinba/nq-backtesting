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
- Calendar locate now also applies to the secondary split-screen chart:
  - Inspector Calendar selected-date locate triggers secondary chart locate/flash when Split data is available
  - Calendar object `Locate` triggers secondary chart locate/flash for the same time range
- Time overlay display now covers both charts:
  - `Days` / day-boundary markers, manual Time Lines, and Killzone primitives render on the secondary chart after secondary bars load
  - `time-overlays:changed` redraws primary and secondary overlays together
  - secondary overlay primitives are cleared when secondary bars are cleared or the secondary chart resets
- `Grid` remains shared chart display state and continues to apply to both primary and secondary charts.
- Step 94 selected-date overlay filtering:
  - clicking an Inspector Calendar date writes `timeOverlaySettings.selectedDate`
  - manual Time Lines and Killzones then render only for that natural date
  - Days/day-boundary markers remain visible for all loaded dates so first date-switch after load does not hide the other day separator lines
  - Calendar shows the active overlay filter and exposes `All loaded days` to clear `selectedDate`
  - object-level `Locate` intentionally does not change `selectedDate`

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
- Split Screen is still readonly, but global navigation and display helpers should stay visually consistent across primary and secondary charts when secondary data exists.
- Calendar date selection is the only automatic owner of Time Overlay `selectedDate`; locating a specific object is navigation, not a request to change overlay filtering.
- Review data storage should stay layered:
  - localStorage is the near-term browser work draft
  - Review JSON/YAML remains the human-readable archive and exchange format while schemas keep changing
  - DuckDB should be added later as the formal research database after Order Setup / PDA / Segment / Composite / SMT / Reaction Evidence boundaries stabilize
  - YAML/JSON should continue as portable case files and migration/backup format even after DuckDB exists

## Validation

- `node --check` passed for modified modules during implementation.
- `git diff --check` passed after the latest changes.
- `node --check` passed for Calendar panel, Inspector sidebar, viewport controller, and locate flash primitive during Calendar implementation.
- `node --check` passed for:
  - `v4/src/chart/secondary-viewport-controller.js`
  - `v4/src/time-overlays/time-overlay-renderer.js`
  - `v4/src/ui/inspector-sidebar.js`
- Headless Chrome smoke verified secondary locate moves the secondary logical range to include the target bar after the new secondary locate/flash path.
- Headless Chrome smoke verified Calendar selected-date writes `selectedDate=2012-01-10`, shows the overlay filter state, and `All loaded days` clears it back to all loaded days.
- Full visual acceptance across all requested timeframes remains part of Step 95.

## Current Git State

- Last committed work:
  - `ba516b3 feat(v4): filter overlays by calendar date`
  - `511e7c2 docs(v4): update calendar secondary sync handoff`
  - `e2a9cb9 fix(v4): sync inspector calendar and overlays to secondary chart`
- Current uncommitted changes:
  - storage architecture TODO/session notes
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

## Next Steps

- Run Step 95 visual acceptance across 1M/5M/15M/1H/4H with Split Screen enabled.
- After Step 95, consider drafting a future DuckDB research-store phase only after the current review object schemas stop changing weekly.
