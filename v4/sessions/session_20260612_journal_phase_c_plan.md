# Session 2026-06-12 - Journal Phase C Plan

Branch: `feature/research-databento-data-journal`

Status: Planned, not implemented.

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

### Step 286.3 - Actual Trade Persistence Path

Wire the UI into existing Journal Day store/persistence.

Requirements:

- Trade edits update selected `JournalDay.liveTrades`.
- Refresh restores trades and fills.
- Account/date switch shows the correct day trades.
- No accidental empty trade creation on page load.

### Step 286.4 - Minimal Validation Examples

Use Phase A examples as acceptance checks:

- Real-money losing trade that violated plan.
- Simulation trade that followed plan.
- Multi-contract trade with partial and final exit.

### Step 286.5 - Browser Smoke

Add a browser smoke covering:

- Switch to Journal.
- Create actual trade.
- Add fills.
- Enter manual PnL/R.
- Reload and verify trade/fills restored.
- Switch back to Backtesting and verify chart still exists.

## Recommended Commit Boundaries

- 286.1 commit after list/detail shell works.
- 286.2 commit after fill editor works.
- 286.3 commit after persistence path and account/date switching are stable.
- 286.4/286.5 commit after smoke coverage passes.
