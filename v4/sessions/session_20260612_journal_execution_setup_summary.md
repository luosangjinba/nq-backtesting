# Session 2026-06-12 - Journal Execution Setup Summary

Branch: `feature/research-databento-data-journal`

## Context

Step 290 added `JournalExecution` adapter over current `JournalDay.liveTrades[]`.

Step 291 connects that adapter output to the existing Backtesting Setup Set read model without changing UI or storage.

## Step 291 Plan

Goal:

- Build a read model that tells Journal Actual Trades whether an execution is linked to a Backtesting setup.
- If linked and found, use Backtesting Setup Set fields.
- If linked but missing locally, keep the link status and fall back to the execution snapshot.
- If unlinked, use the execution `unlinkedSnapshot`.

Scope:

- Add `src/journal/journal-execution-setup-summary.js`.
- Reuse `getSetupSetById` from `src/order/setup-set.js`.
- Add display-model helpers for future UI work.
- Add smoke coverage for linked, legacy linked, missing link, and unlinked executions.
- No Journal UI changes.
- No localStorage migration.

## Step 291 Status

Completed.

Implemented:

- `getJournalExecutionSetupSummary(execution)`
- `getJournalExecutionDisplayModel(execution)`
- `getJournalExecutionDisplayModels(executions)`

Read-model behavior:

- `linked`: `execution.orderReviewId` resolves to a Setup Set; setup summary is sourced from Backtesting.
- `missing-linked-setup`: execution has `orderReviewId`, but the setup is not present locally; fallback summary uses `unlinkedSnapshot`.
- `unlinked`: execution has no setup link; fallback summary uses `unlinkedSnapshot`.

Verification:

```text
node v4/tests/journal-execution-setup-summary-smoke.js
node v4/tests/journal-execution-adapter-smoke.js
node v4/tests/order-setup-smoke.js
node --check v4/src/journal/journal-execution-setup-summary.js
```

All passed.

Known non-blocking warning:

- Node emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM test files because the repo has no local `type: module` package setting.

## Next Step

Step 292 should start Journal Actual Trades UI rework:

- Use `JournalExecutionDisplayModel`.
- Show linked setup summary read-only.
- Keep Journal fields focused on execution/fills/PnL/R/discipline/reflection.
- Keep unlinked execution workflow available.
