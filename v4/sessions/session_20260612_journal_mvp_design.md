# Session 2026-06-12 - Journal MVP Design

Branch: `feature/research-databento-data-journal`

Status: Design updated, not fully frozen.

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

Phase A is not complete yet.

Current status:

- Decisions have been updated.
- A1-A7 are written as a detailed design-freeze checklist.
- The next step is to review A1-A7 and either freeze them or revise specific fields.

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

Next recommended work:

1. Review A1-A7 in `JOURNAL_MVP_DESIGN.md`.
2. Write concrete validation examples for:
   - Real-money losing trade that violated plan.
   - Simulation trade that followed plan.
   - No-trade day with ideal missed trade.
   - Mixed real/sim day.
   - Good result but poor discipline.
   - Multi-contract trade with partial and final exits.
3. Freeze Phase A after examples map cleanly to the fields.

Only after that should implementation begin with the app shell/workspace split and minimal Journal Day store.
