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
- Phase 10 Step 125 persistence/review validation:
  - verified secondary-created and secondary-linked PDA metadata survives localStorage save/restore
  - verified PDA JSON import and Review JSON import preserve source chart/instrument/timeframe/context metadata
  - verified Inspector link participates in undo/redo by removing and restoring the setup ref
  - verified Calendar review index groups the secondary PDA under PDA with its `ES 1H` context and keeps Locate/Open/Back navigation working
- Phase 10 Step 126 secondary Segment design freeze:
  - added `v4/docs/SECONDARY_SEGMENT_DESIGN.md`
  - decided secondary-created segments reuse the existing Segment store instead of introducing a separate HTF structure layer
  - froze source metadata fields: `sourceChartId`, `sourceChartLabel`, `sourceInstrument`, `sourceTimeframe`, `sourceTimeframeLabel`, and `sourceContext`
  - froze the follow-up implementation boundary: Step 127 creates/selects secondary segments in the shared store; Step 128 links those segments to active setups with copied source metadata
- Phase 10 Step 127 secondary Segment MVP:
  - made manual segment creation context-aware while keeping the primary wrapper restricted to 1H
  - enabled secondary context-menu Segment actions: start from low/high and end at low/high
  - secondary-created segments now write the shared Segment store with source chart/instrument/timeframe/context metadata
  - segment hit-testing and selection now accept a chart context, so clicking a secondary-rendered segment opens the existing Segment Inspector
  - Segment Inspector now shows source chart, source instrument, and source timeframe
  - Segment identity now includes source chart and instrument to avoid primary/secondary or NQ/ES duplicate collisions
- Phase 10 Step 128 secondary Segment to setup link:
  - extended `order-ref-metadata.js` with Segment metadata and label helpers
  - Segment refs now copy source chart/instrument/timeframe/context metadata when linked through chart context menu, Segment Inspector, Order Review "Add Segment", and "Create Setup With Segment"
  - Segment Inspector exposes `Link Segment To Active Setup`
  - Order Review linked ref displays now include source instrument/timeframe when available
- Phase 10 Step 129 secondary Segment workflow validation:
  - verified secondary Segment metadata survives localStorage save/restore
  - verified undo/redo removes and restores the secondary Segment object
  - verified Calendar groups the secondary Segment under `Segments`
  - verified Review JSON import restores the secondary Segment and its setup ref source metadata
  - verified Split on/off and Replay Bar On do not remove or corrupt the secondary Segment

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
- Step 125 is validation-only. It did not require schema or runtime code changes; the current archive/localStorage paths already preserve the new source metadata.
- Step 126 freezes secondary Segment as a shared Segment-store record with source metadata, not a new object type or independent HTF layer.
- Secondary Segment setup links should remain normal `type: segment` refs with copied source metadata, mirroring the Step 124 PDA ref approach.
- Step 127 should not block on context-aware occurrence lookup for non-NQ secondary instruments; endpoint occurrence can remain absent until a later dedicated refinement.
- Step 127 keeps primary Segment creation behavior unchanged through the existing `startSegment()` / `finishSegment()` wrappers; only explicit secondary menu actions opt into secondary context writes.
- Step 128 keeps Segment setup links as regular `type: segment` refs. Source metadata is copied onto the ref instead of introducing a new secondary-segment ref type.
- Step 129 is validation-only. No runtime or schema changes were required after the Step 127/128 implementation.
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
- Headless Chrome smoke verified localStorage PDA/Order Review restore, PDA JSON import, Review JSON import, and undo/redo all preserve the same secondary PDA/link metadata.
- Headless Chrome smoke verified Calendar groups a secondary PDA under PDA with `ES 1H`, shows Locate/Open actions, `Locate` updates status, `Open` enters PDA Inspector, and `Back to Calendar` returns to the selected calendar view.
- Step 126 validation was code-reading and design audit only: Segment store, manual segment creation, primary/secondary renderers, selection, Inspector, Calendar, archive import/export, and setup-link paths were checked before freezing the shared-store design.
- Headless Chrome smoke verified secondary context-menu Segment start/end actions create an ES 1H segment with source metadata, clicking the secondary-rendered segment selects it, and Inspector shows `Source Chart: secondary`, `Source Instrument: ES`, and `Source TF: 1H`.
- Headless Chrome smoke verified Segment Inspector `Link Segment To Active Setup` writes a `type=segment` ref with `sourceChartId=secondary`, `sourceInstrument=ES`, `sourceTimeframe=60`, `sourceTimeframeLabel=1H`, and `sourceContext=ES 1H`.
- Headless Chrome smoke verified secondary Segment localStorage restore, undo/redo, Calendar grouping, Review JSON import, setup ref metadata restore, Split on/off, and Replay Bar On behavior.
- Headless Chrome smoke verified secondary locate moves the secondary logical range to include the target bar after the new secondary locate/flash path.
- Headless Chrome smoke verified Calendar selected-date writes `selectedDate=2012-01-10`, shows the overlay filter state, and `All loaded days` clears it back to all loaded days.
- Headless Chrome smoke verified secondary 1H progressive replay at `2014-05-01 07:13` matches the 1M aggregate for 07:00-07:13 instead of revealing the full 07:00-07:59 candle.
- Full visual acceptance across all requested timeframes remains part of Step 95.

## Current Git State

- Last committed work:
  - `6446fa2 fix(v4): align secondary PDA rendering metadata`
  - `ce9e1c8 feat(v4): select secondary chart PDA`
  - `b528ef1 feat(v4): link secondary PDA to active setup`
  - `61da454 docs(v4): validate secondary PDA persistence`
  - `a74878d feat(v4): create secondary chart segments`
  - `a9d88ec feat(v4): link secondary segments to setup`
- Current uncommitted changes:
  - Phase 10 Step 129 TODO/session validation updates
  - TODO/session handoff updates
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

## Next Steps

- Next: decide whether to merge Phase 10 to `main` or start the next feature phase after committing Step 129 docs.

## Phase 11 Step 130 Update

Completed:

- Froze the secondary chart FVG design in `v4/docs/SECONDARY_FVG_DESIGN.md`.
- Confirmed secondary FVG should reuse the existing PDA store and `type='fvg'` range annotation rather than introducing a separate secondary-FVG layer.
- Froze the required secondary source metadata: `sourceChartId`, `sourceChartLabel`, `sourceInstrument`, `sourceTimeframe`, `sourceTimeframeLabel`, and `sourceContext`.
- Kept secondary IFVG and generic range PDA out of the first FVG rollout; ordinary FVG is the MVP.
- Updated `v4/TODO.md` with Phase 11 Steps 130-135.

Design audit:

- `v4/src/pda/manual-pda-actions.js` already centralizes FVG creation through `addManualFvg()`.
- `v4/src/pda/fvg-identifier.js` is context-independent and can run on secondary display bars.
- Existing PDA renderers and hit-test paths already support range PDA records.
- PDA archive/import/export paths preserve unknown annotation fields, so source metadata can travel with the record.
- Existing setup-link metadata normalization can reuse the same PDA ref type once FVG creation writes complete source fields.

Validation:

- Step 130 was a code-reading/design-freeze step only; no runtime behavior was changed.
- Pending final local validation for this doc/TODO/session update: `git diff --check`.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `9a63b4d docs(v4): validate secondary segment workflow`
- Current uncommitted changes: Phase 11 Step 130 design/TODO/session updates
- Existing unrelated untracked local files remain ignored:
  - `__pycache__/`
  - `tmp/`
  - `trading_data.duckdb`
  - `v3/plans/`

Next Steps:

- Step 131: harden `addManualFvg()` source metadata and contexts for secondary-created FVG while keeping primary FVG behavior unchanged.

## Phase 11 Step 131 Update

Completed:

- Hardened `addManualFvg()` so FVG annotations now write source metadata through the shared source metadata helper.
- Added `sourceChartLabel` and `sourceContext` support to the source metadata helper.
- Secondary-created FVG records now get `sourceChartId=secondary`, `sourceChartLabel=Secondary`, `sourceInstrument`, `sourceTimeframe`, `sourceTimeframeLabel`, and `sourceContext`.
- Secondary FVG contexts now include both the source context and structure label, for example `['ES 1H', '1H FVG']`.
- Primary FVG context labels remain unchanged, for example `['1H FVG']`.
- Updated `v4/TODO.md` to mark Step 131 complete.

Validation:

- `node --check v4/src/pda/manual-pda-actions.js`
- Module probe verified a synthetic secondary 1H FVG creates one `type='fvg'` annotation with `contexts=['ES 1H', '1H FVG']` and complete secondary source metadata.
- Module probe verified primary 1H FVG keeps `contexts=['1H FVG']` while still carrying source metadata.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `9e43966 docs(v4): freeze secondary fvg design`
- Current uncommitted changes: Phase 11 Step 131 FVG metadata hardening

Next Steps:

- Step 132: enable secondary chart context-menu `Mark FVG` and wire it to `addManualFvg()` with the secondary chart context.

## Phase 11 Step 132 Update

Completed:

- Enabled `Mark FVG` in the secondary chart PDA submenu when a secondary bar is available.
- Wired `secondary-pda-fvg` to `addManualFvg(contextMenuBar, getSecondaryChartContext())`.
- Kept `Mark Range PDA` disabled; generic secondary range PDA remains out of scope for this rollout.
- Existing no-FVG behavior is reused from `addManualFvg()`: it emits `未识别到 FVG 结构` and creates no annotation.
- Updated `v4/TODO.md` to mark Step 132 complete.

Validation:

- `node --check v4/src/pda/secondary-context-menu.js`
- Module import probe verified `secondary-context-menu.js` still imports and exports `initSecondaryContextMenu`.
- Static check verified `secondary-pda-fvg` is no longer hard-disabled and calls `addManualFvg()`.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `82ebd30 feat(v4): harden secondary fvg metadata`
- Current uncommitted changes: Phase 11 Step 132 secondary FVG menu enablement

Next Steps:

- Step 133: validate secondary FVG rendering, hit-test, selection, Inspector edit/delete, and locate/flash behavior.

## Phase 11 Step 133 Update

Completed:

- Validated secondary-created FVG as a normal range PDA through the existing renderer/hit-test/Inspector/Calendar paths.
- Confirmed `secondary-pda-renderer.js` already supports FVG/range primitives and source-context labels.
- Confirmed `pda-hit-test.js` can hit-test a secondary FVG range using the secondary chart context.
- Confirmed `pda-selection.js` selects the same PDA id from secondary chart hit-test results.
- Confirmed `pda-panel.js` renders the FVG as a range PDA with contexts, note/edit controls, CE toggle, extend input, and delete action.
- Confirmed Calendar object locate data includes the FVG start/end timestamp range; Inspector locate calls both primary and secondary viewport locate/flash controllers.
- No runtime code changes were required for Step 133.
- Updated `v4/TODO.md` to mark Step 133 complete.

Validation:

- `node --check v4/src/pda/secondary-pda-renderer.js`
- `node --check v4/src/pda/pda-hit-test.js`
- `node --check v4/src/ui/inspector/pda-panel.js`
- `node --check v4/src/calendar/calendar-review-index.js`
- Module smoke created a synthetic secondary 1H FVG, verified range hit-test, PDA selection, Inspector render, note/display update, Calendar locate range, and delete.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `2adfaa0 feat(v4): enable secondary fvg marking`
- Current uncommitted changes: Phase 11 Step 133 TODO/session validation updates only

Next Steps:

- Step 134: validate linking a secondary-created FVG to the active Order Setup / setup set with source metadata preserved on the PDA ref.

## Phase 11 Step 134 Update

Completed:

- Validated secondary-created FVG link metadata for active Order Setup / setup set refs.
- Updated `buildPdaOrderRefMetadata()` to prefer `annotation.sourceContext` before falling back to joined `annotation.contexts`.
- This keeps secondary FVG setup refs focused on the source context, for example `sourceContext='ES 1H'`, instead of mixing source and structure labels as `ES 1H · 1H FVG`.
- Legacy/primary PDA annotations without `sourceContext` still fall back to joined contexts.
- Verified `getPdaOrderRefLabel()` still renders secondary FVG refs as `FVG · ES 1H`.
- Updated `v4/TODO.md` to mark Step 134 complete.

Validation:

- `node --check v4/src/order/order-ref-metadata.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module probe verified secondary FVG metadata normalizes to `sourceChartId=secondary`, `sourceChartLabel=Secondary`, `sourceInstrument=ES`, `sourceTimeframe=60`, `sourceTimeframeLabel=1H`, and `sourceContext=ES 1H`.
- Module probe verified legacy PDA refs without `sourceContext` still use joined contexts as fallback.
- Module smoke created a synthetic secondary 1H FVG, created an Order Review, made it active, linked the PDA ref, and verified the active setup ref preserves all secondary source fields.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `d9983b7 docs(v4): validate secondary fvg interaction`
- Current uncommitted changes: Phase 11 Step 134 link metadata fix and TODO/session updates

Next Steps:

- Step 135: validate secondary FVG persistence and workflow across localStorage, PDA JSON, Review JSON, undo/redo, Split on/off, and Replay Bar On.

## Phase 11 Step 135 Update

Completed:

- Validated secondary FVG persistence and workflow end-to-end.
- Confirmed secondary-created FVG source metadata survives localStorage save/restore.
- Confirmed PDA JSON import preserves secondary source fields.
- Confirmed Review JSON import preserves both the secondary FVG annotation and the active setup linked PDA ref metadata.
- Confirmed undo/redo restores secondary FVG source metadata after create/undo/redo.
- Confirmed Split secondary store can stay enabled and retain loaded secondary display bars while the same shared PDA annotation remains in the PDA store.
- Confirmed Replay integration remains on existing paths: primary PDA renderer listens to `replay:changed`, secondary PDA renderer listens to secondary chart/data events, and secondary FVG metadata is independent of replay slicing.
- No runtime code changes were required for Step 135.
- Updated `v4/TODO.md` to mark Step 135 complete.

Validation:

- `node --check v4/src/pda/pda-persistence.js`
- `node --check v4/src/pda/pda-archive.js`
- `node --check v4/src/review/review-archive.js`
- `node --check v4/src/history/history-manager.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/secondary-pda-renderer.js`
- Module smoke created a secondary 1H FVG and verified source metadata through localStorage restore, PDA JSON import, Review JSON import, active setup ref restore, undo/redo, and secondary split-store loaded state.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `cf1c31c fix(v4): preserve secondary fvg ref context`
- Current uncommitted changes: Phase 11 Step 135 TODO/session validation updates only

Next Steps:

- Commit Step 135, then review the completed Phase 11 branch before deciding whether to merge back to `main`.

## Phase 11 Review Fix

Completed:

- Reviewed the completed Phase 11 secondary FVG branch.
- Found and fixed a secondary hit-test edge case: extended range/point-set/fib PDA hit-test used the primary chart bar spacing instead of the supplied chart context.
- Updated `v4/src/pda/pda-hit-test.js` so `extendXByBars()` reads `context.getChart().timeScale()` when a chart context is supplied, with the primary chart retained as fallback.
- This specifically protects secondary FVG after Inspector extend edits, where the extended hit area must use secondary chart spacing.

Validation:

- `node --check v4/src/pda/pda-hit-test.js`
- Module smoke verified an extended secondary 1H FVG can be hit inside the secondary extended range area.
- Full changed-JS syntax check across the branch passed.

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `a0373a0 docs(v4): validate secondary fvg persistence`
- Current uncommitted changes: Phase 11 review hit-test fix and session update

Next Steps:

- Commit the review fix, then decide whether to merge `feature/secondary-chart-annotation-workflow` back to `main`.

## Secondary Navigation Symmetry Update

Completed:

- Added `Locate Time in Primary` to the secondary chart Navigation submenu.
- The action maps the clicked secondary bar timestamp to the matching primary chart time range and calls `viewport.locateTimestampRange()`.
- For higher secondary timeframes, the located primary range spans the full secondary bar window, for example 1H maps to `timestamp` through `timestamp + 59m`.
- The primary chart viewport scrolls to the corresponding area and uses the existing locate flash.
- `Show Cursor Here` remains as a lightweight secondary-only temporary cursor marker.

Validation:

- `node --check v4/src/pda/secondary-context-menu.js`

Current Git State:

- Branch: `feature/secondary-chart-annotation-workflow`
- Last committed work: `788da3c fix(v4): use chart context for pda hit-test extension`
- Current uncommitted changes: secondary context-menu primary locate action and session update
