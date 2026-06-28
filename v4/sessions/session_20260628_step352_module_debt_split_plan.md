# Step 352 - V4 Module Debt Split Follow-up Plan

## Goal

Continue the Step 351 module boundary work by removing the remaining high-risk
coordination modules and runtime noise before implementing FX Replay behavior.

This step is still a refactor stage. It must not implement the new FX
Replay-style session loader. The objective is to make the next replay change
smaller and less likely to be dragged into legacy replay, toolbar, calendar, or
backend coupling.

## Audit Baseline

Current branch: `refactor/v4-module-boundaries`.

Step 351 completed:

- Primary bars loading boundary.
- Primary chart series runtime boundary.
- Runtime commands.
- Chart mode store.
- Initial legacy replay domain split.
- Toolbar view/state split.
- Calendar date range history/state/view split.
- Inspector shell split.
- Workspace domain registry.
- Backend endpoint handler delegation.
- FX Replay design gate.

Local audit after Step 351 found:

- `app.js` and `primary-chart-runtime.js` still produce noisy runtime logs.
- `ui/replay-controls.js` remains a 600+ line multi-role controller.
- `ui/inspector-sidebar.js` remains a 1200+ line feature router.
- `ui/calendar-navigator.js` and `ui/toolbar.js` remain partly split but still
  own several independent controllers.
- `ui/inspector/calendar-panel.js` still mixes data derivation and rendering.
- `v4_api.py` still owns workspace, maintenance, economic calendar, and bars
  business logic behind thin endpoint handlers.

Baseline validation:

- `python3 v4/scripts/smoke_all.py --suite local` passes.
- `git diff --check` passes.

## Non-Goals

- Do not implement FX Replay session loading in Step 352.
- Do not reintroduce the reverted Step 351 virtual-window logic.
- Do not reintroduce the reverted Step 353 full/date-range replay attempt.
- Do not change user-visible behavior unless a substep explicitly documents a
  small behavior-neutral cleanup.
- Do not combine mechanical moves with feature changes.

## Step Plan

### Step 352.1 - Runtime Debug Logging Cleanup

Reduce console noise without changing runtime behavior.

Deliverables:

- Add a small debug logger or debug flag for V4 runtime logs.
- Move `app.js` initialization logs behind the debug logger.
- Move `primary-chart-runtime.js` chart update logs behind the debug logger.
- Keep real `console.warn` / `console.error` paths for failures.

Automated checks:

- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Open the app and confirm the console no longer floods with `[V4] ... initialized`.
- Load a normal date range and confirm real failures still surface.

Commit message:

- `Reduce V4 runtime debug logging`

### Step 352.2 - Legacy Replay Naming Boundary

Clarify current replay naming before adding `fx-replay`.

Deliverables:

- Centralize current legacy replay mode/source names.
- Keep existing `history` and legacy slice replay behavior unchanged.
- Make future `fx-replay` naming clearly separate from legacy replay.
- Update smoke tests if they assert mode/source strings.

Automated checks:

- `node v4/tests/chart-mode-store-smoke.js`
- `node v4/tests/replay-model-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Replay On/Off works.
- Pick, First, Last Pos, Play, step forward/back behave the same as before.
- Replay history restore still works.

Commit message:

- `Clarify legacy replay mode naming`

### Step 352.3 - Replay Controller Split

Split `ui/replay-controls.js` into replay-specific modules while preserving
legacy behavior.

Target modules:

- `features/replay/replay-session-controller.js`
- `features/replay/replay-chart-adapter.js`
- `features/replay/replay-toolbar-sync.js`
- `features/replay/replay-history-controller.js`

Final responsibility:

- `ui/replay-controls.js` should own DOM binding, event dispatch, and render
  calls only.

Automated checks:

- `node v4/tests/replay-model-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Replay On shows the expected legacy slice.
- Play, pause, next, previous, First, Last Pos, Pick all work.
- Replay History can restore primary and comparison state.
- Changing timeframe while replay is active does not crash.

Commit message:

- `Split replay controller boundaries`

### Step 352.4 - Toolbar Interaction Controller Split

Split the remaining toolbar interaction responsibilities.

Target modules:

- `ui/toolbar/toolbar-settings-controller.js`
- `ui/toolbar/toolbar-layout-controller.js`
- `ui/toolbar/toolbar-pane-controller.js`
- `ui/toolbar/toolbar-range-controller.js`

Final responsibility:

- `ui/toolbar.js` should initialize and compose toolbar controllers.

Automated checks:

- `node v4/tests/toolbar-split-boundary-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Date Range button opens calendar.
- Active pane changes update symbol/timeframe controls.
- Settings popover works.
- Layout switch works.
- Undo/Redo state updates correctly.

Commit message:

- `Split toolbar interaction controllers`

### Step 352.5 - Calendar Navigator Controller Split

Split date math, loading, popover lifecycle, and history actions.

Target modules:

- `ui/calendar/calendar-date-utils.js`
- `ui/calendar/calendar-range-loader.js`
- `ui/calendar/calendar-popover-controller.js`
- `ui/calendar/calendar-history-controller.js`

Final responsibility:

- `ui/calendar-navigator.js` should only compose calendar controllers and expose
  `initCalendarNavigator(button)`.

Automated checks:

- `node v4/tests/calendar-split-boundary-smoke.js`
- `node v4/tests/date-range-history-workspace-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Date range selection loads data.
- Manual range loads data.
- History load/remove/clear works.
- Jump day locates the chart.

Commit message:

- `Split calendar navigator controllers`

### Step 352.6 - Inspector Selection Routing Split

Move selected-object event routing out of `inspector-sidebar.js`.

Target module:

- `ui/inspector/inspector-selection-router.js`

Scope:

- PDA selection events.
- Segment and segment group selection events.
- SMT selection events.
- Order Setup and Live Record selection events.
- Selection cleared / changed refresh wiring.

Automated checks:

- `node v4/tests/inspector-shell-boundary-smoke.js`
- Relevant selection smokes where available.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Selecting PDA, Segment, SMT, Order Setup, and Live Record opens the correct
  detail panel.
- Back navigation still returns to Calendar or the previous page.
- Deleting a selected object leaves Inspector in a valid state.

Commit message:

- `Split inspector selection routing`

### Step 352.7 - Inspector Action Routing Split

Move click/change dispatch and archive actions out of `inspector-sidebar.js`.

Target modules:

- `ui/inspector/inspector-action-router.js`
- `ui/inspector/inspector-change-router.js`
- `ui/inspector/inspector-archive-actions.js`

Automated checks:

- `node v4/tests/inspector-shell-boundary-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- PDA import/export works.
- Review import/export works.
- Calendar object menu works.
- Order reason reference pick works.
- Daily Time reference pick works.
- Entry Context Catalog can be opened and edited.

Commit message:

- `Split inspector action routing`

### Step 352.8 - Inspector Calendar Panel Split

Split calendar panel data derivation from rendering.

Target modules:

- `ui/inspector/calendar/calendar-panel-data.js`
- `ui/inspector/calendar/calendar-panel-view.js`
- `ui/inspector/calendar/calendar-day-groups.js`
- `ui/inspector/calendar/calendar-daily-time-summary.js`

Automated checks:

- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/time-reaction-panel-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Calendar month view renders.
- Daily object group counts are correct.
- Economic events, Daily Regime, Chart Notes, and Time Reaction sections render.
- Object visibility toggles still work.

Commit message:

- `Split inspector calendar panel`

### Step 352.9 - Backend Workspace Store Split

Move workspace persistence implementation out of `v4_api.py`.

Target module:

- `server/workspace_store.py`

Scope:

- Workspace domain/instrument normalization.
- Workspace document path resolution.
- Workspace response shape.
- Read/write document implementation.
- Workspace lock ownership.

Automated checks:

- `python3 -m py_compile v4/v4_api.py v4/server/workspace_store.py`
- `python3 v4/tests/workspace-api-smoke.py`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Display preferences save/restore.
- Date Range History sync.
- PDA/Segment/Order/Live workspace domains still save and restore.

Commit message:

- `Split backend workspace store`

### Step 352.10 - Backend Maintenance Services Split

Move maintenance and local environment operations out of `v4_api.py`.

Target modules:

- `server/maintenance_service.py`
- `server/local_env_service.py`

Scope:

- Maintenance command execution.
- Maintenance process lock/termination.
- Local env parse/write/status/update/delete.
- API restart action.

Automated checks:

- Python compile for backend modules.
- Data maintenance smoke where available.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Data Maintenance page opens.
- Dry-run maintenance actions return structured output.
- Local env status/update/delete still works.
- Restart action remains guarded by the existing trusted-admin rules.

Commit message:

- `Split backend maintenance services`

### Step 352.11 - Backend Economic Calendar Services Split

Move economic calendar read/query and manual import logic out of `v4_api.py`.

Target modules:

- `server/economic_calendar_service.py`
- `server/economic_manual_import.py`

Scope:

- Economic event file read/write.
- Economic event normalization/query.
- Manual CSV parse/preview/write.
- Duplicate/count helpers.

Automated checks:

- `python3 v4/tests/economic-manual-import-smoke.py`
- `python3 v4/tests/economic-weekly-manual-export-smoke.py`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Economic events API returns events.
- Manual CSV preview/write works on a test file.
- Calendar economic events still display.

Commit message:

- `Split backend economic calendar services`

### Step 352.12 - Backend Bars Service Split

Move bars validation and query implementation out of `v4_api.py`.

Target module:

- `server/bars_service.py`

Scope:

- Load range limits.
- Bars request validation.
- `query_v4_bars`.
- Keep price lookup in `server/price_lookup.py`.

Automated checks:

- `python3 -m py_compile v4/v4_api.py v4/server/bars_service.py`
- `python3 v4/scripts/verify_v4_bars_api.py` when an API server is running.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- `/v4/bars` returns the same shape as before.
- NQ/ES range load works.
- 1M and 1H backend safety limits behave the same.
- Toolbar and Calendar loads still work.

Commit message:

- `Split backend bars service`

### Step 352.13 - Boundary Guard Closeout

Add or strengthen smoke tests so the same debt does not return.

Guard targets:

- UI modules must use runtime commands for primary bar loading.
- Replay modules must not directly write primary bars except through the
  approved runtime/chart adapter boundary.
- `inspector-sidebar.js` must not regain large direct action switch blocks.
- `v4_api.py` must not regain workspace/economic/bars/maintenance business
  implementations after services are split.

Automated checks:

- New or updated boundary smoke tests.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Browser load range.
- Legacy Replay enter/step/play/exit.
- Calendar range load and jump day.
- Inspector major panels.
- Workspace save/restore.
- Data Maintenance dry-run.

Commit message:

- `Add module boundary guards`

## Execution Rules

- Commit each substep separately.
- Run each substep's targeted smoke before committing.
- Run `python3 v4/scripts/smoke_all.py --suite local` before each commit unless
  a step explicitly documents why it is delayed.
- Keep each commit scoped to one boundary.
- Do not start FX Replay implementation until Step 352.3 and the relevant
  toolbar/calendar boundaries are stable.

## Progress Log

### Step 352.1 Completed

- Added `v4/src/logger.js`.
- Replaced `app.js` initialization `console.log` calls with `debugLog()`.
- Replaced `primary-chart-runtime.js` chart update `console.log` with
  `debugLog()`.
- Runtime debug logs are now off by default and can be enabled with
  `localStorage.setItem('v4:debug', '1')` or `window.__V4_DEBUG__ = true`.
- User-facing warnings/errors remain on normal console paths.

### Step 352.2 Completed

- Added `CHART_MODES.FX_REPLAY` as a future mode name without wiring any FX
  Replay behavior.
- Added `CHART_MODE_SOURCES` for the current legacy replay transitions.
- Replaced hard-coded `legacy-replay-*` source strings in `ui/replay-controls.js`.
- Extended `chart-mode-store-smoke.js` to cover the reserved `fx-replay` mode
  name and legacy source constants.

### Step 352.3 Completed

- Added `features/replay/replay-chart-adapter.js` for chart cursor, visible
  range, and primary chart runtime delegation.
- Added `features/replay/replay-toolbar-sync.js` for toolbar range/instrument
  and comparison state restoration used by Replay History.
- Added `features/replay/replay-history-controller.js` for Replay History
  delete/clear/load actions.
- Updated `ui/replay-controls.js` to stop importing chart manager, primary chart
  runtime, comparison store, replay history store, and replay history actions
  directly.
- Added `replay-controller-boundary-smoke.js` and included it in local smoke.

### Step 352.4 Completed

- Added `ui/toolbar/toolbar-range-controller.js` for primary range reloads.
- Added `ui/toolbar/toolbar-pane-controller.js` for active pane
  instrument/timeframe switching and comparison pane descriptor sync.
- Added `ui/toolbar/toolbar-settings-controller.js` for the display settings
  popover.
- Added `ui/toolbar/toolbar-layout-controller.js` for layout popover behavior.
- Reduced `ui/toolbar.js` to shell rendering, controller composition, simple
  toggle wiring, status text, and undo/redo button state.
- Strengthened `toolbar-split-boundary-smoke.js` to prevent moved controller
  logic from returning to `toolbar.js`.

### Step 352.5 Completed

- Added `ui/calendar/calendar-date-utils.js` for date parsing, date shifting,
  range labels, history labels, target timestamps, and month cells.
- Added `ui/calendar/calendar-range-loader.js` for primary range loading and
  resolved-window loading from the calendar surface.
- Updated `ui/calendar-navigator.js` so it no longer owns pure date/label
  helpers or direct `resolveChartLoadRange` / `loadPrimaryRangeCommand` calls.
- Strengthened `calendar-split-boundary-smoke.js` to guard those boundaries.
- Left popover lifecycle in `calendar-navigator.js` for now because its DOM
  anchor and render callbacks are still tightly coupled; that can be split in a
  later smaller follow-up if needed.

### Step 352.6 Completed

- Added `ui/inspector/inspector-selection-router.js`.
- Moved selected-object and selection-refresh `bus.on(...)` wiring out of
  `ui/inspector-sidebar.js`.
- Sidebar now passes render callbacks and mutable state setters into the
  selection router.
- Added `inspector-selection-router-boundary-smoke.js` and included it in local
  smoke.

### Step 352.7 Completed

- Added `ui/inspector/inspector-action-router.js` for inspector click dispatch.
- Added `ui/inspector/inspector-change-router.js` for inspector change dispatch.
- Added `ui/inspector/inspector-archive-actions.js` for PDA/Review
  import/export, PDA server sync, and clear-saved actions.
- Updated `ui/inspector-sidebar.js` so it composes routers and keeps state plus
  render callbacks instead of owning the click/change dispatch body.
- Added `inspector-action-router-boundary-smoke.js` and included it in local
  smoke.

### Step 352.8 Completed

- Added `ui/inspector/calendar/calendar-daily-time-summary.js` for Time
  Reaction calendar rows, timestamps, previews, and group insertion.
- Added `ui/inspector/calendar/calendar-day-groups.js` for Chart Notes group
  insertion, auxiliary Calendar object groups, day overview markers, and bulk
  chart-object counts.
- Added `ui/inspector/calendar/calendar-panel-data.js` for loaded range,
  month cells, active dates, overlay/regime state, and panel data assembly.
- Added `ui/inspector/calendar/calendar-panel-view.js` for outer Calendar shell
  rendering.
- Reduced `ui/inspector/calendar-panel.js` to object row/group rendering,
  visibility hydration, economic filters, and compatibility exports.
- Added `inspector-calendar-panel-boundary-smoke.js` and included it in local
  smoke.

### Step 352.9 Completed

- Added `server/workspace_store.py`.
- Moved workspace domain/instrument normalization, document path resolution,
  response shaping, read/write implementation, and workspace lock ownership out
  of `v4_api.py`.
- Kept `v4_api.py` compatibility wrappers for `read_workspace_document()` and
  `write_workspace_document()` so existing tests and handler wiring continue to
  work while delegating implementation to `workspace_store`.
- Added `workspace-store-boundary-smoke.py` and included it in local smoke.

### Step 352.10 Completed

- Added `server/maintenance_service.py` for maintenance command execution,
  active process tracking, busy lock/job state, and API restart scheduling.
- Added `server/local_env_service.py` for local `.env.local`
  parse/write/status/update/delete behavior.
- Updated `v4_api.py` so maintenance command, local env, API restart, and
  guarded execution paths delegate to service modules.
- Added `maintenance-service-boundary-smoke.py` and
  `local-env-service-smoke.py`; included both in local smoke.

### Step 352.11 Completed

- Added `server/economic_calendar_service.py` for economic calendar file
  read/write, event normalization, cache ownership, and query filtering.
- Added `server/economic_manual_import.py` for manual CSV parse,
  preview/write, duplicate/date helpers, backups, and cache invalidation.
- Updated `v4_api.py` to retain compatibility wrappers while delegating
  economic event query and manual import behavior to service modules.
- Added `economic-calendar-service-boundary-smoke.py` and included it in local
  smoke.

### Step 352.12 Completed

- Added `server/bars_service.py`.
- Moved load range limits, estimated bar counts, bars request validation, and
  `query_v4_bars()` including CME daily aggregation out of `v4_api.py`.
- Kept `v4_api.py` compatibility wrappers for handler injection while
  delegating bars behavior to `bars_service`.
- Added `bars-service-boundary-smoke.py` and included it in local smoke.
