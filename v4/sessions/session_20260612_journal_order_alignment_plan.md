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

## Step 289.1 Status

Completed.

Reviewed:

- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/journal/journal-store.js`

Mapping audit:

| Concept | Order Setup authority | Setup Set runtime | Current Journal field | Decision |
| --- | --- | --- | --- | --- |
| Instrument | `orderReview.instrument` | setup set source/order alias | `liveTrade.instrument` | Reuse Order Setup when linked; keep Journal only for unlinked execution fallback. |
| Direction | `entryPlan.direction` | `entry.direction` | `liveTrade.direction` | Reuse Order Setup; Journal direction becomes legacy/fallback only. |
| Setup/reversal event | `setupThesis.primaryEventTimestamp/Price/Type/Timeframe` | `reversal` | none | Reuse Order Setup. Journal should not recreate this. |
| Reasons/context | `setupThesis.reasons[]`, `linkedObjectRefs`, `manualEvents` | explanation refs/notes | `entryReason`, `linkedChartNoteIds` | Reuse Order Setup reasons/refs; Journal should only add execution psychology notes. |
| Entry idea | `entryPlan.entryTimestamp/entryPrice/entryModel/entrySession/patterns` | `entry` | first fill may imply entry | Reuse Order Setup as planned/ideal entry; Journal fills record actual execution. |
| Stop | `entryPlan.stopLoss`, stop timestamp/timeframe/reason | `stopLoss` | `liveTrade.stopLoss` | Reuse Order Setup; Journal stop field should be deprecated or become actual stop execution note only. |
| Targets | `entryPlan.target*`, `finalTarget`, selected target type | `targets[]` | `liveTrade.target` | Reuse Order Setup; Journal target field should be deprecated. |
| Backtesting result | `resultReview.result/exitTimestamp/exitPrice/note` | `result`, derived points/R | `liveTrade.result` | Reuse Order Setup for review/ideal result; Journal result should describe actual execution outcome only if needed. |
| Actual fills | none | none | `liveTrade.fills[]` | Journal-only; this is the primary value of Journal execution. |
| Trade type | none | none | `tradeType` | Journal-only: real money / simulation. |
| Account/day | none | none | `accountId`, `date` | Journal-only: execution belongs to account/day. |
| Position sizing | none | none | `positionSize`, fill quantity | Journal-only. |
| Commissions/PnL | none | derived review points/R only | `grossPnl`, `netPnl`, `commissions`, `rMultipleManual` | Journal-only; actual money result is not the same as setup review result. |
| Timing assessment | none | none | `timingAssessment` | Journal-only execution assessment, optionally compared to linked setup entry. |
| Followed plan | indirectly implied by linked setup | none | `followedPlan` | Journal-only discipline/execution assessment. |
| Rule breaks | none | none | `ruleBreaks` | Journal-only. |
| Before-entry thoughts | none | none | `beforeEntryThoughts` | Journal-only live state. |
| Management notes | `resultReview.note` is review-oriented | note element | `managementNotes` | Journal-only actual management note. |
| Reflection | `resultReview.note`, `order.note` | note elements | `reflection`, `whatWasRight`, `whatWasWrong` | Split: setup/result review notes remain in Order Setup; live execution reflection stays Journal-only. |
| Links to setup | order id is authority | setup set id/orderReview alias | `linkedOrderSetupIds` | Replace with primary `orderReviewId`; support unlinked fallback. |

Fields to keep Journal-only:

- `tradeType`
- `accountId`
- `date`
- `fills[]`
- `positionSize`
- `grossPnl`
- `netPnl`
- `commissions`
- `rMultipleManual`
- `timingAssessment`
- `followedPlan`
- `ruleBreaks`
- `beforeEntryThoughts`
- `managementNotes`
- `exitReason`
- `reflection`
- optional unlinked `instrument`

Fields to reuse from Order Setup when linked:

- instrument
- direction
- setup event/reversal
- reasons/context refs
- entry plan
- stop
- targets
- setup review result
- chart locate/render behavior

Fields to deprecate or hide from linked Journal UI:

- `liveTrade.direction`
- `liveTrade.stopLoss`
- `liveTrade.target`
- `liveTrade.entryReason`
- `linkedChartNoteIds`
- broad `result` if it duplicates `resultReview.result`

Fields needing adapter/migration:

- `linkedOrderSetupIds[]` should collapse toward a primary `orderReviewId`.
- existing unlinked `liveTrades[]` need a compatibility view.
- `liveTrade.result` must be clarified as actual execution outcome or migrated out of the linked setup path.

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

## Step 289.2 Status

Completed.

Alignment decision:

- Adopt `Order Setup + Journal Execution Overlay`.
- Backtesting `orderReviews` remains the authority for setup/order idea.
- `setup-set.js` remains the runtime/view-model authority for chart rendering, locate, Calendar summaries, and Inspector/backtesting interactions.
- Journal actual execution should become a thin overlay linked to an `orderReviewId`.
- Journal must not duplicate setup thesis, reasons, entry plan, stop, targets, or chart refs when an Order Setup exists.

Target naming:

- Use `JournalExecution` as the conceptual target name.
- It may continue to be stored under `JournalDay` for account/day persistence.
- The UI can still label the section `Actual Trades` if that is clearer to the user.

Target shape, refined:

```js
{
  id,
  accountId,
  date,
  orderReviewId,          // primary link to Backtesting Order Setup
  tradeType,              // real_money | simulation
  executionStatus,        // planned | taken | missed | skipped | invalidated
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
  reflection,
  unlinkedSnapshot        // optional legacy/fallback metadata only
}
```

Rules:

- If `orderReviewId` is present, display setup/instrument/direction/entry/stop/targets from Order Setup.
- If `orderReviewId` is absent, allow an unlinked execution record, but clearly mark it as unlinked.
- Unlinked execution is valid because real trading can include impulsive or undocumented trades.
- Ideal hindsight trades should remain Order Setups, not Journal executions.

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

## Step 289.3 Status

Completed.

Target Journal UI strategy:

- Rename the current data concept from full `LiveTradeLog` toward `Journal Execution`.
- Keep the visible section label as `Actual Trades` for now because it is user-friendly.
- Actual Trades rows should be grouped by selected Journal date/account.
- Each row should prefer a linked Order Setup summary:
  - setup id / label
  - instrument
  - direction
  - planned entry
  - stop
  - targets
  - setup result/review status
- Journal overlay row fields should focus on execution:
  - real/sim
  - execution status
  - fills count
  - net PnL
  - manual R
  - followed plan
  - timing assessment
  - rule break marker

Editor strategy:

- Linked setup summary is read-only in Journal.
- Editing setup logic happens in Backtesting Order Setup.
- Editing actual execution happens in Journal.
- Expanded Journal editor should show:
  - link/unlink Order Setup
  - execution metadata
  - fills editor
  - execution reflection / rule breaks / management notes
  - button: Open setup in Backtesting

Actions:

- `Open in Backtesting`
  - switch workspace to Backtesting
  - set/locate active Order Setup
  - optionally load the selected Journal date context
- `Link existing setup`
  - choose from Order Setups on the same date/instrument first
  - allow searching all setup ids later
- `Create setup from execution`
  - allowed only as a follow-up implementation step
  - should create a normal Order Setup, then link this Journal execution
- `Add unlinked execution`
  - allowed for impulsive/undocumented trades
  - UI should label it `Unlinked execution`

What should disappear from linked Journal editor:

- direction selector
- stop/target fields
- entry reason as setup thesis
- chart refs

What should remain in Journal editor:

- trade type
- fills
- actual PnL/R
- timing/followed-plan/rule-break assessment
- execution/management/reflection notes

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

## Step 289.4 Status

Completed.

Compatibility decision:

- Do not migrate existing localStorage immediately.
- Do not remove `JournalDay.liveTrades[]` immediately.
- Introduce an adapter layer first.
- Treat current `liveTrades[]` as legacy execution records.
- New target records should conceptually be `JournalExecution`, but may be stored in a new field only after adapter tests exist.

Unlinked execution rule:

- Unlinked actual executions are allowed.
- They represent:
  - impulsive trades without a planned setup
  - real/sim trades taken before a setup was recorded
  - imported broker executions that cannot yet be matched
- UI must label them clearly as `Unlinked execution`.
- Unlinked execution may keep fallback fields like `instrument` and `direction`.
- Once linked to an Order Setup, setup-derived fields should be read from `orderReviewId` instead.

Legacy `liveTrades[]` handling:

- Existing `liveTrades[]` remain readable.
- Existing `liveTrades[]` should render as unlinked executions unless:
  - `linkedOrderSetupIds[0]` exists, or
  - future migration adds a primary `orderReviewId`.
- No destructive migration in the first implementation.
- No field deletion in the first implementation.

Adapter mapping:

```js
function toJournalExecution(liveTrade) {
  return {
    id: liveTrade.id,
    accountId: liveTrade.accountId,
    date: liveTrade.date,
    orderReviewId: liveTrade.orderReviewId || liveTrade.linkedOrderSetupIds?.[0] || '',
    tradeType: liveTrade.tradeType,
    executionStatus: liveTrade.executionStatus || 'taken',
    fills: liveTrade.fills || [],
    positionSize: liveTrade.positionSize,
    grossPnl: liveTrade.grossPnl,
    netPnl: liveTrade.netPnl,
    commissions: liveTrade.commissions,
    rMultipleManual: liveTrade.rMultipleManual,
    timingAssessment: liveTrade.timingAssessment,
    followedPlan: liveTrade.followedPlan,
    ruleBreaks: liveTrade.ruleBreaks,
    beforeEntryThoughts: liveTrade.beforeEntryThoughts,
    managementNotes: liveTrade.managementNotes,
    exitReason: liveTrade.exitReason,
    reflection: liveTrade.reflection,
    unlinkedSnapshot: {
      instrument: liveTrade.instrument,
      direction: liveTrade.direction,
      result: liveTrade.result,
      stopLoss: liveTrade.stopLoss,
      target: liveTrade.target,
      entryReason: liveTrade.entryReason
    }
  };
}
```

Future storage options:

- Option A: keep storing under `liveTrades[]` but normalize toward `orderReviewId` + execution fields.
- Option B: add `executions[]`, read both `executions[]` and legacy `liveTrades[]`, write new data to `executions[]`.

Preferred implementation path:

- Start with Option A adapter to minimize persistence churn.
- Revisit Option B only after linked setup UI is stable.

### Step 289.5 - Implementation Plan

Break the future implementation into small safe commits.

Likely future implementation phases:

- 289.A: store/schema adapter only, no UI change.
- 289.B: Journal UI links actual execution to Order Setup id.
- 289.C: Backtesting action to open/create setup from Journal date.
- 289.D: Browser smoke and migration coverage.

## Step 289.5 Status

Completed.

Implementation sequence:

### Step 290 - Journal Execution Adapter

Goal:

- Add adapter functions that project current `JournalDay.liveTrades[]` into `JournalExecution` view models.
- No UI behavior change.

Scope:

- `toJournalExecution(liveTrade)`
- `getJournalExecutions(day)`
- normalize optional `orderReviewId`
- preserve legacy `linkedOrderSetupIds[]`
- unit/smoke coverage for linked and unlinked records

Commit boundary:

- adapter + tests only

### Step 291 - Linked Setup Summary Read Model

Goal:

- Join Journal executions with Backtesting Order Setup / setup-set view model.
- No editing UI yet.

Scope:

- Build a read model:
  - execution overlay fields
  - linked setup summary if `orderReviewId` exists
  - unlinked snapshot fallback otherwise
- Tests for:
  - linked execution uses setup instrument/direction/entry/stop/targets
  - unlinked execution uses fallback snapshot

Commit boundary:

- read model + tests only

### Step 292 - Journal Actual Trades UI Rework

Goal:

- Replace current duplicate order fields with execution-overlay UI.

Scope:

- Rows show linked setup summary where possible.
- Linked setup fields read-only in Journal.
- Journal editor shows:
  - link status
  - trade type
  - execution status
  - fills
  - PnL/R
  - timing/followed-plan/rule-break fields
  - management/reflection notes
- Hide duplicated linked fields:
  - direction selector
  - stop/target
  - entry reason

Commit boundary:

- UI + browser smoke

### Step 293 - Link Existing Setup / Open In Backtesting

Goal:

- Add basic linking workflow and navigation to Backtesting.

Scope:

- Link existing setup from same date/instrument first.
- Show `Open in Backtesting` on linked execution.
- Switch workspace to Backtesting and locate/set active setup.

Commit boundary:

- actions + smoke

### Step 294 - Unlinked Execution Workflow

Goal:

- Keep unlinked execution as a first-class fallback.

Scope:

- `Add unlinked execution`
- clear visual label
- no setup-derived fields required
- optional create setup from execution remains future work unless clearly needed

Commit boundary:

- unlinked workflow + smoke

### Step 295 - Migration Decision

Goal:

- Decide whether to keep `liveTrades[]` indefinitely or introduce `executions[]`.

Decision inputs:

- linked UI stability
- whether current localStorage compatibility is enough
- whether import/export needs a clearer schema

Default:

- Do not migrate until needed.

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
