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
