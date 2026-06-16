# 2026-06-16 Journal Import / Live Record Polish Handoff

## Context

After Step 291 economic calendar backfill, the work shifted to trialing journal data entry from broker/exported data and tightening the Live Record review workflow around imported Tradovate executions.

This file records the post-Step-291 work that was not previously captured in TODO/session handoff notes.

## Completed Work

### Tradovate Performance CSV -> Live Records

- Added a Tradovate Performance CSV importer that converts each closed trade row into one closed Live Record review payload.
- Added the importer UI to `data-maintenance.html` under `Tradovate Live Records`.
- Supported `Auto` instrument detection and split mixed MES/MNQ exports into separate ES/NQ Review JSON files.
- Mapped micro contracts to the system instruments:
  - `MES*` / `ES*` -> `ES`
  - `MNQ*` / `NQ*` -> `NQ`
- Defaulted timestamp parsing to `V4 chart wall time` to avoid the observed four-hour offset in imported Tradovate rows.
- Winning imported trades now use the exit as `Target Internal 1` when no explicit target is supplied.
- Losing imported trades now use the exit as `Stop Loss` when no explicit stop is supplied.
- Import output JSON remains instrument-scoped and is rejected by Review JSON import if imported into the wrong current Main instrument.

### Live Record Result / Risk-Reward Rendering

- Aligned Live Record Result UI with Order Setup Result style.
- Replaced the earlier live-specific result wording with profit/stop-loss oriented fields.
- Added Live Record Entry Context panel matching Order Setup Entry Context controls.
- Fixed imported profitable records so the reward side can render from exit/target fallback even when no stop-loss or explicit target was drawn.
- Fixed risk/reward box rendering so imported win/loss records can draw a meaningful box from available entry/stop/target/exit data.

### Active Selection / Detail Behavior

- Tightened Live Record and Order Setup active selection so only one object family is active at a time for visual emphasis.
- Selecting a Live Record anchor opens Live Record Detail.
- Selecting an Order Setup reversal opens Order Setup Detail.
- Creating or selecting one object family clears the other family's active state to avoid two filled active markers.

### Visual Distinction

- Changed Order Setup reversal markers to hollow triangles, including active green/red/yellow states.
- Live Record anchor markers remain filled so live executions are visually distinct from backtesting/order setup markers.

### Data Maintenance UI

- Reworked `data-maintenance.html` into a friendlier maintenance workbench:
  - left-side action cards;
  - right-side sticky Output panel;
  - page scrolling restored after the first fixed-output attempt;
  - Output includes `Copy` and `Latest` controls;
  - append output scrolls to the latest result.
- Improved Tradovate output filename behavior:
  - selecting a CSV first uses the CSV filename as a suffix;
  - preview/download then upgrades the filename to include instrument and imported date range;
  - mixed-instrument CSV downloads get separate ES/NQ filenames.

### Matched Setup Workflow

- Reframed Live Record -> Order Setup linking as `Matched Setup`, not "pre-planned setup" linking.
- Added a direct Setup dropdown in Live Record Detail, so matching no longer depends on keeping both Live Record and Order Setup active at the same time.
- Candidate Setup dropdown is filtered to:
  - same instrument as the Live Record;
  - same calendar day as the Live Record anchor/entry;
  - existing off-day match is preserved if already linked.
- Dropdown labels now prioritize intraday entry time, then reversal time, direction, event type/timeframe, and short id so candidates are distinguishable at a glance.
- Kept `Match Active Setup` as a shortcut, but the dropdown is the preferred workflow.

### Live Record Detail Navigation

- Added calendar date derivation for Live Records.
- Fixed Live Record Detail opened from chart selection so it prepares a back target and displays the same `Back` button behavior as Order Setup Detail.

### Full Chinese Operation Manual

- Added `v4/docs/user/OPERATION_MANUAL.zh-CN.html` as the detailed Chinese operation manual.
- Linked the manual from `v4/docs/README.md`.
- The manual covers:
  - startup and service URLs;
  - Backtesting workspace workflow;
  - Main/Sub instrument usage;
  - Order Setups and Live Records;
  - Tradovate Performance CSV import;
  - Review JSON import/export;
  - Data Maintenance refresh range, economic calendar, roll calendar, and verification actions;
  - common failure messages and recovery guidance.
- The manual is intentionally HTML so it can be opened directly in the browser alongside `index.html` and `data-maintenance.html`.

### Merge / Push Closeout

- Merged `origin/main` after local work was ahead and remote had older Journal workspace history.
- Conflict was limited to `v4/TODO.md`.
- Resolution preserved the current zero-restart Live Record direction and did not reintroduce the older standalone Journal workspace implementation.
- Pushed `main` to GitHub at `bd5472030e16ffeaaa5db8ddd8432d1932f19852`.

## Validation Run

- `git diff --check`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/ui/inspector/calendar-object-date.js`
- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node --check v4/src/ui/inspector/live-record-actions.js`
- `node v4/tests/live-record-browser-smoke.js`
- `node v4/tests/tradovate-performance-importer-smoke.js`
- `git diff --check` after merge conflict resolution
- `git status --short --branch` after push confirmed local `main` matched `origin/main`

The Node module-type warnings are existing package metadata warnings and did not fail the checks.

## Current Workflow Notes

- To import ES live records, switch `Main` to `ES` before importing the ES Review JSON.
- To import NQ live records, switch `Main` to `NQ` before importing the NQ Review JSON.
- Imported MES/MNQ data is intentionally normalized to ES/NQ for this system, but Review JSON import remains protected against cross-instrument mistakes.
- Matching a Live Record to a setup is a review-time comparison workflow: it pairs the actual execution with the ideal/backtesting setup, not necessarily with a setup that existed before the live decision.

## Next Recommended Work

- Trial one real journal entry day end to end:
  1. import matching NQ/ES Review JSON for the current Main instrument;
  2. create or refine same-day ideal Order Setups;
  3. match each Live Record to the closest ideal setup;
  4. fill summary/reasons/result and mark reviewed.
- After the first full trial, decide whether the Matched Setup candidate filter should narrow further by time window around live entry.
