# Session: Step 330 Large Module Decomposition

Date: 2026-06-22

## Goal

Reduce long-term maintenance risk from large V4 modules without changing user-visible behavior. This is a staged refactor track, not a feature track.

## Step 330.1 Audit

Largest current source modules:

- `v4/src/ui/inspector-sidebar.js` - 1290 lines. Multi-domain sidebar coordinator with many event subscriptions, panel routing, archive import/export actions, pick routing hooks, and comparison chart click forwarding.
- `v4/src/review/review-archive.js` - 1070 lines. Archive payload builder, export/import logic, schema normalization, and compatibility handling.
- `v4/src/live-record/tradovate-performance-importer.js` - 1061 lines. Tradovate CSV parsing, timestamp conversion, file alignment reporting, execution extraction, and archive building.
- `v4/src/pda/manual-annotation.js` - 968 lines. Main chart context menu, PDA/segment/chart-note creation flows, drawing state machine, editor UI, and global input handlers.
- `v4/src/time-reaction/daily-time-review-store.js` - 920 lines. Store plus persistence/normalization-heavy domain logic.
- `v4/src/ui/inspector/calendar-panel.js` - 917 lines. Calendar inspector rendering and day detail UI.
- `v4/src/ui/replay-controls.js` - 908 lines. Replay state machine, replay controls DOM, restore snapshot handling, history bridge, viewport/data sync, keyboard shortcuts, and replay pick state.
- `v4/src/ui/comparison-window-controller.js` - 580 lines. Comparison DOM/render, sliding geometry/drag, comparison data loading, replay source sync, status/placeholder UI, and crosshair sync.

## Priority

1. Start with `replay-controls.js`.
   - It is not the largest file, but it has the highest coupling to recent Comparison work through replay restore, progressive replay, history persistence, viewport state, and chart data sync.
   - Public exports are actively used by `app.js`, Inspector calendar helpers, chart-note/PDA renderers, objective gaps, and replay history restore.

2. Then split `comparison-window-controller.js`.
   - It is smaller, but the responsibilities are clearly separable after native price-axis stabilization.
   - Keep `initComparisonWindowController()` as the only app-level entry.

3. Triage the larger domain modules later.
   - `inspector-sidebar.js`, `review-archive.js`, `tradovate-performance-importer.js`, and `manual-annotation.js` need domain-specific test entry points before mechanical extraction.

## Replay Controls Split Candidates

Keep stable public exports from `v4/src/ui/replay-controls.js`:

- `initReplayControls`
- `syncReplayData`
- `restoreReplayToTimestamp`
- `getReplayRestoreSnapshot`
- `getReplayVisibleBars`
- `getReplayCursorTimestamp`
- `isReplayPicking`
- `didReplayPickJustHandleClick`

Candidate extraction boundaries:

- Pure replay time/bar helpers.
- Restore snapshot and range input helpers.
- Replay controls DOM rendering and click/key handlers.
- Replay history bridge and restore actions.
- Replay pick state helpers.

## Step 330.2 Replay Controls Extraction Plan

Current `replay-controls.js` structure:

- Lines 45-153: chart bar formatting, HTML/date helpers, toolbar range/instrument setters, and comparison restore application.
- Lines 155-297: replay timestamp lookup, UTC target time helpers, progressive higher-timeframe restore helpers, and jump timestamp parsing.
- Lines 308-510: timer handling, cursor timestamp anchors, replay state transitions, render slice, step/back/play/jump actions, and public `restoreReplayToTimestamp`.
- Lines 512-555: Replay History item load, data reload, comparison restore, and replay cursor restore.
- Lines 557-726: replay enable/play/pick state machine plus click/keyboard dispatch.
- Lines 728-811: replay controls DOM and replay history panel rendering.
- Lines 813-842: public replay query APIs used by renderers/Inspector.
- Lines 844-908: `syncReplayData` and initialization wiring.

Extraction order:

1. Extract pure time/bar helpers to `v4/src/ui/replay/replay-time-utils.js`.
   - Move `formatReplayTime`, `parseDateTime`, `isTimestampInRange`, `findBarIndexAtOrBeforeTimestamp`, `getUtcDateTimeTimestamp`, `aggregatePartialBar`, `getReplayRestoreDisplayBars`, `parseReplayJumpTimestamp`, and `normalizeTimeKey`.
   - Keep `getBarChartTime` dependent `toChartBar` in `replay-controls.js` for the first pass because it directly reads current timeframe from `bar-store`.

2. Extract DOM rendering to `v4/src/ui/replay/replay-controls-view.js`.
   - Move `escapeHtml`, `formatHistoryTime`, `formatHistoryDateRange`, `renderHistoryPanel`, and a new `renderReplayControlsView(state)` function.
   - Keep event binding and action dispatch in `replay-controls.js`.

3. Extract Replay History load bridge to `v4/src/ui/replay/replay-history-actions.js` only after helper/view extraction is stable.
   - Pass dependencies explicitly: `fetchBars`, store setters, toolbar setters, comparison restore callback, and replay restore callback.
   - Avoid hidden imports back into `replay-controls.js`.

4. Leave state transitions in `replay-controls.js` during Step 330.3.
   - `enabled`, `mode`, `cursorIndex`, timestamp anchors, `timer`, and `renderSlice` remain together to avoid splitting the core state machine while moving helpers.

Baseline verification for each extraction commit:

```bash
node --check v4/src/ui/replay-controls.js
node v4/tests/replay-history-comparison-smoke.js
node v4/tests/comparison-replay-sync-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

If a browser smoke is too slow while iterating, run the first three checks before commit and run the browser smoke before marking the substep complete.

## Step 330.3 Replay Controls Staged Extraction

Completed behavior-preserving extractions:

- `v4/src/ui/replay/replay-time-utils.js`
  - replay time formatting;
  - timestamp parsing/range checks;
  - bar lookup at-or-before timestamp;
  - progressive higher-timeframe partial-bar restore helpers;
  - jump timestamp parsing;
  - time key/timestamp normalization.
- `v4/src/ui/replay/replay-controls-view.js`
  - replay toolbar HTML rendering;
  - replay history panel rendering;
  - replay history row escaping/formatting.
- `v4/src/ui/replay/replay-history-actions.js`
  - Replay History item load;
  - outer-range window resolution;
  - primary data reload;
  - comparison workspace restore;
  - replay cursor restore.

Kept in `v4/src/ui/replay-controls.js`:

- replay state machine;
- timer/play/step/pick actions;
- public replay APIs used by app/renderers/Inspector;
- app-level `initReplayControls()` wiring.

Line count changed from 908 lines to 648 lines for `replay-controls.js`.

Verification:

```bash
node --check v4/src/ui/replay-controls.js
node --check v4/src/ui/replay/replay-time-utils.js
node --check v4/src/ui/replay/replay-controls-view.js
node --check v4/src/ui/replay/replay-history-actions.js
node v4/tests/replay-history-comparison-smoke.js
node v4/tests/comparison-replay-sync-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result: all passed. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.

## Step 330.6 Inspector and Domain Module Triage

Post-extraction large module list still includes:

- `v4/src/ui/inspector-sidebar.js` - 1290 lines.
  - Worth splitting, but only with browser coverage because it is the app-level sidebar coordinator.
  - Suggested boundaries: sidebar shell/event wiring, selection routing, archive import/export actions, comparison chart pick forwarding.
  - Baseline tests: `comparison-window-browser-smoke`, `live-record-browser-smoke`, calendar/day detail smoke paths.

- `v4/src/review/review-archive.js` - 1070 lines.
  - Worth splitting after archive schema tests are expanded.
  - Suggested boundaries: payload builder, import normalization, export serialization, compatibility migration.
  - Existing tests: `daily-time-review-archive-smoke`, `live-record-smoke`.

- `v4/src/live-record/tradovate-performance-importer.js` - 1061 lines.
  - Good candidate for pure-domain split because it already has a focused smoke.
  - Suggested boundaries: CSV row parsers, timestamp/money/symbol normalization, file alignment report, execution/order matching, archive builders.
  - Existing tests: `tradovate-performance-importer-smoke`, `tradovate-zip-import-browser-smoke`.

- `v4/src/pda/manual-annotation.js` - 968 lines.
  - Worth splitting only with chart interaction/browser coverage.
  - Suggested boundaries: context menu dispatch, chart-note editor, PDA creation actions, segment creation state machine, global keyboard/click handling.
  - Risk: high because it owns user drawing flows and shared chart context menu behavior.

- `v4/src/time-reaction/daily-time-review-store.js` - 920 lines.
  - Good candidate for store/normalizer separation.
  - Suggested boundaries: schema normalization, query/index helpers, persistence-facing mutations, calendar aggregation helpers.
  - Existing tests: `daily-time-review-store-smoke`, `legacy-secondary-compatibility-smoke`, `time-reaction-panel-smoke`.

- `v4/src/ui/inspector/calendar-panel.js` - 917 lines.
  - Worth splitting after sidebar shell is stable.
  - Suggested boundaries: calendar grid rendering, day object group rendering, day detail rendering, date/timestamp helpers.
  - Existing tests: `calendar-visibility-smoke`, `live-record-smoke`.

Decision:

- Do not continue mechanical splitting in Step 330.
- Replay and Comparison were the highest-coupling files for the current work and are now below the immediate-risk threshold.
- Future decomposition should be separate domain-specific steps with explicit test baselines.

## Comparison Controller Split Candidates

Keep stable public export from `v4/src/ui/comparison-window-controller.js`:

- `initComparisonWindowController`

Candidate extraction boundaries:

- DOM template, selectors, and header control rendering.
- Sliding layout geometry, ResizeObserver refresh, and drag handlers.
- Comparison data loading and replay source sync.
- Main/comparison crosshair synchronization.
- Status and placeholder view helpers.

## Step 330.4 Comparison Controller Extraction Plan

Current `comparison-window-controller.js` structure:

- Lines 55-84: replay-source loading guard and select-option rendering helpers.
- Lines 86-98: app-level initialization and event wiring.
- Lines 100-181: DOM template creation, ResizeObserver setup, header control events, drag-handle event binding.
- Lines 183-212: state render, select option refresh, chart initialization.
- Lines 214-250: sliding layout geometry, CSS variable sync, layout refresh scheduling.
- Lines 252-327: comparison enabled/data change handling, display-bar derivation, chart data conversion, replay-synced rendering, replay cursor sync.
- Lines 329-405: main/comparison crosshair sync with requestAnimationFrame throttling.
- Lines 407-486: status/placeholder helpers, clear view, comparison data load, replay-source load, status updates.
- Lines 488-494: replay event handling.
- Lines 496-580: floating/sliding drag handlers and pointer capture lifecycle.

Extraction order:

1. Extract DOM/view helpers to `v4/src/ui/comparison/comparison-window-view.js`.
   - Move option rendering and the static DOM template builder.
   - Move select value refresh into a helper that accepts `root` and descriptor.
   - Keep event listener registration in controller for the first pass.

2. Extract layout/drag helpers to `v4/src/ui/comparison/comparison-window-layout.js`.
   - Move geometry sync and CSS variable updates first.
   - Move drag state handling only after geometry extraction passes browser smoke.
   - Keep `updateComparisonVisibleWindow()` passed explicitly to avoid hidden store writes.

3. Extract data/replay helpers to `v4/src/ui/comparison/comparison-window-data.js`.
   - Move display-bar derivation, chart-bar conversion, replay-synced bar calculation, comparison load, clear view, and status callbacks.
   - Keep `requestSeq`, `lastLoadSignature`, replay source state, and status callbacks explicit in a small controller-owned state object.

4. Extract crosshair sync to `v4/src/ui/comparison/comparison-crosshair-sync.js`.
   - Move requestFrame throttling and timestamp mapping.
   - Pass primary/comparison stores and chart cursor functions explicitly.

Stable app contract:

- `initComparisonWindowController()` remains the only exported app entry.
- Existing event names remain unchanged: `comparison-window:dom-ready`, `comparison-window:changed`, `bars:loaded`, `bars:cleared`, `replay:changed`.
- Native LWC comparison price-axis behavior must remain unchanged.

Baseline verification:

```bash
node --check v4/src/ui/comparison-window-controller.js
node v4/tests/comparison-replay-sync-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

For layout/drag extraction, browser smoke is mandatory before commit because it covers Inspector resize, native price-axis alignment, viewport controls, drag behavior, and close-button hit target.

## Step 330.5 Comparison Controller Staged Extraction

Completed behavior-preserving extractions:

- `v4/src/ui/comparison/comparison-window-view.js`
  - static Comparison Window DOM template;
  - instrument/timeframe/drawing sync select option rendering;
  - header control value refresh.
- `v4/src/ui/comparison/comparison-window-layout.js`
  - sliding/floating geometry sync;
  - CSS variable updates for main legend and viewport controls;
  - ResizeObserver refresh target behavior;
  - floating/sliding drag handlers and pointer capture lifecycle.
- `v4/src/ui/comparison/comparison-crosshair-sync.js`
  - main-to-comparison crosshair sync;
  - comparison-to-main crosshair sync;
  - requestAnimationFrame throttling and timestamp resolution.
- `v4/src/ui/comparison/comparison-window-data.js`
  - comparison data loading;
  - replay source loading for HTF progressive replay;
  - replay-synced comparison bars;
  - comparison replay cursor;
  - clear/status/placeholder and overlay-status refresh.

Kept in `v4/src/ui/comparison-window-controller.js`:

- `initComparisonWindowController()` as the app-level entry;
- root/window DOM ownership;
- event bus wiring;
- header control event handlers;
- lightweight render glue that initializes the chart and syncs header state.

Line count changed from 580 lines to 141 lines for `comparison-window-controller.js`.

Verification:

```bash
node --check v4/src/ui/comparison-window-controller.js
node --check v4/src/ui/comparison/comparison-window-view.js
node --check v4/src/ui/comparison/comparison-window-layout.js
node --check v4/src/ui/comparison/comparison-crosshair-sync.js
node --check v4/src/ui/comparison/comparison-window-data.js
node v4/tests/comparison-replay-sync-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result: all passed. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.

## Verification Baseline

Use existing narrow smoke tests while extracting:

- `node v4/tests/replay-history-restore-smoke.js` when available in the branch history, or the closest current replay history smoke.
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/comparison-replay-sync-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/secondary_progressive_replay_smoke.js` equivalent if present, otherwise the current progressive replay browser smoke path.
- `git diff --check`

Each extraction commit should be behavior-preserving. If a helper must change behavior, it should be split into a separate feature/fix step rather than hidden inside Step 330.

## Step 330.7 Closeout

Final module boundaries:

- Replay:
  - `v4/src/ui/replay-controls.js` keeps the replay state machine, public replay APIs, event wiring, and app-level initialization.
  - `v4/src/ui/replay/replay-time-utils.js` owns pure replay timestamp/bar helpers.
  - `v4/src/ui/replay/replay-controls-view.js` owns replay toolbar/history HTML rendering.
  - `v4/src/ui/replay/replay-history-actions.js` owns Replay History load/restore side effects.
- Comparison:
  - `v4/src/ui/comparison-window-controller.js` keeps app-level initialization, root/window ownership, event wiring, header control events, and lightweight render glue.
  - `v4/src/ui/comparison/comparison-window-view.js` owns DOM template and header control rendering.
  - `v4/src/ui/comparison/comparison-window-layout.js` owns layout geometry and drag handlers.
  - `v4/src/ui/comparison/comparison-crosshair-sync.js` owns crosshair synchronization.
  - `v4/src/ui/comparison/comparison-window-data.js` owns data loading, replay source sync, clear/status, and comparison chart data rendering.

Public API retained:

- `initReplayControls`
- `syncReplayData`
- `restoreReplayToTimestamp`
- `getReplayRestoreSnapshot`
- `getReplayVisibleBars`
- `getReplayCursorTimestamp`
- `isReplayPicking`
- `didReplayPickJustHandleClick`
- `initComparisonWindowController`

Line count summary:

- `replay-controls.js`: 908 -> 648 lines.
- `comparison-window-controller.js`: 580 -> 141 lines.

Final verification:

```bash
node --check v4/src/ui/replay-controls.js
node --check v4/src/ui/replay/replay-time-utils.js
node --check v4/src/ui/replay/replay-controls-view.js
node --check v4/src/ui/replay/replay-history-actions.js
node --check v4/src/ui/comparison-window-controller.js
node --check v4/src/ui/comparison/comparison-window-view.js
node --check v4/src/ui/comparison/comparison-window-layout.js
node --check v4/src/ui/comparison/comparison-crosshair-sync.js
node --check v4/src/ui/comparison/comparison-window-data.js
node v4/tests/replay-history-comparison-smoke.js
node v4/tests/comparison-replay-sync-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result: all passed. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.

Deferred:

- No mechanical splitting of remaining 900+ line modules in this step.
- Future splits should be domain-specific tasks with dedicated smoke baselines, especially for Inspector, Tradovate import, review archive, daily time review store, and manual annotation.
