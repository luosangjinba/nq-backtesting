# 2026-06-20 Live Execution Result / Lessons Handoff

This handoff records the post-Step-304 work so a fresh context can resume without relying on chat history.

## Current Branch State

- Branch: `main`
- Latest commit before this handoff doc: `dc91497 Add maintainable live lesson scopes`
- Worktree was clean before writing this handoff.
- `main` was ahead of `origin/main` by 56 commits before this handoff commit.

## Completed After Step 304

### Add-on / Over-closed Summary Fix

Commit: `47e327d Fix live add-on execution summaries`

- `Open` summary now counts only initial entry contracts/orders.
- Same-side filled orders after initial entry remain in `Open Review`.
- Position summary no longer presents unsupported add-on or over-closed flows as normal `flat`.
- Over-closed flows show an explicit over-closed quantity.

Files:

- `v4/src/live-record/live-record-execution-flow.js`
- `v4/tests/live-record-smoke.js`

### Manual Loss vs Stop Loss

Commit: `862bdf5 Distinguish manual loss live exits`

- Added Live Result exit type `manualLoss`.
- `Stop Loss` now means a real filled stop order.
- Losing `Market` or `Limit` exits are `Manual Loss`.
- Losing filled limit orders are rendered under `Manual Exits`, not `Target Exits`.
- Tradovate import no longer fabricates `stopLoss` when Orders CSV does not prove a filled stop.

Files:

- `v4/src/live-record/live-record-types.js`
- `v4/src/live-record/live-record-execution-flow.js`
- `v4/src/live-record/tradovate-performance-importer.js`
- `v4/src/ui/inspector/live-record-panel.js`
- `v4/tests/live-record-smoke.js`
- `v4/tests/tradovate-performance-importer-smoke.js`

### Manual Profit vs Target Hit

Commit: `23c488b Distinguish manual profit live exits`

- Added Live Result exit type `manualProfit`.
- Result dropdown now distinguishes:
  - `Target Hit`
  - `Manual Profit`
  - `Stop Loss`
  - `Manual Loss`
  - `Breakeven`
  - `Unknown`
- Profitable filled `Limit` exits import as `profit` / Target Hit.
- Profitable filled `Market` exits import as `manualProfit`.
- Manual profit exits render under `Manual Exits`; target hits render under `Target Exits`.
- Without Orders CSV proof of a target order, profitable imports are conservative and use `manualProfit`.

Files:

- `v4/src/live-record/live-record-types.js`
- `v4/src/live-record/live-record-execution-flow.js`
- `v4/src/live-record/tradovate-performance-importer.js`
- `v4/src/ui/inspector/live-record-panel.js`
- `v4/tests/live-record-smoke.js`
- `v4/tests/tradovate-performance-importer-smoke.js`

### Live Record Calendar Marker

Commit: `cbd6eae Add live record calendar marker`

- Inspector Calendar month cells now show a distinct Live Record marker.
- Order Setup keeps the existing red circular marker.
- Live Record uses a separate teal diamond marker.
- Calendar day title includes `Live Records: N`.

Files:

- `v4/src/ui/inspector/calendar-panel.js`
- `v4/style.css`
- `v4/tests/live-record-smoke.js`

### Maintainable Lesson Scopes

Commit: `dc91497 Add maintainable live lesson scopes`

- Maintain Catalogs -> Lessons now has per-lesson applicability checkboxes:
  - `Open`
  - `Manual Exits`
  - `Target Exits`
  - `Stop Loss`
- Lesson scope is stored on catalog items as `lessonRoles`.
- Live Record `Execution Orders` filters lesson checkboxes by order role.
- Already selected lessons always remain visible so they can be removed.
- Lessons without scope remain global.
- Default inferred scopes for common labels:
  - `Tight Stop-loss` -> `Stop Loss`
  - `Early Cut` -> `Manual Exits`
  - `Late Entry & Bad Stop` -> `Open`, `Stop Loss`
  - `Revenge Trade` / `Ravenge Trade` -> `Open`

Files:

- `v4/src/entry-context/entry-context-catalog-store.js`
- `v4/src/ui/inspector/entry-context-catalog-actions.js`
- `v4/src/ui/inspector/entry-context-catalog-panel.js`
- `v4/src/ui/inspector/live-record-panel.js`
- `v4/tests/entry-context-catalog-smoke.js`
- `v4/tests/live-record-smoke.js`

### Manual Exit Risk/Reward Box

Commit: pending after this handoff update

- `manualLoss` Risk box endpoint uses actual `result.exitPrice` / `result.exitTimestamp`.
- `manualProfit` Reward box endpoint uses actual `result.exitPrice` / `result.exitTimestamp`.
- Preset stop-loss / target elements are not used as the manual exit endpoint.

Files:

- `v4/src/live-record/live-record-renderer.js`
- `v4/tests/live-record-smoke.js`

## Current Live Result Semantics

- `profit`: target hit, normally a profitable filled limit target.
- `manualProfit`: manually closed profitable exit, normally market exit or user-marked manual profit.
- `stopLoss`: real filled stop-loss order.
- `manualLoss`: manually closed losing exit, including market loss or limit loss that is not a preset target.
- `breakeven`: breakeven exit.
- `unknown`: not classified.

## Current Execution Orders Groups

`buildLiveRecordExecutionFlow()` returns a live-only grouped model:

- `Position`
- `Open`
- `Target Exits`
- `Manual Exits`
- `Stop Loss`
- optional `Open Review`
- optional `Review Orders`

Backtesting Result remains unchanged. Live Result remains a total result; multi-exit details live in `Execution Orders`.

## Verification Used Recently

- `node --check v4/src/live-record/live-record-types.js`
- `node --check v4/src/live-record/live-record-execution-flow.js`
- `node --check v4/src/live-record/live-record-renderer.js`
- `node --check v4/src/live-record/tradovate-performance-importer.js`
- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node --check v4/src/ui/inspector/calendar-panel.js`
- `node --check v4/src/entry-context/entry-context-catalog-store.js`
- `node --check v4/src/ui/inspector/entry-context-catalog-panel.js`
- `node --check v4/src/ui/inspector/entry-context-catalog-actions.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/tradovate-performance-importer-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `node v4/tests/entry-context-catalog-integration-smoke.js`
- `node v4/tests/calendar-visibility-smoke.js`
- `node v4/tests/live-record-browser-smoke.js`
- `git diff --check`

## Notes For Next Context

- The user is still in test-stage data mode; old data compatibility is not required unless explicitly requested.
- The user prefers step-based work and commits after each completed substep.
- The next likely area is UX polish from actual data entry, not schema migration.
