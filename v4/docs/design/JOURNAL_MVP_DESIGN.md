# Journal MVP Design

Date: 2026-06-12

Status: Decision updated, not fully frozen. The current decisions reflect the latest Phase A discussion, but A1-A7 still need final review before implementation.

## Purpose

Journal is a parallel workflow on top of the V4 chart/replay platform.

It is not another name for Order Setup, and it is not only a replay/review object. Journal records what actually happened in the trader's day:

- What was planned before the session.
- What was felt and thought in real time.
- Every trade that was actually taken, including good decisions and bad decisions.
- Whether each decision followed the plan and rules.
- What was learned after the session.
- What the ideal hindsight execution would have been.

The main value is honesty and repeatability. The system should make it easy to record reality, not force every entry to look like a clean textbook setup.

## Latest Phase A Decisions

These decisions are accepted for the next design pass:

- `JournalDay` is scoped by `accountId + date`, not `instrument + date`.
- `LiveTradeLog` entries share one list and use `tradeType` to distinguish real-money and simulation trades.
- Trades carry their own `instrument`.
- A single `LiveTradeLog` represents one trade idea or position lifecycle.
- Actual executions are represented by `fills[]`, including entry, add, partial exit, and final exit.
- Size, PnL, and R are recorded in MVP, but manually; MVP does not calculate or reconcile them automatically.
- Missed trades are represented in `IdealTradeReview` by `relationshipToActualTrade = missed_trade` plus `noticedInRealTime`, not by a separate first-version object.
- `IdealTradeReview` distinguishes `hindsight_optimal` from `plan_valid`.
- Journal is a separate workspace inside the shared `index.html` app shell, not a separate duplicated `journal.html` app.
- Backtesting and Journal should have a visible boundary while still allowing navigation links between them.

## Core Distinction

V4 currently has review objects such as Order Setup, Time Reaction, PDA, Segment, SMT, Chart Notes, and Daily Regime.

Journal has a different job:

- Review objects describe market structure and post-session analysis.
- Journal objects describe trader behavior, execution, psychology, and discipline.

Journal may link to review objects, but it must not be merged into Order Setup. A bad impulsive trade, a simulation-only trade, or a missed ideal trade still belongs in Journal even if it is not a valid Order Setup.

## MVP Object Model

### 1. Journal Day

One Journal Day exists per account and trading date.

Trades inside the day carry their own `instrument`. This matches live trading better than one day record per instrument because pre-market plan, mental state, account risk, and discipline usually belong to the trader/account/day, not to one chart symbol.

It records the whole session context:

- `date`
- `accountId`
- `accountType`
  - `real`
  - `sim`
  - `eval`
  - `mixed`
- `dayMode`
  - `real_money`
  - `simulation`
  - `review_only`
  - `mixed`
  - `no_trade`
- `preMarketPlan`
- `sessionIntent`
- `mentalStateBefore`
- `intradayStateNotes`
- `postMarketSummary`
- `disciplineSummary`
- `mainMistake`
- `bestBehavior`
- `nextSessionFocus`

Important behavior:

- A day with no real trades still deserves a Journal Day.
- A day with only simulation trades still deserves a Journal Day.
- A day with no live trades but meaningful hindsight review still deserves a Journal Day.
- A day can contain trades from multiple instruments.

### 2. Live Trade Log

Every actual trade attempt is recorded here. "Actual" means the trader took the action in real money or simulation.

Trade type:

- `real_money`
- `simulation`

Suggested MVP fields:

- `id`
- `date`
- `accountId`
- `instrument`
- `tradeType`
- `direction`
- `fills`
  - `type`: `entry`, `add`, `partial_exit`, `final_exit`, `stop_exit`, `manual_exit`
  - `time`
  - `price`
  - `quantity`
  - `reason`
- `stopLoss`
- `target`
- `result`
- `positionSize`
- `plannedRisk`
- `riskPerContract`
- `grossPnl`
- `netPnl`
- `rMultipleManual`
- `commissions`
- `beforeEntryThoughts`
- `entryReason`
- `timingAssessment`
  - `good`
  - `early`
  - `late`
  - `unnecessary`
  - `missed_better_entry`
  - `unknown`
- `followedPlan`
  - `yes`
  - `partial`
  - `no`
  - `not_planned`
- `ruleBreaks`
- `managementNotes`
- `exitReason`
- `reflection`
- `whatWasRight`
- `whatWasWrong`
- `linkedOrderSetupIds`
- `linkedChartNoteIds`

Trade and fill are different concepts:

- `LiveTradeLog` represents one trade idea or position lifecycle.
- `fills[]` represents actual executions inside that trade.
- A trade with multiple contracts and partial exits should remain one `LiveTradeLog` with multiple fills, not several unrelated trades.

PnL, size, and R are recorded in MVP, but manually. MVP does not auto-calculate PnL/R from fills and does not reconcile broker statements.

This object should explicitly allow ugly records:

- revenge trade
- FOMO trade
- bored trade
- hesitation entry
- entry without clear stop
- moving stop incorrectly
- exiting from fear
- overtrading

Journal should not hide these under "other"; they are exactly what the journal is for.

### 3. Ideal Trade Review

Ideal Trade Review records the hindsight version of the day: what should have been executed with perfect clarity after seeing the day unfold.

This is separate from Live Trade Log.

Suggested MVP fields:

- `id`
- `date`
- `instrument`
- `idealType`
  - `hindsight_optimal`
  - `plan_valid`
- `direction`
- `idealEntryTime`
- `idealEntryPrice`
- `idealStopLoss`
- `idealTarget`
- `idealExitTime`
- `idealExitPrice`
- `reason`
- `whyThisWasIdeal`
- `relationshipToActualTrade`
  - `matched_actual`
  - `actual_was_early`
  - `actual_was_late`
  - `actual_wrong_direction`
  - `missed_trade`
  - `no_actual_trade`
  - `simulation_only`
- `noticedInRealTime`
  - `yes`
  - `no`
  - `unsure`
- `actualTradeIds`
- `linkedOrderSetupIds`
- `reviewNotes`

Important behavior:

- Ideal trades can exist even when no real or simulation trade was taken.
- Multiple ideal trades can exist for one day.
- Ideal trades should not rewrite history. They are a comparison layer, not a replacement for what actually happened.
- Missed trades are represented in MVP through `relationshipToActualTrade = missed_trade` plus `noticedInRealTime`; no separate `MissedTrade` object is created in the first version.

### 4. Discipline Review

Discipline Review summarizes rule execution and behavior quality.

Suggested MVP fields:

- `plannedTradesOnly`
  - `yes`
  - `partial`
  - `no`
- `waitedForSetup`
  - `yes`
  - `partial`
  - `no`
- `respectedRisk`
  - `yes`
  - `partial`
  - `no`
- `overtraded`
  - `yes`
  - `no`
- `fomo`
  - `yes`
  - `no`
- `revengeTrading`
  - `yes`
  - `no`
- `hesitatedOnValidTrade`
  - `yes`
  - `no`
- `tradedWhenShouldNot`
  - `yes`
  - `no`
- `failedToTradeWhenShould`
  - `yes`
  - `no`
- `disciplineScore`
  - optional number, probably 1-5
- `disciplineReflection`
- `oneRuleForTomorrow`

This section should stay light in the MVP. The priority is truthful notes, not a complex scoring system.

## Workflow

### Before Session

Open or create today's Journal Day:

- Write pre-market plan.
- Record intended trade mode: real money, simulation, review-only, or mixed.
- Record mental/physical state.
- Define one discipline focus for the session.

### During Session

For each actual trade:

- Add a Live Trade Log.
- Mark whether it was real money or simulation.
- Record what was being thought before entry.
- Record whether it followed the plan.
- Record management and exit behavior.

Intraday notes can be added to Journal Day if the trader does not want to create a full trade record yet.

### After Session

Complete the day:

- Write post-market summary.
- Reflect on every actual trade.
- Add Ideal Trade Reviews for hindsight-perfect trades.
- Compare actual trades with ideal trades.
- Complete Discipline Review.
- Pick one behavior to improve tomorrow.

## Relationship To Existing V4 Objects

Journal can link to existing objects:

- Order Setup
- Chart Note
- Time Reaction Observation
- PDA
- Segment
- SMT
- Daily Regime

But Journal owns its own records:

- A Live Trade Log is not an Order Setup.
- An Ideal Trade Review is not necessarily an Order Setup.
- A Journal Day can exist with no Order Setup.
- Order Setup can remain the chart/review structure object.

Journal should still provide lightweight navigation between workflows:

- From a Journal trade or ideal trade, open Backtesting on the same date/time.
- Link a Journal trade or ideal trade to an Order Setup when useful.
- From Backtesting, optionally open the Journal Day for the current date.
- Links are references, not ownership transfers.

## MVP UI Direction

Journal should be a visible separate workspace, not a panel hidden inside Backtesting Calendar.

Recommended app structure:

```text
index.html
  App Shell
    Backtesting Workspace
    Journal Workspace
```

Use one `index.html` entry point with a top-level workspace switch:

```text
Backtesting | Journal
```

Do not create a fully separate `journal.html` for MVP. A separate page would duplicate chart/API/storage/display modules and create maintenance drift. A single app shell keeps shared modules in one place while preserving a visible workflow boundary.

First version should prefer a small number of direct Journal workspace panels:

- Journal Day summary panel
- Live Trades list
- Ideal Trades list
- Discipline Review panel

Avoid building a heavy form wall. The system should support quick honest entry first.

Recommended UI behavior:

- Journal has its own date/day selector inside the Journal workspace.
- Backtesting can offer `Open Journal Day` as a navigation action, but Journal is not embedded in Calendar details.
- Live Trade Log rows should be compact, with expandable detail.
- Text fields should have visible labels, not only placeholders.
- Real money / simulation / ideal trade should be visually distinct.
- Empty trading days should still allow post-session review and ideal trades.

## Non-Goals For MVP

Do not implement these in the first version:

- Automatic broker import.
- Automatic PnL reconciliation.
- Complex performance statistics.
- AI grading.
- Enforcing that every Journal trade must link to an Order Setup.
- Turning the journal into a signal validator.
- Real-time market data ingestion.
- Cron automation.
- A separate duplicated `journal.html` app.
- Automatic PnL/R calculation from fills.

## Open Questions

These should be answered through use, not over-designed now:

- Which discipline tags deserve first-class fields versus free-text notes?
- How much PnL detail is useful without turning Journal into accounting software?
- Should Ideal Trade Review reuse chart markers from Order Setup or have separate lightweight markers?
- Should `idealType = hindsight_optimal` and `plan_valid` be enough, or do they need clearer UI wording?
- How much Journal navigation should Backtesting expose without blurring the workspace boundary?

## First Implementation Candidate

When implementation starts, the first narrow slice should be:

1. Add app shell workspace switch inside `index.html`.
2. Add Journal Day store and persistence by `accountId + date`.
3. Support pre-market plan, post-market summary, mental state, and discipline summary.
4. Add Journal workspace date/day selector.
5. Add Live Trade Log entries with `real_money` / `simulation` and `fills[]`.
6. Add manual PnL/size/R fields without auto-calculation.
7. Add Ideal Trade Review entries with `noticedInRealTime`.
8. Export/import Journal data in Review JSON.

This is enough to begin real use without committing to statistics or automation too early.

## Multi-Layer Plan Framework

Journal should be planned in layers. Each layer can be discussed, implemented, and validated separately.

### Layer 1 - Product Boundary

Purpose:

- Define what Journal is for.
- Keep Journal separate from Order Setup and replay review objects.
- Make truthful behavior recording the primary goal.

Decisions to freeze:

- Journal records actual trader behavior, not only valid setups.
- Real money, simulation, and hindsight ideal trades are different record types.
- No-trade days can still have meaningful Journal records.
- Discipline and mental state are first-class content, not optional comments hidden elsewhere.
- Journal Day is account/day scoped; trades carry instrument.
- Journal is a separate workspace inside the shared `index.html` app shell.

Acceptance:

- A bad real-money trade can be recorded without pretending it was a valid setup.
- A simulation-only day can be recorded cleanly.
- A no-trade day can still include plan, mindset, discipline review, and ideal trades.

### Layer 2 - Data Model

Purpose:

- Define stable storage objects before UI work.
- Avoid coupling Journal records to existing Order Setup schema.

Core objects:

- `JournalDay`
- `LiveTradeLog`
- `IdealTradeReview`
- `DisciplineReview`

Planning questions:

- How much PnL and R detail should be visible in the first UI without becoming accounting software?
- How should fills be summarized in compact trade rows?
- How should Journal support multiple account types without forcing multi-account UI in MVP?
- Which discipline fields should be structured enums, and which should stay free text?

Acceptance:

- The model can represent real-money trades, simulation trades, ideal hindsight trades, no-trade days, and mixed days.
- The model can link to existing V4 objects without depending on them.
- The model is small enough to fill consistently.

### Layer 3 - Input Workflow And UI

Purpose:

- Make daily use fast enough that it will actually be maintained.
- Keep text labels explicit and avoid placeholder-only forms.

Primary screens:

- Top-level Journal workspace.
- Journal Day panel.
- Live Trades list.
- Ideal Trades list.
- Discipline Review panel.

Workflow stages:

- Before session: plan, mode, mental state, one discipline focus.
- During session: quick actual trade log and state notes.
- After session: trade reflection, ideal trades, discipline review, next focus.

Acceptance:

- The user can open the current date and write a Journal Day without first creating an Order Setup.
- The user can add a real-money trade and a simulation trade on the same day.
- The user can record a multi-contract trade with partial exits as one trade with multiple fills.
- The user can add ideal hindsight trades after the session even if no actual trade was taken.
- The UI does not become a long wall of mandatory fields.

### Layer 4 - V4 Integration

Purpose:

- Reuse the V4 platform without letting Journal become a hidden sub-feature of existing review modules.

Integration points:

- Top-level workspace switch in `index.html`: Backtesting / Journal.
- Optional Backtesting action to open Journal Day for the current date.
- Optional Journal action to open Backtesting on a trade date/time.
- Optional links to Order Setup, Chart Note, Time Reaction, PDA, Segment, SMT, and Daily Regime.
- Review JSON export/import includes Journal records.
- Journal Day is account/day scoped; nested trades and ideal trades carry instrument.

Non-coupling rules:

- Journal must not require an Order Setup.
- Order Setup must not become the Journal trade log.
- Ideal trades must not overwrite actual trade records.
- Journal should not require real-time market data in MVP.
- Journal should not be implemented as a duplicated `journal.html` app in MVP.

Acceptance:

- Journal data persists per account/date.
- Backtesting and Journal are visually separate workspaces.
- Export/import preserves Journal content.
- Existing review workflows continue to work without Journal enabled.

### Layer 5 - Review, Statistics, And Iteration

Purpose:

- Keep MVP focused, then let real usage reveal useful categories and statistics.

Not in first MVP:

- Broker import.
- Automatic PnL reconciliation.
- Performance dashboard.
- AI scoring.
- Complex discipline analytics.

Future candidates:

- Weekly discipline review.
- Aggregated mistake categories.
- Real-money vs simulation comparison.
- Actual trade vs ideal trade gap review.
- Rule adherence trends.
- Repeated emotional-state patterns.

Acceptance before adding statistics:

- At least several weeks of real Journal records exist.
- The repeated fields are obvious from usage.
- Statistics answer a real question instead of creating extra input burden.

## Phased Plan Skeleton

### Phase A - Design Freeze

Goal:

- Finalize the Journal MVP object model and UI workflow.

Deliverables:

- This design document.
- Field list freeze for first implementation.
- App shell/workspace decision.
- Clear non-goals.

Stop condition:

- The plan is clear enough that implementation can begin without re-debating the purpose of Journal.

#### Phase A Detailed Plan

Phase A is a design task, not an implementation task. Its output should be concrete enough that later coding steps can be small and testable.

##### A1 - Freeze Core Use Cases

Define the minimum real-world cases the MVP must support:

- Real-money trading day with one or more trades.
- Simulation-only trading day.
- Mixed day with both real-money and simulation trades.
- Multi-contract trade with partial exit and final exit.
- No-trade day with plan, mental state, post-market summary, discipline review, and ideal hindsight trades.
- Bad-decision day where the main value is recording rule breaks honestly.
- Missed-valid-trade day where the actual trade list is empty but ideal hindsight trades exist.

Acceptance:

- Each case can be represented by the proposed objects without inventing temporary fields.
- None of the cases require an Order Setup to exist first.

##### A2 - Freeze Field Groups

Split fields into three classes:

- Required identity fields: `id`, `date`, `accountId`, `createdAt`, `updatedAt`.
- High-value MVP input fields: fields likely to be filled every day or every trade.
- Deferred fields: useful later, but not worth increasing first-version friction.

Initial MVP field freeze:

- `JournalDay`: `accountId`, `accountType`, `dayMode`, `preMarketPlan`, `mentalStateBefore`, `intradayStateNotes`, `postMarketSummary`, `disciplineSummary`, `mainMistake`, `bestBehavior`, `nextSessionFocus`.
- `LiveTradeLog`: `accountId`, `instrument`, `tradeType`, `direction`, `fills[]`, `stopLoss`, `target`, `result`, `positionSize`, `plannedRisk`, `riskPerContract`, `grossPnl`, `netPnl`, `rMultipleManual`, `commissions`, `beforeEntryThoughts`, `entryReason`, `timingAssessment`, `followedPlan`, `ruleBreaks`, `managementNotes`, `reflection`, `whatWasRight`, `whatWasWrong`.
- `IdealTradeReview`: `instrument`, `idealType`, `direction`, `idealEntryTime`, `idealEntryPrice`, `idealStopLoss`, `idealTarget`, `idealExitTime`, `idealExitPrice`, `reason`, `whyThisWasIdeal`, `relationshipToActualTrade`, `noticedInRealTime`, `reviewNotes`.
- `DisciplineReview`: `plannedTradesOnly`, `waitedForSetup`, `respectedRisk`, `overtraded`, `fomo`, `revengeTrading`, `hesitatedOnValidTrade`, `tradedWhenShouldNot`, `failedToTradeWhenShould`, `disciplineReflection`, `oneRuleForTomorrow`.

Deferred from first data entry UI:

- detailed account metrics
- automatic R multiple
- complex target ladder
- broker/order id
- statistical tags beyond a short rule-break list
- automatic PnL calculation from fills

Acceptance:

- The first UI can be filled quickly.
- The model still has space to add deferred fields later without changing the purpose of Journal.

##### A3 - Freeze Enum Vocabulary

Use small enums for fields that should later support filtering. Keep everything else as text.

First enum candidates:

- `JournalDay.accountType`: `real`, `sim`, `eval`, `mixed`.
- `JournalDay.dayMode`: `real_money`, `simulation`, `review_only`, `mixed`, `no_trade`.
- `LiveTradeLog.tradeType`: `real_money`, `simulation`.
- `fill.type`: `entry`, `add`, `partial_exit`, `final_exit`, `stop_exit`, `manual_exit`.
- `IdealTradeReview.idealType`: `hindsight_optimal`, `plan_valid`.
- `direction`: `long`, `short`, `both`, `none`, `unknown`.
- `timingAssessment`: `good`, `early`, `late`, `unnecessary`, `missed_better_entry`, `unknown`.
- `followedPlan`: `yes`, `partial`, `no`, `not_planned`.
- `relationshipToActualTrade`: `matched_actual`, `actual_was_early`, `actual_was_late`, `actual_wrong_direction`, `missed_trade`, `no_actual_trade`, `simulation_only`.
- `noticedInRealTime`: `yes`, `no`, `unsure`.
- Discipline yes/no fields: `yes`, `no`, `partial`, `unknown` where `partial` makes sense.

Acceptance:

- Enums are few enough to not slow down writing.
- Text fields remain available for nuance.

##### A4 - Freeze UI Information Architecture

First UI should be one Journal workspace with one detail surface for the selected date, not multiple disconnected tools.

Proposed order:

1. App Shell: Backtesting / Journal workspace switch.
2. Journal Day Selector: date and account context.
3. Day Header: date, account, day mode, quick status.
4. Plan / State: pre-market plan, mental state, intraday state notes.
5. Actual Trades: compact list with expandable Live Trade Log details and fills.
6. Ideal Trades: compact list with expandable Ideal Trade Review details.
7. Discipline: structured checks plus reflection.
8. Summary / Tomorrow: post-market summary, main mistake, best behavior, next session focus.

Acceptance:

- No-trade day starts with day-level writing, not an empty trade table.
- Actual trades and ideal trades are visually separate.
- Real-money and simulation trades are distinguishable at row level.
- Fills are visible inside the trade detail without splitting one trade into several unrelated rows.
- Text inputs have visible labels.
- Backtesting and Journal have a visible workspace boundary.

##### A5 - Freeze Persistence And Archive Boundary

The implementation should follow current V4 workspace conventions.

Proposed storage:

- localStorage key family: `v4:journal:<accountId>`.
- payload shape: `{ version, savedAt, journalDays }`.
- identity: `accountId + date` for Journal Day; nested or referenced trade records use stable ids and carry their own `instrument`.
- Review JSON export/import includes a top-level `journalDays` array.

Compatibility rules:

- Journal Day is not tied to current Main instrument.
- Trade and ideal-trade instruments must be preserved during export/import.
- Import should preserve account/date identity and not silently merge conflicting days.
- Journal persistence should use the existing local persistence helper.

Acceptance:

- Refresh restores Journal.
- Export/import preserves Journal.
- Switching Backtesting Main instrument does not change Journal Day identity.

##### A6 - Freeze Links To Existing V4 Objects

Journal can link to review objects, but links are optional.

First link scope:

- Link Live Trade Log or Ideal Trade Review to Order Setup ids.
- Link to Chart Notes if useful.
- Keep PDA/Segment/SMT/Time Reaction links as future-compatible arrays, not required UI in the first slice.
- Navigation from Journal to Backtesting can use date/time/instrument even without linked objects.

Acceptance:

- Journal can be used without links.
- Links do not change ownership: linked Order Setup remains a review object; Journal trade remains a behavior/execution record.

##### A7 - Freeze Validation Examples

Before implementation starts, write 5 manual acceptance examples:

- Real-money losing trade that violated plan.
- Simulation trade that followed plan.
- No-trade day with ideal missed trade.
- Mixed day with one real trade and one simulation trade.
- Day with good result but poor discipline.
- Multi-contract trade with partial exit, final exit, manual net PnL, and manual R.

Acceptance:

- Each example maps to the frozen fields.
- The examples expose missing fields before coding starts.

### Phase B - Minimal Daily Journal

Goal:

- Create useful no-trade and daily summary records.

Scope:

- Journal Day store.
- Journal workspace date selector.
- Pre-market plan.
- Mental state.
- Post-market summary.
- Discipline summary.

Stop condition:

- A day can be journaled even when no trades were taken.

### Phase C - Actual Trade Logging

Goal:

- Record every actual real-money or simulation trade honestly.

Scope:

- Live Trade Log list.
- `real_money` / `simulation` type.
- `fills[]` for entry, add, partial exit, and final exit.
- Manual size, PnL, and R fields.
- Entry thoughts.
- Plan/rule compliance.
- Reflection fields.

Stop condition:

- A day with multiple actual trades can be recorded and reviewed, including a trade with partial exits.

### Phase D - Ideal Hindsight Trades

Goal:

- Add the "what should have been perfectly executed" comparison layer.

Scope:

- Ideal Trade Review list.
- Relationship to actual trade.
- Missed/no-actual/simulation-only cases.
- Optional links to Order Setup.

Stop condition:

- A no-trade day can still record ideal trades, and an actual trade can be compared against its ideal version.

### Phase E - V4 Integration And Archive

Goal:

- Make Journal part of the V4 workspace lifecycle.

Scope:

- Calendar badge/count.
- Top-level Backtesting / Journal workspace switch.
- Account/date-scoped persistence.
- Review JSON export/import.
- Links to existing review objects.
- Navigation between Journal date/time and Backtesting date/time.

Stop condition:

- Journal survives refresh/export/import and stays visibly separate from Backtesting while sharing common app infrastructure.

### Phase F - Usage Review Before Statistics

Goal:

- Use the MVP before adding analytics.

Scope:

- Review real entries after several weeks.
- Identify repeated discipline categories.
- Decide which structured fields are worth keeping.
- Decide which statistics would actually change behavior.

Stop condition:

- Next iteration is based on real Journal records, not guesses.
