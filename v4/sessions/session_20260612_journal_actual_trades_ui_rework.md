# Session 2026-06-12 - Journal Actual Trades UI Rework

Branch: `feature/research-databento-data-journal`

## Context

Step 290 added the `JournalExecution` adapter.

Step 291 added the linked setup summary read model:

- `linked`
- `missing-linked-setup`
- `unlinked`

Step 292 starts using that read model in the Journal UI.

## Step 292.1 Plan

Goal:

- Connect collapsed Actual Trades row summary to the `JournalExecutionDisplayModel`.
- Keep expanded editor unchanged.
- Keep add/edit/delete/fill behavior unchanged.
- Do not migrate localStorage.

Scope:

- Use `getJournalExecutions(day)`.
- Use `getJournalExecutionDisplayModels(executions)`.
- In collapsed row summary:
  - show link status
  - show setup-derived instrument/direction/result when available
  - show setup-derived entry/stop/target when available
  - keep execution PnL/R/fill count from Journal trade
- Add browser smoke assertion for `Unlinked execution`.

## Step 292.1 Status

Completed.

Implemented:

- `journal-workspace` imports the execution adapter and setup summary read model.
- Actual Trades collapsed rows now display:
  - `Linked setup`
  - `Missing setup`
  - `Unlinked execution`
- Linked display models can drive setup-derived summary fields.
- Unlinked rows continue to show Journal fallback fields.
- CSS grid adjusted for the wider summary.

Unchanged:

- Expanded trade editor.
- Field write path.
- Fill editor.
- `liveTrades[]` persistence.
- Link/open/create setup actions.

Verification:

```text
node --check v4/src/journal/journal-workspace.js
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-execution-adapter-smoke.js
node v4/tests/journal-workspace-browser-smoke.js
```

All passed.

Known non-blocking warning:

- Node emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM test files because the repo has no local `type: module` package setting.

## Next Step

Step 292.2 should rework the expanded editor for linked executions:

- hide duplicated setup fields for linked executions
- keep execution fields visible
- add read-only linked setup summary detail
- keep unlinked execution fields editable

## Step 292.2 Plan

Goal:

- Split expanded Actual Trade detail by link status.
- Linked executions should show setup facts read-only.
- Linked executions should not expose duplicate setup-like editors.
- Unlinked and missing-linked executions should keep fallback setup-like fields editable.

Scope:

- `linked`:
  - show read-only setup summary
  - hide editable `Instrument`
  - hide editable `Direction`
  - hide editable `Result`
  - keep execution fields: trade type, PnL, R, timing, followed plan, reflection, fills
- `unlinked` and `missing-linked-setup`:
  - keep fallback Instrument/Direction/Result editors
- No link/open/create setup actions.
- No storage migration.

## Step 292.2 Status

Completed.

Implemented:

- Added read-only linked setup summary panel in expanded trade detail.
- Linked setup summary shows:
  - instrument
  - direction
  - entry
  - stop
  - target
  - result
  - setup summary text
- Linked execution detail hides duplicate setup-like editors:
  - `Instrument`
  - `Direction`
  - `Result`
- Linked execution detail keeps execution editors:
  - `Trade type`
  - `Net PnL`
  - `Manual R`
  - `Timing`
  - `Followed plan`
  - `Reflection`
  - `Fills`
- Unlinked execution detail keeps fallback setup-like editors.
- Missing linked setup remains fallback-editable because no local setup facts are available.

Verification:

```text
node --check v4/src/journal/journal-workspace.js
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-execution-adapter-smoke.js
node v4/tests/journal-workspace-browser-smoke.js
```

All passed.

Known non-blocking warning:

- Node emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM test files because the repo has no local `type: module` package setting.

## Next Step

Step 292.3 should make the expanded detail more useful without adding new persistence:

- review labels and density
- add a clearer missing-linked setup state if needed
- keep create/link/open setup actions for Step 293

## Step 292.3 Plan

Goal:

- Polish expanded trade detail states without adding fields or persistence.
- Make `linked`, `missing-linked-setup`, and `unlinked` visually and semantically clear.
- Keep Step 293 actions out of this pass.

Scope:

- Add compact state text to expanded detail.
- `linked`: state that setup fields are read from Backtesting.
- `missing-linked-setup`: state that linked setup is not available locally.
- `unlinked`: state that no setup is linked.
- Keep fallback fields editable for missing/unlinked.
- Keep linked setup fields read-only.
- Preserve mobile layout.

## Step 292.3 Status

Completed.

Implemented:

- Added compact expanded-detail status strip for all link states.
- `linked` detail now explicitly says setup facts are read from Backtesting and Journal edits execution/fills/PnL/discipline/reflection.
- `missing-linked-setup` detail now explicitly says the linked setup was not found locally and fallback fields remain editable.
- `unlinked` detail now explicitly says no setup is linked and fallback fields remain editable.
- Added responsive styling so the status strip stacks cleanly on small screens.

Unchanged:

- No link existing setup action.
- No open in Backtesting action.
- No create setup from execution action.
- No localStorage migration.
- No new journal fields.

Verification:

```text
node --check v4/src/journal/journal-workspace.js
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-execution-adapter-smoke.js
node v4/tests/journal-workspace-browser-smoke.js
```

All passed.

Known non-blocking warning:

- Node emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM test files because the repo has no local `type: module` package setting.

## Step 292 Closeout

Step 292 is functionally complete for the current UI rework scope:

- collapsed rows use `JournalExecutionDisplayModel`
- expanded linked detail separates setup facts from execution fields
- missing/unlinked states remain editable fallbacks
- browser smoke covers unlinked, linked, and missing-linked detail behavior

Step 293 should add the actual workflow actions:

- link existing setup
- open linked setup in Backtesting
- optionally create setup from execution later if needed

# Session 2026-06-13 - Journal Link Existing Setup

Branch: `feature/research-databento-data-journal`

## Step 293 Plan

Goal:

- Add a practical workflow to link Journal executions to existing Backtesting Order Setups.
- Add navigation from linked Journal execution to the Backtesting setup.
- Preserve the Step 292 boundary: Backtesting owns setup facts; Journal owns execution facts.

Substeps:

- Step 293.1: Link candidates read model.
- Step 293.2: Link existing setup UI.
- Step 293.3: Open in Backtesting action.
- Step 293.4: Browser smoke and documentation closeout.

## Step 293.1 Plan

Goal:

- Provide a read model for setup link candidates.
- Prefer same date and same instrument, but keep fallback candidates available.
- Do not change UI.

Scope:

- Add `journal-setup-link-candidates`.
- Candidate fields:
  - `orderReviewId`
  - `instrument`
  - `date`
  - `direction`
  - `summary`
  - `entryPrice`
  - `stopPrice`
  - `targetPrice`
  - `result`
  - `matchDate`
  - `matchInstrument`
  - `score`
- Add smoke coverage.

## Step 293.1 Status

Completed.

Implemented:

- `summarizeJournalSetupLinkCandidate(setup, context)`
- `getJournalSetupLinkCandidates(context)`
- Smoke coverage for same-date/same-instrument ranking and fallback candidates.

Verification:

```text
node v4/tests/journal-setup-link-candidates-smoke.js
node --check v4/src/journal/journal-setup-link-candidates.js
```

All passed.

## Step 293.2 Plan

Goal:

- Let unlinked and missing-linked Journal executions link to an existing Backtesting setup.
- Keep linked executions read-only for setup facts.
- Do not add navigation yet.

Scope:

- Add `Link setup` select in expanded detail for:
  - `unlinked`
  - `missing-linked-setup`
- Use Step 293.1 candidates.
- Selecting a setup writes `orderReviewId`.
- Selecting blank clears `orderReviewId`.
- Re-render immediately after link selection.

## Step 293.2 Status

Completed.

Implemented:

- Expanded unlinked/missing-linked trade detail now shows a `Link setup` select.
- Candidate labels include date, instrument, direction, entry, and summary.
- Missing current links remain visible as `Missing setup: <id>`.
- Selecting a setup updates `orderReviewId`, persists through the existing `liveTrades[]` path, and immediately re-renders as linked.

Verification:

```text
node --check v4/src/journal/journal-workspace.js
node v4/tests/journal-setup-link-candidates-smoke.js
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-workspace-browser-smoke.js
```

All passed.

## Step 293.3 Plan

Goal:

- Let linked Journal executions open their Backtesting Order Setup.
- Keep this as navigation only; no setup editing inside Journal.

Scope:

- Add `Open in Backtesting` button for linked executions.
- On click:
  - set the linked setup as active Order Setup
  - switch workspace to Backtesting
  - emit status feedback
- If the linked setup is missing locally, show status error and do not switch.

## Step 293.3 Status

Completed.

Implemented:

- Linked setup summary now includes `Open in Backtesting`.
- Click action calls `setActiveReviewSet(orderReviewId)` and `setActiveWorkspace('backtesting')`.
- Missing setup click path emits a status error.
- Browser smoke verifies linked setup opens the Backtesting workspace.

Verification:

```text
node --check v4/src/journal/journal-workspace.js
node v4/tests/journal-setup-link-candidates-smoke.js
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-workspace-browser-smoke.js
```

All passed.

## Step 293.4 Plan

Goal:

- Close Step 293 with verification and documentation.
- Confirm link/open workflow is covered.
- Keep deferred items explicit.

## Step 293.4 Status

Completed.

Verification:

```text
node v4/tests/journal-setup-link-candidates-smoke.js
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-execution-adapter-smoke.js
node --check v4/src/journal/journal-workspace.js
node v4/tests/journal-workspace-browser-smoke.js
git diff --check
```

All passed.

Step 293 completed scope:

- setup link candidates read model
- link existing setup select for unlinked/missing-linked executions
- immediate relink render through existing `orderReviewId`
- `Open in Backtesting` for linked executions
- browser smoke coverage for link, persistence, and workspace switch

Deferred:

- broker import
- automatic setup matching
- create setup from execution
- localStorage migration from `liveTrades[]`
- automatic PnL/R calculation
