# Session 2026-06-12 - Journal Phase B

Branch: `feature/research-databento-data-journal`

Status: In progress.

## Goal

Implement Journal Phase B: minimal daily Journal workspace.

Phase A is frozen in `v4/docs/design/JOURNAL_MVP_DESIGN.md`. Phase B should implement only the smallest usable day-level Journal slice:

- App shell workspace switch.
- Journal workspace surface.
- Journal Day store and persistence.
- Date/account day selection.
- Day-level fields:
  - day mode
  - pre-market plan
  - mental state
  - post-market summary
  - discipline summary

Actual trade logging, fills, ideal trades, Review JSON archive integration, and statistics are not part of the first Phase B slice unless explicitly added later.

## Step 285 Plan

### Step 285.1 - App Shell Boundary

Add a visible `Backtesting | Journal` workspace switch inside the existing `index.html` app.

Constraints:

- Keep a single `index.html` entry point.
- Do not create `journal.html`.
- Keep existing backtesting DOM and behavior intact.
- Journal starts as a separate workspace surface.
- Persist the active workspace locally.

### Step 285.2 - Journal Store Schema

Add `journal/journal-store.js`.

Scope:

- Normalize `JournalDay`.
- Identity: `accountId + date`.
- Manage load/get/update/clear.
- Emit `journal:changed`.

## Step 285.2 Status

Completed.

Added:

- `v4/src/journal/journal-store.js`
- `v4/tests/journal-store-smoke.js`

Store coverage:

- `JournalDay` identity: `accountId + date`.
- Normalizes account/day fields.
- Normalizes `LiveTradeLog` and `fills[]` for future Phase C use.
- Normalizes `IdealTradeReview` for future Phase D use.
- Normalizes `DisciplineReview`.
- Provides load/get/upsert/update/delete/clear APIs.
- Emits `journal:changed`.

Validation:

- `node v4/tests/journal-store-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 285.3 - Journal Persistence

Add `journal/journal-persistence.js`.

Scope:

- Use `createLocalPersistence()`.
- Key: `v4:journal:<accountId>`.
- Preserve schema `{ version, savedAt, journalDays }`.
- Restore on startup and save on `journal:changed`.

### Step 285.4 - Journal Workspace UI MVP

Add minimal Journal UI.

Scope:

- Date input.
- Account selector/input defaulting to `default`.
- Day mode selector.
- Visible-title textareas:
  - Pre-market plan
  - Mental state before
  - Post-market summary
  - Discipline summary

### Step 285.5 - Navigation Boundary

Ensure workspace switching is stable:

- Backtesting remains default.
- Journal and Backtesting can be switched without resetting chart state.
- Refresh restores active workspace.

### Step 285.6 - Tests / Smoke

Validation:

- Store normalize smoke.
- Persistence smoke.
- Browser smoke for workspace switch and Journal text persistence.
- Existing JS syntax checks.
- `git diff --check`.

## Step 285.1 Status

Implemented app shell boundary:

- `index.html` now has a top-level workspace switch.
- Existing backtesting DOM is wrapped in `#backtesting-workspace`.
- Added empty `#journal-workspace` with a placeholder `#journal-page`.
- Added `src/ui/app-shell.js` for workspace state, local persistence, and DOM switching.
- `app.js` initializes app shell before existing backtesting modules.

Validation:

- `node --check v4/src/ui/app-shell.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`
- `node v4/tests/primary-instrument-browser-smoke.js`

Result:

- Existing backtesting browser smoke still passes.
