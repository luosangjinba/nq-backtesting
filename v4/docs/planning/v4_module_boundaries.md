# V4 Module Boundaries

This document records the Step 350 baseline before the module-boundary refactor.
It is an inventory and contract document, not an implementation change.

## Boundary Goals

V4 needs explicit runtime ownership before adding another major chart behavior
such as FX Replay-style sessions.

The target ownership model is:

- UI modules render controls and dispatch commands.
- Runtime modules execute commands and own cross-feature orchestration.
- Data modules fetch, normalize, cache, and store data.
- Chart modules adapt LightweightCharts and own series/viewport mutation.
- Feature modules render/read annotations and may request commands, but they do
  not own the main chart loading model.

## Current High-Risk Coupling

### Bar Fetch Callers

Current modules that directly call `fetchBars()`:

- `v4/src/ui/toolbar.js`
- `v4/src/ui/calendar-navigator.js`
- `v4/src/ui/viewport-controls.js`
- `v4/src/ui/replay/replay-history-actions.js`
- `v4/src/ui/inspector/time-reaction-actions.js`
- `v4/src/ui/comparison/comparison-window-data.js`
- `v4/src/pda/pda-context-data.js`
- `v4/src/pda/objective-gaps.js`
- `v4/src/order/auto-exit-time.js`
- `v4/src/segment/manual-segment.js`

Contract after Step 351.2:

- UI modules must not import `api.js` directly.
- Primary chart bar requests must go through a bars runtime or bars client.
- Feature-only context lookups may use a feature data service, but not the
  primary chart writer.

### Primary Bar Writers

Current modules that directly call `store.setBars()` or receive an injected
`setBars()`:

- `v4/src/ui/toolbar.js`
- `v4/src/ui/calendar-navigator.js`
- `v4/src/ui/viewport-controls.js`
- `v4/src/ui/replay/replay-history-actions.js`
- `v4/src/ui/inspector/time-reaction-actions.js`
- `v4/src/ui/replay-controls.js` through injected restore dependencies
- `v4/src/data/bar-store.js`

Contract after Step 351.3:

- `bar-store.js` remains the storage primitive.
- Only `primary-bars-runtime` may write primary bars.
- UI and feature modules must request primary loads through runtime commands.
- Comparison bars remain separate under the comparison runtime/store.

### Primary Chart Mutators

Current modules that directly mutate the primary chart series or range:

- `v4/src/app.js` maps `bars:loaded` to `chart.setData()`.
- `v4/src/ui/replay-controls.js` calls `chart.setData()`, `chart.updateBar()`,
  `chart.showStartOfData()`, `chart.showEndOfData()`, and
  `chart.setVisibleLogicalRange()`.
- `v4/src/ui/toolbar.js` calls `chartManager.applyGridVisibility()`.
- `v4/src/chart/viewport-controller.js` calls visible logical range methods.
- `v4/src/chart/chart-manager.js` wraps LightweightCharts mutations.

Contract after Step 351.4:

- `chart-manager.js` is a low-level adapter only.
- `primary-chart-runtime` owns projection from display bars to chart data.
- Replay and history modes request chart changes through mode/runtime APIs.
- UI modules may change chart preferences through commands, not by direct chart
  mutation.

### Visible Range Mutators

Current primary visible-range mutation points:

- `chart-manager.showStartOfData()`
- `chart-manager.showEndOfData()`
- `chart-manager.setVisibleRange()`
- `chart-manager.setVisibleLogicalRange()`
- `viewport-controller.setVisibleLogicalRange()`
- `replay-controls.js` restore/replay paths

Contract after Step 351.6:

- Visible range changes must be mode-aware.
- History mode may fit/start/end normal data.
- Legacy replay mode may follow cursor slices.
- Future FX replay mode must own prefix/forward viewport policy separately.

## Core Event Contracts

These contracts describe current payload expectations and target ownership.

### `bars:loaded`

Current emitter:

- `bar-store.setBars()`

Current important consumers:

- `app.js`
- `viewport-controls.js`
- `comparison-window-controller.js`
- `replay-history-persistence.js`
- `economic-calendar-loader.js`
- `daily-regime-vix-loader.js`
- `time-overlay-renderer.js`
- `pda-renderer.js`
- `segment-renderer.js`
- `smt-renderer.js`
- `order-review-renderer.js`
- `live-record-renderer.js`
- `chart-note-renderer.js`
- inspector/sidebar refresh hooks

Current payload:

- `bars`
- `start`
- `end`
- `tf`
- `requestedRange`
- `requestedOuterRange`
- `instrument`
- `isWindowedRange`

Target owner:

- Emitted only by primary bars runtime through `bar-store`.
- Chart series updates handled by primary chart runtime.
- Feature renderers may subscribe to rerender overlays, but must not load more
  primary bars in response unless routed through a command.

### `bars:cleared`

Current emitter:

- `bar-store.clearBars()`

Current consumers:

- Selection modules clear active picks/selections.
- Renderers clear primitives.
- Data loaders clear derived state.

Target owner:

- Emitted by primary bars runtime.
- Feature modules may clear derived visual state.
- UI modules must not treat this event as a command to start loading bars.

### `comparison-bars:loaded`

Current emitter:

- `comparison-window-store.setComparisonBars()`

Current important consumers:

- comparison range sync
- comparison persistence
- comparison overlay policy
- PDA/segment/SMT/order/live/time overlay comparison renderers

Target owner:

- Emitted by comparison runtime/store only.
- Primary runtime must not depend on comparison bars to load primary bars.

### `replay:changed`

Current emitter:

- `ui/replay-controls.js`

Current important consumers:

- comparison replay sync/rendering
- PDA renderer
- chart note renderer
- inspector replay day refresh

Current payload:

- `enabled`
- `cursorIndex`
- `cursorTimestamp`
- `speedIndex`

Target owner:

- Legacy replay controller emits this event after Step 351.7.
- Future FX replay controller must emit a separate compatible payload or a
  versioned event, but must not overload legacy full-range replay semantics.

### `status:update`

Current emitters:

- Many UI, persistence, feature action, loader, and history modules.

Current consumer:

- `toolbar.js`

Current payload:

- `text`
- `isError`

Target owner:

- Status remains a broadcast UI channel for now.
- Runtime commands should emit user-facing status after command completion.
- Low-level modules should return errors where possible instead of always
  emitting status directly.

## Current Boundary Exceptions

These exceptions are allowed temporarily while the refactor proceeds:

- `toolbar.js`, `calendar-navigator.js`, `viewport-controls.js`, replay history,
  time reaction, comparison, PDA, order, and segment modules now use
  `data/bars/bars-api-client.js` for K-line requests as of Step 351.2.
- Primary chart writers must call `runtime/primary-bars-runtime.js`; direct
  `store.setBars()` calls outside `bar-store.js` and the runtime are blocked by
  `primary-bars-runtime-boundary-smoke.js` as of Step 351.3.
- `app.js` may still update the chart on `bars:loaded` until Step 351.4.
- `replay-controls.js` may still mutate chart data until Step 351.7.
- Feature modules may still request context-only bars through `loadBars()` until
  a feature data-service policy is introduced.

Each exception must either be removed or explicitly reclassified by the end of
Step 351.

## Manual Review Checklist For Boundary Changes

Use this checklist when reviewing future refactor commits:

1. Did any UI file import `api.js` or call `store.setBars()`?
2. Did any feature renderer decide a primary chart load range?
3. Did any non-chart runtime call `chart.setData()` or `chart.updateBar()`?
4. Did a new event include a documented owner and payload?
5. Did replay behavior change without a mode/runtime contract update?
6. Can the app still load a normal toolbar date range?
7. Can comparison still follow the primary range?
8. Can legacy replay still enter, step, and exit?
