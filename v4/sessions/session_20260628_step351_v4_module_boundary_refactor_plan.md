# Step 351 - V4 Module Boundary Refactor Plan

## Goal

Rebuild V4's frontend module boundaries before adding another major behavior
change such as FX Replay-style sessions. The current Step 350 baseline is
stable, but core responsibilities are still mixed across UI files, data stores,
chart adapters, replay controls, comparison panes, and feature renderers.

This refactor is intentionally broad. The objective is not to make files
smaller for its own sake; the objective is to make ownership explicit enough
that future behavior changes have one correct place to live.

## Current Baseline

- Branch baseline: `a08ed9f Add operations runbook and smoke entry`.
- Step 351-353 replay/window attempts were rolled back and retained only on
  `backup/step353-before-rollback-bbe36d3`.
- Local smoke at the baseline passes with `python3 v4/scripts/smoke_all.py --suite local`.

## Architectural Problems To Fix

1. Multiple modules can load bars directly.
   `Toolbar`, `Calendar`, `Viewport`, `Replay History`, `Time Reaction`,
   `Comparison`, `PDA context`, `Order`, and `Segment` code can call
   `fetchBars()` independently. This makes it hard to define one chart loading
   model.

2. Main chart writes are not owned by a runtime controller.
   `app.js` listens to `bars:loaded` and writes chart data directly, while replay
   controls also call chart mutation methods directly.

3. UI files own business behavior.
   `toolbar.js`, `calendar-navigator.js`, `replay-controls.js`, and
   `inspector-sidebar.js` mix DOM rendering, event handling, API calls, store
   mutation, chart mutation, and cross-feature coordination.

4. Replay is not a standalone domain.
   Current replay behavior slices already loaded bars. FX Replay-style sessions
   need a separate session model, cursor policy, chunk loader, and reveal
   controller.

5. Event bus usage is too implicit.
   `bus.on()` / `bus.emit()` remain useful, but event names and payload ownership
   need contracts. The event bus should not be the hidden architecture.

## Refactor Rules

- Preserve current behavior after each step unless the step explicitly changes a
  documented behavior.
- Every step must leave the app runnable and smokeable.
- UI modules may dispatch commands but must not own chart data loading.
- Feature renderers may read current display bars, but must not decide the main
  chart loading mode.
- New modules must have clear ownership comments and tests when they encode
  policy.
- Do not reintroduce Step 351 virtual-window behavior or Step 353 replay-session
  behavior during this refactor unless a later step explicitly starts a new
  replay implementation.

## Step Plan

### Step 351.1 - Runtime Inventory And Contracts

Create a lightweight architecture inventory that lists all modules allowed to:

- Fetch bars.
- Write primary bars.
- Mutate the primary chart series.
- Change visible logical range.
- Emit/consume core runtime events.

Deliverables:

- Add `v4/docs/planning/v4_module_boundaries.md`.
- Add initial event contract notes for `bars:loaded`, `bars:cleared`,
  `replay:changed`, `comparison-bars:loaded`, and `status:update`.
- No runtime behavior changes.

Automated checks:

- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Open `v4/index.html`.
- Load a normal NQ 1M range.
- Confirm the chart renders and the toolbar status still reports loaded bars.
- Open Pane 1/Comparison and confirm it can still follow the primary range.

### Step 351.2 - Bars API Client Boundary

Move low-level bar request handling behind a dedicated bars client module.
Direct `fetchBars()` usage outside the new boundary must be eliminated or
explicitly wrapped.

Deliverables:

- Add `v4/src/data/bars/bars-api-client.js`.
- Add `v4/src/data/bars/bars-request.js` for request normalization.
- Existing `api.js` may remain as a low-level transport, but UI files must not
  import it directly.
- Add a smoke test that asserts UI modules do not import `../api.js` or
  `../../api.js`.

Automated checks:

- `node v4/tests/bars-api-boundary-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Load NQ and ES through the toolbar.
- Trigger Calendar Load Week / manual date range load.
- Trigger Time Reaction timeframe switch if available.
- Confirm all paths still load bars and show errors through the same status area.

### Step 351.3 - Primary Bars Runtime

Introduce one primary bars runtime as the only writer to `bar-store`.

Deliverables:

- Add `v4/src/runtime/primary-bars-runtime.js`.
- Move toolbar/calendar/viewport/replay-history/time-reaction primary load paths
  to command functions such as `loadPrimaryRange()`.
- Keep `bar-store` as state storage, but stop letting UI files call
  `store.setBars()` directly.

Automated checks:

- Add or update smoke coverage for toolbar load, calendar load, viewport window
  navigation, replay history restore, and time reaction reload.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Use Toolbar Date Range load.
- Use Calendar load controls.
- Use Viewport Prev/Next controls where available.
- Restore a replay history item.
- Confirm every path updates one primary chart and does not leave stale status.

### Step 351.4 - Chart Series Runtime

Move primary chart data projection and `chart.setData()` ownership out of
`app.js` and replay controls.

Deliverables:

- Add `v4/src/runtime/primary-chart-runtime.js`.
- Add a chart data projector that converts bars to LightweightCharts data.
- `app.js` should initialize the runtime only; it must not directly transform
  bars or call `chart.setData()` in event handlers.
- Replay controls must request chart state changes through the runtime.

Automated checks:

- `node v4/tests/time-projection-smoke.js`
- Browser smoke for primary chart render if available.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Load 1M, 5M, 1H, and 1D ranges.
- Confirm candle times and day labels are correct.
- Confirm replay cursor and pick preview still render in the right position.

### Step 351.5 - Command Bus And UI Command Boundary

Separate UI event handling from business execution. Toolbar, Calendar, Viewport,
and Replay controls should dispatch commands or call command handlers rather
than directly orchestrating stores and chart modules.

Deliverables:

- Add `v4/src/runtime/commands.js`.
- Define command handlers for primary range load, timeframe change, instrument
  change, replay toggle, replay step, comparison toggle, and viewport navigation.
- UI files keep DOM/rendering code but delegate execution.

Automated checks:

- Add command smoke tests for command payload validation and no-op handling.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Use every toolbar control: instrument, timeframe, date range, grid toggle,
  display settings, undo/redo.
- Use replay controls: on/off, first, last position, pick, back/forward, speed.
- Confirm controls still update without duplicate loads.

### Step 351.6 - Mode Runtime

Introduce explicit chart modes so normal history browsing, legacy replay, and
future FX replay cannot silently share conflicting semantics.

Deliverables:

- Add `v4/src/runtime/chart-mode-store.js`.
- Define at least `history` and `legacy-replay` modes.
- Primary bars runtime and chart runtime must consult the active mode before
  writing chart series or changing cursor behavior.
- No FX Replay behavior yet.

Automated checks:

- Add smoke tests for mode transitions and illegal command rejection.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Load a normal range, enter replay, step forward/back, exit replay.
- Confirm full chart returns after replay exit.
- Confirm comparison pane remains coherent before/during/after replay.

### Step 351.7 - Replay Domain Split

Split legacy replay into model, controller, and view modules without changing its
current behavior.

Deliverables:

- Add `v4/src/features/replay/replay-model.js`.
- Add `v4/src/features/replay/replay-controller.js`.
- Move DOM view rendering under `v4/src/features/replay/replay-view.js` or keep
  the existing view file with a clear domain import path.
- `ui/replay-controls.js` should become a thin initializer or disappear.

Automated checks:

- Existing replay history/comparison tests.
- Add replay model unit smoke for cursor movement and restore snapshots.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Run legacy replay through the full toolbar.
- Save/restore replay history.
- Confirm replay cursor, pick cursor, and comparison replay sync still work.

### Step 351.8 - Toolbar Split

Split toolbar into independent submodules. Toolbar must not import data loading,
chart manager, comparison store, or history manager directly unless the import is
for rendering read-only state.

Deliverables:

- `toolbar-view.js`
- `toolbar-events.js`
- `toolbar-state.js`
- `toolbar-settings-view.js`
- `toolbar-pane-controls.js`
- `toolbar-date-range-controls.js`

Automated checks:

- Add toolbar DOM smoke for render/action bindings if practical.
- Existing display preference and primary instrument smokes.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Resize the browser and confirm toolbar text/buttons do not overlap.
- Change Pane/TF/instrument.
- Open settings popover and change/reset UI scale, chart text, and inspector
  density.
- Load a date range after each setting change.

### Step 351.9 - Calendar Split

Split Calendar Navigator into storage/history, date math, view rendering, and
load commands.

Deliverables:

- `calendar-date-range-history.js`
- `calendar-date-range-store.js`
- `calendar-navigator-view.js`
- `calendar-navigator-controller.js`
- Calendar load paths must use runtime commands.

Automated checks:

- Existing date range history workspace smoke.
- Calendar visibility smoke.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Load from date range history.
- Add/remove/rename history ranges if supported.
- Load a calendar week/day.
- Confirm workspace sync still persists date range history.

### Step 351.10 - Inspector Shell Split

Convert the large inspector sidebar into a shell plus feature panels. The shell
owns navigation and page stack only; feature panels own their own actions and
rendering.

Deliverables:

- `inspector-shell.js`
- `inspector-navigation.js`
- `inspector-panel-registry.js`
- Move remaining sidebar-only action glue into each feature panel.
- `inspector-sidebar.js` becomes a small compatibility initializer or is removed.

Automated checks:

- Existing inspector/panel smokes.
- `python3 v4/scripts/smoke_all.py --suite local`
- Browser smoke for a representative panel if available.
- `git diff --check`

Manual check:

- Open each inspector section: PDA, Segment, SMT, Order Review, Live Record,
  Economic Event, Chart Notes, Time Reaction.
- Navigate into and back out of nested pages.
- Confirm selected chart objects still show the correct panel details.

### Step 351.11 - Feature Domain Cleanup

Split the biggest domain modules after the runtime boundary is stable.

Target files:

- `pda/manual-annotation.js`
- `pda/manual-pda-actions.js`
- `order/order-setup-chart-actions.js`
- `live-record/live-record-chart-actions.js`
- `review/review-archive.js`
- `time-reaction/daily-time-review-store.js`

Deliverables:

- Each domain has clear `model`, `store`, `actions`, `renderer`, `selection`,
  and `persistence` boundaries where applicable.
- Feature modules cannot directly mutate primary chart data or range.
- Feature chart actions use chart adapters and command/runtime APIs.

Automated checks:

- Run all existing feature smokes touched by the step.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Create/edit/delete representative PDA objects.
- Draw/edit/delete segments and SMT.
- Create/edit order review/setup objects.
- Import or review live records.
- Confirm annotations persist across refresh.

### Step 351.12 - Persistence Boundary

Unify local/server workspace persistence patterns. Stores should declare schema,
scope, migration, and conflict behavior explicitly.

Deliverables:

- Add `v4/src/storage/workspace-domain-registry.js`.
- Move workspace domain metadata out of scattered feature modules where possible.
- Add schema/version metadata for major persisted domains.
- Keep existing stored data compatible.

Automated checks:

- Existing workspace and persistence smokes.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Refresh browser after editing PDA, segments, order reviews, chart notes, live
  records, display settings, and date range history.
- Confirm server workspace sync still works on two browser sessions if available.

### Step 351.13 - Backend API Modularization

Split `v4_api.py` into focused handler modules after frontend load paths are
stable.

Deliverables:

- `server/bars_handler.py`
- `server/workspace_handler.py`
- `server/maintenance_handler.py`
- `server/economic_calendar_handler.py`
- `v4_api.py` remains a small HTTP router and process entry point.

Automated checks:

- Python compile for all server modules.
- `python3 v4/scripts/smoke_all.py --suite local`
- `python3 v4/scripts/smoke_all.py --suite api` when a server is running.
- `git diff --check`

Manual check:

- Start local API and web server.
- Load K lines through the browser.
- Open Data Maintenance and run dry-run actions only.
- Read/write workspace documents through normal UI flows.

### Step 351.14 - FX Replay Design Gate

Only after the runtime/mode/data/chart boundaries are stable, write the new FX
Replay design and implementation plan.

Deliverables:

- New session doc for FX Replay.
- Explicit session model: `sessionStart`, `sessionEnd`, `cursor`, `loadedPrefix`,
  `revealedForward`, `loadedChunks`.
- Explicit loading law: no future bars load unless forward replay reveals them.
- Explicit viewport law: prefix bars are loaded for current visible demand and
  released by retention policy.

Automated checks:

- Design-only step must still run `python3 v4/scripts/smoke_all.py --suite local`.
- `git diff --check`

Manual check:

- Review the design against FX Replay screenshots and expected interaction
  rules.
- Confirm no implementation begins before the model and manual acceptance
  criteria are approved.

## Global Manual Regression Checklist

Run this checklist after every step that changes runtime behavior:

1. Browser opens without console initialization errors.
2. Toolbar can load NQ 1M and ES 1M.
3. Toolbar can switch timeframe and instrument.
4. Main chart candles, OHLC legend, price scale, and time axis render correctly.
5. Replay legacy controls can enter, step, play, pause, and exit.
6. Pane 1/Comparison can enable, load, and sync with the primary chart.
7. PDA, Segment, SMT, Order Review, Live Record, Time Overlays, Chart Notes, and
   Economic Calendar overlays still render on normal bars.
8. Inspector opens every major panel without stale selected-object state.
9. Refreshing the browser preserves expected workspace/local state.
10. No feature performs a full-range 1m request beyond the backend safety limit.

## Commit Discipline

- Commit each substep separately.
- Every commit message should name the boundary being changed.
- Do not mix feature behavior changes with mechanical moves.
- If a manual check fails, fix or revert before starting the next substep.
- Keep `backup/step353-before-rollback-bbe36d3` untouched as a reference only.

