# Session 2026-06-12 - Journal Order Alignment Plan

Branch: `feature/research-databento-data-journal`

Status: Planned, not implemented.

## Goal

Realign Journal order/trade recording with the existing Backtesting Order Setup model.

The current Journal `Actual Trades` section is useful for MVP data entry, but it was designed independently from Backtesting Order Setup. That creates two different concepts for what is mostly the same thing: a trade idea / order lifecycle.

Step 289 should decide how Journal actual execution data should build on Backtesting Order Setup instead of remaining a parallel order system.

## Key Principle

Backtesting owns trade idea / setup logic.

Journal owns live execution and behavior around that setup.

Therefore:

- Technical setup, entry idea, stop, targets, reasons, chart refs, and ideal hindsight review should reuse Backtesting Order Setup.
- Journal should add account/day, live/sim type, fills/partials, real execution, manual PnL/R, commissions, and discipline/psychology context.
- Journal should not duplicate the full Order Setup model in a separate `liveTrades` object unless there is a clear reason.

## Existing Backtesting Order Model

Current authority:

- Persisted compatibility schema: `orderReviews`
- Store: `v4/src/order/order-review-store.js`
- Runtime/view model: `setup-set.js`

Important existing concepts:

- `setupThesis`
  - reversal / primary event
  - reasons
  - linked refs
  - manual events
- `entryPlan`
  - direction
  - entry timestamp / price
  - stop loss
  - targets
  - entry model/session/pattern
- `resultReview`
  - result status
  - result price / exit
  - result note
- `display`
  - hidden
  - helper line lengths
  - element visibility

Current runtime setup set derives:

- reversal
- entry
- stop loss
- targets
- result
- explanation refs / notes

## Current Journal Actual Trade Model

Implemented MVP fields:

- `JournalDay.liveTrades[]`
- `tradeType`: real money / simulation
- `instrument`
- `direction`
- `timingAssessment`
- `followedPlan`
- `result`
- manual `netPnl`
- manual `rMultipleManual`
- `reflection`
- `fills[]`
  - type
  - time
  - price
  - quantity
  - reason

Problems:

- It duplicates direction/result/reflection concepts already present in Order Setup.
- It lacks setup thesis, reasons, linked refs, targets, stop, and chart interaction.
- It can drift away from Backtesting Order Setup semantics.
- It asks the user to record objective execution data in a separate UI that cannot reuse chart-first order setup workflow.

## Step 289 Plan

### Step 289.1 - Order Model Mapping Audit

Audit and document field mapping between:

- Backtesting `orderReviews`
- Runtime `setup-set`
- Journal `JournalDay.liveTrades`

Output:

- A mapping table:
  - fields to reuse from Order Setup
  - fields to keep Journal-only
  - fields to remove/deprecate from Journal UI
  - fields needing adapter/migration

### Step 289.2 - Alignment Design Decision

Choose the target model.

Recommended direction:

- Keep Backtesting `orderReviews` as the trade idea / setup authority.
- Add a Journal execution overlay that links to an Order Setup id.
- Journal actual execution records become `JournalActualExecution` or similar, not a full duplicate order setup.

Possible target shape:

```js
{
  id,
  accountId,
  date,
  orderReviewId,
  tradeType,
  executionMode,
  fills,
  positionSize,
  grossPnl,
  netPnl,
  commissions,
  rMultipleManual,
  timingAssessment,
  followedPlan,
  ruleBreaks,
  beforeEntryThoughts,
  managementNotes,
  exitReason,
  reflection
}
```

### Step 289.3 - UI Strategy

Decide how Journal should expose execution data without duplicating Order Setup UI.

Recommended UX:

- In Journal, Actual Trades should list linked Order Setups for the selected date.
- Each row can add/edit execution overlay fields:
  - real/sim
  - account
  - fills
  - PnL/R
  - execution reflection
  - discipline notes
- Provide an action to open the linked setup in Backtesting.
- Provide an action to create/link an Order Setup if no setup exists.

Out of scope for this design step:

- Full implementation.
- Broker import.
- Automatic PnL/R.

### Step 289.4 - Migration / Compatibility Plan

Define how current `JournalDay.liveTrades[]` is handled.

Options to evaluate:

- Keep current `liveTrades[]` as legacy fallback and migrate later.
- Convert each `liveTrade` into an execution overlay with no `orderReviewId`.
- Allow unlinked execution records for trades that were taken without a formal setup.

Need explicit decision:

- Whether unlinked actual trades are allowed.
- Whether old `liveTrades[]` remains readable.
- Whether UI shows old live trades during transition.

### Step 289.5 - Implementation Plan

Break the future implementation into small safe commits.

Likely future implementation phases:

- 289.A: store/schema adapter only, no UI change.
- 289.B: Journal UI links actual execution to Order Setup id.
- 289.C: Backtesting action to open/create setup from Journal date.
- 289.D: Browser smoke and migration coverage.

### Step 289.6 - Documentation Closeout

Update TODO/session with:

- final alignment decision
- target data shape
- migration rule for existing `liveTrades[]`
- implementation substeps

## Boundaries

This step is planning and design only unless explicitly expanded.

Do not in Step 289:

- rewrite Journal actual trade UI
- migrate localStorage
- remove `liveTrades[]`
- add broker import
- add automatic PnL/R
- alter Backtesting Order Setup behavior

## Recommended Commit Boundaries

- 289.1 commit after mapping audit.
- 289.2/289.3 commit after target model and UI strategy are frozen.
- 289.4/289.5 commit after migration and implementation plan are written.
- 289.6 commit for closeout.
