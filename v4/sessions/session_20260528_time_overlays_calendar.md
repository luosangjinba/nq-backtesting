# V4 Session - 2026-05-28 Time Overlays / Calendar Navigator

## Context

- Branch: `feature/secondary-chart-annotation-workflow`
- Phase: Phase 10 Secondary Chart Annotation Workflow
- Goal: prepare secondary chart PDA/segment operations without regressing the existing readonly split-screen behavior.

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
- Split Replay high-timeframe secondary chart now uses progressive candles:
  - when Replay is on and secondary timeframe is above 1M, the secondary controller also loads 1M bars for the secondary instrument
  - completed secondary HTF candles still use the normal secondary bars
  - the current unfinished HTF candle is aggregated from 1M bars up to the primary replay cursor
  - this prevents a 1M primary replay at 07:13 from revealing the full 07:00-07:59 secondary 1H candle
- Phase 10 Step 118 chart context boundary:
  - added `v4/src/chart/chart-context.js`
  - exposes primary and secondary context descriptors with chart/series access, display bars, all bars, timeframe, coordinate conversion, primitive attach/clear, and basic event subscription hooks
  - primary context remains the writable default surface
  - secondary context is explicitly marked `readonly=true` as a foundation for future opt-in write actions
- Phase 10 Step 119 PDA action extraction:
  - added `v4/src/pda/manual-pda-actions.js`
  - moved PDA creation logic for BSL/SSL, FVG/IFVG, Wick CE, range PDA, and Fib into context-aware action helpers
  - `manual-annotation.js` now calls those helpers with `getPrimaryChartContext()`, so the current right-click workflow still targets the primary chart only
  - range/Fib selection state and context-menu ownership remain in `manual-annotation.js`

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
- In Replay mode, a higher-timeframe secondary candle must not reveal future intrabar prices. Use lower-timeframe replay source bars to build a partial current candle whenever the secondary timeframe is higher than 1M.
- Secondary chart PDA/segment work should start by making chart ownership explicit. Existing modules should keep primary chart behavior until they are intentionally converted to accept a chart context.
- Step 118 is an architecture boundary only; it should not wire new context into user workflows yet.
- Step 119 keeps user-visible write behavior on the primary chart. Secondary chart creation must still wait for a dedicated secondary context menu and explicit enablement.
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
  - `v4/src/chart/chart-context.js`
  - `v4/src/chart/secondary-viewport-controller.js`
  - `v4/src/time-overlays/time-overlay-renderer.js`
  - `v4/src/ui/inspector-sidebar.js`
  - `v4/src/ui/secondary-chart-controller.js`
- Module import probe verified chart context exports return `primary` and `secondary` descriptors with expected helper functions.
- `node --check` passed for `v4/src/pda/manual-pda-actions.js` and `v4/src/pda/manual-annotation.js` after PDA action extraction.
- Module import probe verified `manual-pda-actions.js` exports the expected context-aware helper functions.
- Headless Chrome smoke verified the primary chart context menu still opens after Step 119 and includes PDA actions for BSL, SSL, FVG, and Fib.
- Headless Chrome smoke verified secondary locate moves the secondary logical range to include the target bar after the new secondary locate/flash path.
- Headless Chrome smoke verified Calendar selected-date writes `selectedDate=2012-01-10`, shows the overlay filter state, and `All loaded days` clears it back to all loaded days.
- Headless Chrome smoke verified secondary 1H progressive replay at `2014-05-01 07:13` matches the 1M aggregate for 07:00-07:13 instead of revealing the full 07:00-07:59 candle.
- Full visual acceptance across all requested timeframes remains part of Step 95.

## Current Git State

- Last committed work:
  - `ba516b3 feat(v4): filter overlays by calendar date`
  - `511e7c2 docs(v4): update calendar secondary sync handoff`
  - `e2a9cb9 fix(v4): sync inspector calendar and overlays to secondary chart`
- Current uncommitted changes:
  - Phase 10 Step 119 PDA action extraction
  - TODO/session handoff updates
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

## Next Steps

- Step 120: implement secondary context menu MVP, using the chart context boundary without enabling PDA writes beyond the intended first actions.
- Then implement secondary PDA MVP only after the menu ownership and event routing are stable.
