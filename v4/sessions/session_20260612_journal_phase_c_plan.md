# Session 2026-06-12 - Journal Phase C Plan

Branch: `feature/research-databento-data-journal`

Status: Completed.

## Goal

Implement Journal Phase C: actual trade logging.

Phase B already provides:

- Backtesting / Journal workspace shell.
- Journal Day store and local persistence.
- Minimal day-level Journal UI.

Phase C adds actual trade records inside the selected Journal Day.

## Boundaries

In scope:

- Real-money and simulation trades share one `LiveTradeLog` list.
- A `LiveTradeLog` represents one trade idea / position lifecycle.
- `fills[]` records actual executions.
- Support entry, add, partial exit, final exit, stop exit, and manual exit.
- PnL/size/R are manually entered.
- Persistence remains through existing Journal Day localStorage.

Out of scope:

- IdealTradeReview UI.
- Broker import.
- Automatic PnL/R calculation from fills.
- Trade statistics dashboard.
- Review JSON archive integration.
- Backtesting object linking UI beyond simple future-ready fields.

## Step 286 Plan

### Step 286.1 - LiveTradeLog UI Shape

Add an Actual Trades section to the Journal workspace.

Requirements:

- Compact list of trades for selected Journal Day.
- Add trade button.
- Each row shows:
  - trade type
  - instrument
  - direction
  - result
  - net PnL
  - manual R
- Expand a trade to edit core fields.
- Keep UI practical; do not expose every future schema field at once.

## Step 286.1 Status

Completed.

Added Actual Trades section to `journal-workspace.js`.

Current UI:

- Add Trade button.
- Compact trade rows.
- Row summary:
  - trade type
  - instrument
  - direction
  - result
  - net PnL
  - manual R
  - fill count
- Expanded detail fields:
  - trade type
  - instrument
  - direction
  - result
  - net PnL
  - manual R
  - timing
  - followed plan
  - reflection

Not included yet:

- Fill editor. This remains Step 286.2.

Validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 286.2 - Fill Editor MVP

Add a fills editor inside expanded trade detail.

Requirements:

- Add fill button.
- Fill fields:
  - type
  - time
  - price
  - quantity
  - reason
- Support entry, add, partial exit, final exit, stop exit, manual exit.
- Deleting a fill is allowed.
- No automatic PnL/R calculation.

## Step 286.2 Status

Completed.

Added fill editor inside expanded trade detail.

Current UI:

- Add Fill button.
- Fill rows with:
  - type
  - time
  - price
  - quantity
  - reason
- Delete fill button.

Behavior:

- Updates `JournalDay.liveTrades[].fills[]`.
- No automatic PnL/R calculation.

Validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 286.3 - Actual Trade Persistence Path

Wire the UI into existing Journal Day store/persistence.

Requirements:

- Trade edits update selected `JournalDay.liveTrades`.
- Refresh restores trades and fills.
- Account/date switch shows the correct day trades.
- No accidental empty trade creation on page load.

## Step 286.3 Status

Completed.

Validation added to `v4/tests/journal-workspace-browser-smoke.js`:

- Initial Journal day has no empty trade.
- Trade/fill edits persist under the current `JournalDay.liveTrades`.
- Refresh restores the same trade/fill.
- Switching to a different date shows no trade leakage.
- Switching to a different account shows no trade leakage.
- Switching back to the original account/date restores the original trade/fill.

Validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 286.4 - Minimal Validation Examples

Use Phase A examples as acceptance checks:

- Real-money losing trade that violated plan.
- Simulation trade that followed plan.
- Multi-contract trade with partial and final exit.

## Step 286.4 Status

Completed.

Added `v4/tests/journal-actual-trade-examples-smoke.js` with three acceptance examples:

- Real-money losing trade that violated the pre-market plan.
- Simulation trade that followed the plan.
- Multi-contract trade with partial and final exit fills.

Validation:

- `node v4/tests/journal-actual-trade-examples-smoke.js`
- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 286.5 - Browser Smoke

Add a browser smoke covering:

- Switch to Journal.
- Create actual trade.
- Add fills.
- Enter manual PnL/R.
- Reload and verify trade/fills restored.
- Switch back to Backtesting and verify chart still exists.

## Step 286.5 Status

Completed.

`v4/tests/journal-workspace-browser-smoke.js` now covers:

- Switching to Journal.
- Creating an actual trade.
- Adding and editing fills.
- Entering manual PnL/R.
- Reopening the page and verifying trade/fills restore.
- Switching account/date and verifying no trade leakage.
- Switching back to Backtesting and verifying the chart still exists.

Validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/journal-actual-trade-examples-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

## Recommended Commit Boundaries

- 286.1 commit after list/detail shell works.
- 286.2 commit after fill editor works.
- 286.3 commit after persistence path and account/date switching are stable.
- 286.4/286.5 commit after smoke coverage passes.
