# Session 2026-06-12 - Journal Execution Adapter

Branch: `feature/research-databento-data-journal`

## Context

Step 289 closed the Journal/Backtesting order alignment decision:

- Backtesting owns setup/thesis/review.
- Journal owns execution/fills/PnL/R/discipline/reflection.
- Current `JournalDay.liveTrades[]` remains the persisted field for now.
- New code should read actual trades through a `JournalExecution` adapter before the UI is reworked.

## Step 290 Plan

Goal:

- Add a read-model adapter that projects current `JournalDay.liveTrades[]` into `JournalExecution`.
- Do not change Journal UI.
- Do not migrate localStorage.
- Do not remove or rename `liveTrades[]`.

Scope:

- Add `src/journal/journal-execution-adapter.js`.
- Preserve direct `orderReviewId` if present.
- Fall back to legacy `linkedOrderSetupIds[0]`.
- Preserve linked chart note IDs and legacy linked setup IDs.
- Keep setup-like fields in `unlinkedSnapshot` for unlinked executions.
- Add smoke coverage for:
  - unlinked execution
  - direct `orderReviewId` linked execution
  - legacy `linkedOrderSetupIds[0]` linked execution
  - adapter copy behavior for fills

## Step 290 Status

Completed.

Implemented:

- `toJournalExecution(liveTrade)`
- `getJournalExecutions(journalDay)`
- `getJournalExecutionOrderReviewId(liveTrade)`
- Optional `orderReviewId` preservation in `normalizeLiveTradeLog`
- `journal-execution-adapter-smoke.js`

Compatibility notes:

- Existing `liveTrades[]` remains the storage shape.
- Existing legacy links under `linkedOrderSetupIds[]` remain readable.
- Direct `orderReviewId` now survives journal normalization.
- Adapter exposes `isLinkedToOrderSetup` for future UI/read-model use.
- Adapter deep-copies fills so read-model consumers do not mutate the stored day object by accident.

Verification:

```text
node v4/tests/journal-execution-adapter-smoke.js
node v4/tests/journal-store-smoke.js
node v4/tests/journal-actual-trade-examples-smoke.js
node --check v4/src/journal/journal-execution-adapter.js
```

All passed.

Known non-blocking warning:

- Node emits the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM test files because the repo has no local `type: module` package setting.

## Next Step

Step 291 should build the linked setup summary read model:

- Input: `JournalExecution`
- Join by `orderReviewId`
- Linked execution reads setup fields from Backtesting setup/order review.
- Unlinked execution reads fallback fields from `unlinkedSnapshot`.
