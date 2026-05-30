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
- Phase 10 Step 120 secondary context menu MVP:
  - added `#secondary-context-menu` inside `#secondary-chart`
  - added `v4/src/pda/secondary-context-menu.js` and initialized it from `app.js`
  - secondary right-click now opens its own flyout menu with PDA / Navigation / Segments groups
  - PDA and Segment write actions are intentionally disabled in Step 120; enabled actions are limited to showing a secondary cursor and copying secondary time/price
- Phase 10 Step 121 secondary PDA MVP:
  - enabled secondary chart `Mark BSL` and `Mark SSL`
  - secondary PDA creation reuses `manual-pda-actions.addManualPoint()` with `getSecondaryChartContext()`
  - created annotations include `sourceChartId`, `sourceInstrument`, `sourceTimeframe`, and `sourceChartLabel`
  - range/FVG/Segment secondary write actions remain disabled until rendering/Inspector/persistence validation is broader
- Phase 10 Step 122 secondary PDA rendering consistency:
  - secondary-created liquidity PDA now gets a source context label such as `ES 1H`, so primary/secondary labels and Calendar summaries show where it came from
  - secondary-created liquidity PDA stores `sourceTimeframeLabel` plus default `display.extendSeconds`
  - `pda-extend.js` now understands numeric `sourceTimeframe`, so explicit/source-duration PDA extension maps consistently across primary and secondary timeframes
- Phase 10 Step 123 secondary PDA selection:
  - `pda-hit-test.js` now accepts an optional chart context and maps PDA coordinates against primary or secondary chart/timeframe
  - `pda-selection.js` now listens for clicks on `#secondary-chart`, hit-tests secondary-rendered PDA, and calls the same `selectPda()` path used by the primary chart
  - Inspector opens from the existing `pda:selected` event, so selection/edit/delete still targets the same PDA store object
- Phase 10 Step 124 secondary PDA to setup link:
  - added PDA order-ref metadata helper for source chart/instrument/timeframe/context fields
  - active setup link paths now preserve PDA source metadata in `linkedObjectRefs`
  - PDA Inspector now exposes `Link PDA To Active Setup`, so a PDA selected from the secondary chart can be linked without returning to the primary right-click menu
  - Setup Set explanation refs and Order Review summary keep/show the source instrument/timeframe

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
- Step 120 establishes secondary menu ownership and event routing only. It must not create PDA/Segment records yet; Step 121 is the first write-enabled secondary PDA step.
- Step 121 intentionally starts with BSL/SSL only. Range PDA needs more validation around start/end selection state and cross-chart projection before it is enabled.
- Step 122 does not add secondary hit-test/selection. That remains Step 123; this step only hardens rendering metadata, extension duration, and persistence/export behavior for secondary-created PDA.
- Step 123 only adds selection/Inspector entry. It does not add separate secondary Inspector state; edits remain centralized on the existing PDA annotation.
- Step 124 preserves source metadata on refs but still stores the link as a normal PDA ref. There is no separate secondary-ref type.
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
- `node --check` passed for `v4/src/pda/secondary-context-menu.js` and `v4/src/app.js` after Step 120.
- Headless Chrome smoke verified Split Screen secondary right-click opens `#secondary-context-menu`, does not create a primary menu, keeps secondary PDA/Segment write actions disabled, and leaves secondary navigation/copy actions enabled.
- `node --check` passed for `v4/src/pda/manual-pda-actions.js` and `v4/src/pda/secondary-context-menu.js` after Step 121.
- Headless Chrome smoke verified secondary `Mark BSL` creates one PDA annotation with `sourceChartId=secondary`, `sourceInstrument=ES`, `sourceTimeframe=60`, and `sourceChartLabel=Secondary`.
- `node --check` passed for `v4/src/pda/manual-pda-actions.js` and `v4/src/pda/pda-extend.js` after Step 122.
- Module probe verified a secondary 1H liquidity PDA with explicit source display extends as 8 bars on 1H and 480 bars on 1M.
- Headless Chrome smoke verified secondary `Mark BSL` creates `contexts=["ES 1H"]`, `sourceTimeframeLabel=1H`, `display.extendSeconds=28800`, localStorage persistence and PDA export keep source fields, and extend maps to 480 primary 1M bars / 8 secondary 1H bars.
- `node --check` passed for `v4/src/pda/pda-hit-test.js` and `v4/src/pda/pda-selection.js` after Step 123.
- Headless Chrome smoke verified clicking a secondary-rendered BSL selects the same PDA id, opens Inspector, and shows the `ES 1H` source context.
- `node --check` passed for order ref metadata/link modules and PDA/Order Review inspector panels after Step 124.
- Module probe verified `normalizeLinkedObjectRef()` preserves `sourceChartId`, `sourceInstrument`, numeric `sourceTimeframe`, `sourceTimeframeLabel`, and source context.
- Headless Chrome smoke verified PDA Inspector `Link PDA To Active Setup` writes a secondary PDA ref with `sourceChartId=secondary`, `sourceInstrument=ES`, `sourceTimeframe=60`, `sourceTimeframeLabel=1H`, and `sourceContext=ES 1H`.
- Headless Chrome smoke verified secondary locate moves the secondary logical range to include the target bar after the new secondary locate/flash path.
- Headless Chrome smoke verified Calendar selected-date writes `selectedDate=2012-01-10`, shows the overlay filter state, and `All loaded days` clears it back to all loaded days.
- Headless Chrome smoke verified secondary 1H progressive replay at `2014-05-01 07:13` matches the 1M aggregate for 07:00-07:13 instead of revealing the full 07:00-07:59 candle.
- Full visual acceptance across all requested timeframes remains part of Step 95.

## Current Git State

- Last committed work:
  - `a4391d7 feat(v4): create secondary chart liquidity PDA`
  - `6446fa2 fix(v4): align secondary PDA rendering metadata`
  - `ce9e1c8 feat(v4): select secondary chart PDA`
- Current uncommitted changes:
  - Phase 10 Step 124 secondary PDA to active setup link metadata
  - TODO/session handoff updates
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

## Next Steps

- Step 125: verify Review JSON/localStorage/undo-redo around secondary-created and secondary-linked PDA before enabling range PDA.
