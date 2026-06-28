# Step 353 - Unused Code Cleanup and High-Coupling Split Plan

## Goal

Continue the post-Step 352 cleanup before implementing FX Replay behavior.

This step is still refactor-only. It should remove or connect clearly unused
code and split the highest-risk coordination modules so the next replay
implementation is not coupled to right-click workflows, Data Maintenance,
Inspector routing, archive import/export, or large CSS moves.

## Audit Baseline

Branch: `refactor/v4-module-boundaries`

Current state after Step 352:

- `v4_api.py` no longer owns workspace, maintenance, economic calendar, or bars
  service internals.
- Replay, Toolbar, Calendar Navigator, Inspector shell/action/selection routing,
  and Inspector Calendar Panel have initial module boundaries.
- Runtime debug logging is behind `v4:debug` / `window.__V4_DEBUG__`.
- Local smoke passed after Step 352 and after the economic calendar cache fix.

Full-code audit after Step 352 found:

- No broad `TODO` / `FIXME` / `debugger` / `console.log` noise in runtime code.
- `legacy` names are mostly compatibility schema or intentionally named legacy
  replay boundaries and should not be mechanically deleted.
- `v4/src/daily-regime/daily-regime-range.js` appears to be the only clear
  source module with no runtime/test/HTML import.
- The largest remaining coupling is now frontend workflow composition, not
  backend API routing.

Large modules still needing attention:

- `v4/src/pda/manual-annotation.js`
- `v4/data-maintenance.html`
- `v4/src/ui/inspector-sidebar.js`
- `v4/src/live-record/tradovate-performance-importer.js`
- `v4/src/review/review-archive.js`
- `v4/style.css`

## Non-Goals

- Do not implement FX Replay session loading in Step 353.
- Do not revive the reverted Step 353 date-range/full-range replay behavior.
- Do not delete compatibility fields merely because they contain `legacy`.
- Do not perform a full CSS rewrite in one step.
- Do not change user-visible behavior unless a substep explicitly resolves a
  previously unused module by connecting it to the existing intended behavior.

## Step Plan

### Step 353.1 - Resolve unused `daily-regime-range.js` ✅

Decision step: either connect the module to the daily-regime loader or remove it.

Deliverables:

- Confirm whether ATR/range regime should be computed from loaded bars or remain
  CSV-owned.
- If kept, wire `applyRangeRegimes()` into the daily-regime loading path and add
  smoke coverage.
- If removed, delete the unused module and add a guard/smoke proving no runtime
  imports depend on it.

Automated checks:

- `node v4/tests/daily-regime-loader-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Load a normal date range and confirm Calendar daily regime labels still show
  expected trend/range/VIX/event summary.

Commit message:

- `Resolve unused daily regime range module`

Completion notes:

- Decision: remove the unused module. Current Daily Regime trend/range values
  are CSV-owned via `data/daily-regime-*.csv` and parsed by
  `daily-regime-vix-loader.js`.
- Deleted `src/daily-regime/daily-regime-range.js`.
- Extended `module-boundary-closeout-smoke.py` with a guard so the deleted
  module does not return as unconnected runtime code.

### Step 353.2 - Split `manual-annotation.js` by workflow ✅

`manual-annotation.js` currently owns unrelated workflows: PDA context menu
composition, chart notes, range notes, time overlays, killzones, segments,
composites, order/live actions, global cancel, and menu DOM routing.

Target modules:

- `pda/manual-chart-note-actions.js`
- `pda/manual-time-overlay-actions.js`
- `pda/manual-segment-actions.js`
- `pda/manual-context-menu-router.js`

Final responsibility:

- `manual-annotation.js` initializes chart right-click behavior, composes
  workflow controllers, and handles global cancel/escape only.

Automated checks:

- `node v4/tests/context-menu-position-smoke.js`
- `node v4/tests/manual-range-prices-smoke.js`
- `node v4/tests/chart-note-store-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/live-record-chart-actions-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Main chart right-click still opens the same menu groups.
- PDA creation, Chart Note add/edit/delete, Range Chart Note, Time Line,
  Killzone, Segment start/end, Composite draft, Order Setup, and Live Record
  actions still behave as before.

Commit message:

- `Split manual annotation workflows`

Completion notes:

- Extracted Chart Note / Range Chart Note workflow to
  `pda/manual-chart-note-actions.js`.
- Extracted Time Line / Killzone workflow to
  `pda/manual-time-overlay-actions.js`.
- `manual-annotation.js` now composes those controllers for menu rendering,
  action dispatch, Escape handling, and bars loaded/cleared reset.
- Added `manual-annotation-boundary-smoke.js` and included it in
  `smoke_all.py --suite local`.
- During Step 353.2 validation, `live-record-chart-actions-smoke.js` exposed an
  existing `context is not defined` bug in Live Record creation. Fixed
  `handleLiveRecordChartAction()` to accept the source metadata already passed
  by callers.

### Step 353.3 - Modularize `data-maintenance.html` scripts ✅

Move the 800+ lines of inline script into explicit maintenance modules.

Target modules:

- `src/maintenance/maintenance-api-client.js`
- `src/maintenance/environment-panel.js`
- `src/maintenance/refresh-range-panel.js`
- `src/maintenance/economic-calendar-panel.js`
- `src/maintenance/roll-calendar-panel.js`
- `src/maintenance/tradovate-import-panel.js`
- `src/maintenance/output-panel.js`

Final responsibility:

- `data-maintenance.html` keeps static layout and a small module entry script.

Automated checks:

- `node v4/tests/data-maintenance-api-base-smoke.js`
- `node v4/tests/tradovate-import-ui-modules-smoke.js`
- `node v4/tests/tradovate-performance-importer-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Data Maintenance can run Environment Status, Refresh Dry Run, Economic Status,
  Manual Economic Preview, Roll Preview, API Smoke, Tradovate Preview, and copy
  output from the same page.

Commit message:

- `Split data maintenance scripts`

Completion notes:

- Replaced the two large inline `data-maintenance.html` scripts with one
  module entry: `src/maintenance/data-maintenance-app.js`.
- Added `src/maintenance/maintenance-api-client.js`,
  `environment-panel.js`, `refresh-range-panel.js`,
  `economic-calendar-panel.js`, `roll-calendar-panel.js`,
  `tradovate-import-panel.js`, and `output-panel.js`.
- Kept the HTML as static layout plus entry script; API request handling,
  output summarization, form payload builders, date helpers, and Tradovate
  import UI logic now live behind module boundaries.
- Updated `data-maintenance-api-base-smoke.js` to test the exported API client
  instead of regex-extracting code from HTML.
- Added `data-maintenance-boundary-smoke.js` and included it in
  `smoke_all.py --suite local`.
- Validation passed:
  `node v4/tests/data-maintenance-api-base-smoke.js`,
  `node v4/tests/data-maintenance-boundary-smoke.js`,
  `node v4/tests/tradovate-import-ui-modules-smoke.js`,
  `node v4/tests/tradovate-performance-importer-smoke.js`,
  `python3 v4/scripts/smoke_all.py --suite local`, and
  `git diff --check`.

### Step 353.4 - Continue `inspector-sidebar.js` split ✅

The sidebar still owns page render routing, detail render functions, calendar
sync, and controller composition.

Target modules:

- `ui/inspector/inspector-detail-renderer.js`
- `ui/inspector/inspector-page-router.js`
- `ui/inspector/inspector-calendar-sync.js`

Final responsibility:

- `inspector-sidebar.js` composes controllers and shell wiring only.

Automated checks:

- `node v4/tests/inspector-shell-boundary-smoke.js`
- `node v4/tests/inspector-selection-router-boundary-smoke.js`
- `node v4/tests/inspector-action-router-boundary-smoke.js`
- `node v4/tests/inspector-calendar-panel-boundary-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Selecting PDA, Segment, SMT, Order Setup, Live Record, Daily Time Review,
  Economic Event, Entry Context Catalog, and Calendar day objects still opens
  the correct Inspector page and Back navigation works.

Commit message:

- `Split inspector page routing`

Completion notes:

- Added `ui/inspector/inspector-detail-renderer.js` for detail/home/archive
  body composition.
- Added `ui/inspector/inspector-page-router.js` for Inspector page kind/detail
  type routing and Back fallback rendering.
- Added `ui/inspector/inspector-calendar-sync.js` for Calendar date context,
  open-date events, and primary chart click date-follow behavior.
- `inspector-sidebar.js` now keeps controller construction, selection refresh,
  and remaining cross-domain open-object coordination; detail rendering and
  page routing are delegated.
- Validation passed:
  `node v4/tests/inspector-shell-boundary-smoke.js`,
  `node v4/tests/inspector-selection-router-boundary-smoke.js`,
  `node v4/tests/inspector-action-router-boundary-smoke.js`,
  `node v4/tests/inspector-calendar-panel-boundary-smoke.js`,
  `python3 v4/scripts/smoke_all.py --suite local`, and
  `git diff --check`.

### Step 353.5 - Split Tradovate importer domain ✅

`tradovate-performance-importer.js` mixes CSV parsing, file alignment,
reconciliation, PnL helpers, and archive building.

Target modules:

- `live-record/tradovate-csv-parsers.js`
- `live-record/tradovate-file-alignment.js`
- `live-record/tradovate-live-record-builder.js`
- `live-record/tradovate-format.js`

Final responsibility:

- `tradovate-performance-importer.js` becomes a compatibility facade exporting
  the current public functions.

Automated checks:

- `node v4/tests/tradovate-performance-importer-smoke.js`
- `node v4/tests/tradovate-import-ui-modules-smoke.js`
- `node v4/tests/tradovate-zip-import-browser-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Data Maintenance Tradovate ZIP and individual CSV inputs still preview and
  download the same Review JSON shape.

Commit message:

- `Split Tradovate importer domain`

Completion notes:

- Replaced `live-record/tradovate-performance-importer.js` with a compatibility
  facade that preserves existing public imports.
- Added `tradovate-csv-parsers.js` for CSV parsing, timestamp conversion,
  money parsing, symbol mapping, and row id helpers.
- Added `tradovate-file-alignment.js` for file alignment and
  position/cash/balance reconciliation.
- Added `tradovate-format.js` for Review JSON constants, stable imported
  record ids, and PnL display formatting.
- Added `tradovate-live-record-builder.js` for Live Record and Review archive
  construction.
- Validation passed:
  `node v4/tests/tradovate-performance-importer-smoke.js`,
  `node v4/tests/tradovate-import-ui-modules-smoke.js`,
  `node v4/tests/tradovate-zip-import-browser-smoke.js`,
  `python3 v4/scripts/smoke_all.py --suite local`, and
  `git diff --check`.

### Step 353.6 - Continue Review Archive import pipeline split

`review-archive.js` still owns export payload, import validation, id mapping,
ref remapping, per-domain prepare logic, store loading, and UI file handling.

Target modules:

- `review/review-archive-import-maps.js`
- `review/review-archive-import-prepare.js`
- `review/review-archive-store-loader.js`

Final responsibility:

- `review-archive.js` orchestrates export/import and UI status only.

Automated checks:

- `node v4/tests/review-archive-domain-boundary-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/daily-time-review-archive-smoke.js`
- `node v4/tests/notes-review-domains-persistence-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Export Review JSON, import same file, and confirm PDA/Segment/Order/Live/Daily
  Time/Chart Note/Economic Note objects remain present and linked refs still
  locate correctly.

Commit message:

- `Split review archive import pipeline`

### Step 353.7 - CSS domain split planning and first safe extraction

Do not move all of `style.css` at once. Start with a low-risk extraction and a
style import pattern that can be repeated.

Deliverables:

- Document CSS domain order: base/layout, toolbar, chart/comparison, inspector,
  calendar, context menu, maintenance.
- Extract one low-risk domain only if import mechanics are clear.
- Add or update a browser smoke if the extracted domain affects visible layout.

Automated checks:

- `node v4/tests/comparison-window-browser-smoke.js` if comparison styles move.
- `node v4/tests/remote-maintenance-responsive-smoke.js` if maintenance styles move.
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Open the app and Data Maintenance page; confirm toolbar, chart area,
  Inspector, Calendar, Comparison Window, and maintenance layout still match
  pre-split appearance.

Commit message:

- `Plan CSS domain split`

### Step 353.8 - Closeout audit and boundary guards

Record the new baseline after cleanup and splits.

Deliverables:

- Update TODO/session with completed Step 353 substeps.
- Add or extend boundary smoke so extracted modules do not collapse back into
  shell files.
- Re-run large-file and no-import audits.
- Record remaining 500+ line modules and explicit defer reasons.

Automated checks:

- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual check:

- Exercise the workflows touched by Step 353: right-click menu, Inspector object
  pages, Data Maintenance, Review JSON import/export, and Tradovate import.

Commit message:

- `Close Step 353 module cleanup`

## Recommended Execution Order

1. Step 353.1 first because it is the only clear unused-code decision.
2. Step 353.2 next because right-click workflow coupling is the most likely to
   interfere with future replay/bar-window work.
3. Step 353.3 before broader UX work because Data Maintenance is currently an
   HTML script island with no reusable module boundary.
4. Step 353.4 after manual annotation because Inspector depends on many of the
   same object workflows.
5. Step 353.5 and 353.6 are domain cleanups with good smoke coverage.
6. Step 353.7 should stay small and conservative.
7. Step 353.8 closes the baseline before FX Replay implementation resumes.
