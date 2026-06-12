# Session 2026-06-12 - Journal MVP Design

Branch: `feature/research-databento-data-journal`

Status: Phase A frozen for MVP implementation.

## Context

After Databento data research and ES/NQ main-chart parity work, the next product direction is a parallel Journal system on top of the V4 platform.

Journal is not another Order Setup panel. It records live trading behavior, actual execution, psychology, discipline, and post-session comparison against ideal hindsight execution.

## Design Document

Created:

- `v4/docs/design/JOURNAL_MVP_DESIGN.md`

The document now covers:

- Purpose and boundary of Journal.
- Four core objects:
  - `JournalDay`
  - `LiveTradeLog`
  - `IdealTradeReview`
  - `DisciplineReview`
- Multi-layer plan framework.
- Phase A design-freeze detailed plan.
- First implementation candidate.

## Latest Decisions

Accepted for the next design pass:

- `JournalDay` is scoped by `accountId + date`, not `instrument + date`.
- Trades carry their own `instrument`.
- Real-money and simulation trades share one `LiveTradeLog` list, distinguished by `tradeType`.
- One `LiveTradeLog` represents one trade idea or position lifecycle.
- Actual executions are represented by `fills[]`.
- `fills[]` supports entry, add, partial exit, final exit, stop exit, and manual exit.
- MVP records size, PnL, commissions, and R manually.
- MVP does not auto-calculate PnL/R from fills.
- MVP does not do broker import or broker reconciliation.
- Missed trades are represented in `IdealTradeReview` through `relationshipToActualTrade = missed_trade` plus `noticedInRealTime`.
- No standalone `MissedTrade` object in the first version.
- `IdealTradeReview` distinguishes:
  - `hindsight_optimal`
  - `plan_valid`
- Journal should be a separate workspace inside the shared `index.html` app shell.
- Do not build a duplicated `journal.html` MVP app.
- Backtesting and Journal should have a visible boundary, with optional navigation links between them.

## App Structure Decision

Preferred architecture:

```text
index.html
  App Shell
    Backtesting Workspace
    Journal Workspace
```

Rationale:

- A separate `journal.html` would duplicate API, storage, chart, display, and utility modules.
- A single app shell keeps shared infrastructure in one place.
- Separate workspaces preserve a visible product boundary.

## Phase A Status

Phase A is frozen for MVP implementation.

Current status:

- Decisions have been updated.
- A1-A7 are written as a detailed design-freeze checklist.
- Step 282.A validation examples have been added to the design document.
- Step 282.A examples mapped cleanly to the current model.
- Phase A freeze decision has been written to the design document.

A1-A7:

- A1: Freeze Core Use Cases
- A2: Freeze Field Groups
- A3: Freeze Enum Vocabulary
- A4: Freeze UI Information Architecture
- A5: Freeze Persistence And Archive Boundary
- A6: Freeze Links To Existing V4 Objects
- A7: Freeze Validation Examples

## TODO Update

Updated `v4/TODO.md` Step 282 to point to the new design document and summarize the latest decisions:

- JournalDay by account/day.
- Trade by instrument.
- LiveTradeLog supports fills/partials.
- PnL/size/R are manual fields in MVP.
- Journal is an independent workspace inside the shared `index.html` app shell.

## Next Recommended Step

Do not start implementation yet.

Step 282.A completed:

- Added concrete validation examples for:
  - Real-money losing trade that violated plan.
  - Simulation trade that followed plan.
  - No-trade day with ideal missed trade.
  - Mixed real/sim day.
  - Good result but poor discipline.
  - Multi-contract trade with partial and final exits.
- All examples map to the current Journal model.
- Carry-forward notes:
  - Keep `unknown` available for discipline checks where live awareness is unclear.
  - Explain in UI that `failedToTradeWhenShould = yes` should be reserved for opportunities noticed in real time.
  - Manual PnL/R fields are necessary in MVP.
  - `fills[]` is enough for partial execution in the first version.

## Phase A Freeze Decision

Frozen decisions:

- `JournalDay` identity is `accountId + date`.
- Nested trades and ideal trades carry their own `instrument`.
- Real-money and simulation actual trades share `LiveTradeLog` with `tradeType`.
- One `LiveTradeLog` represents one trade idea / position lifecycle.
- `fills[]` records actual executions, including partial and final exits.
- PnL/size/R fields are manual in MVP.
- `IdealTradeReview` handles missed-trade cases via `relationshipToActualTrade = missed_trade` and `noticedInRealTime`.
- Journal is a separate workspace inside the shared `index.html` app shell.
- No separate duplicated `journal.html` app in MVP.

Next recommended work:

1. Commit the Phase A freeze.
2. Begin Phase B implementation with the app shell/workspace split and minimal Journal Day store.
