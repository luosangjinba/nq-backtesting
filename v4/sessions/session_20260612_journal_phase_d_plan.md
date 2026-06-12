# Session 2026-06-12 - Journal Phase D Plan

Branch: `feature/research-databento-data-journal`

Status: Completed.

## Goal

Implement Journal Phase D: practical day-level review.

Phase B added the Journal workspace and minimal Journal Day fields. Phase C added actual trade logging. Phase D should make the selected Journal Day useful as a full trading-day record:

- Pre-market plan.
- Pre-market mental/state check.
- Intraday state notes.
- Post-market summary.
- Discipline review.
- Next-session focus.

The goal is not to add a large form. The goal is to make the daily journal easy to complete after every session.

## Boundaries

In scope:

- Reorganize the Journal workspace into clear day-level sections.
- Keep actual trades as the main trade-specific section.
- Add only high-value Journal Day fields already supported by the store where possible.
- Use explicit labels, not placeholder-only instructions.
- Preserve `accountId + date` identity and existing localStorage persistence.
- Browser smoke should verify day-level fields plus actual trades still persist.

Out of scope:

- IdealTradeReview UI.
- Statistics dashboard.
- Broker import.
- Automatic PnL/R calculation.
- Separate `journal.html`.
- Database persistence or cloud sync.
- Complex scoring system.

## Design Principle

The Journal page should answer three practical questions:

1. What was the plan and state before trading?
2. What actually happened during trading?
3. What should be learned or changed after trading?

If a field does not help answer one of these, it should not be added in Phase D.

## Step 287 Plan

### Step 287.1 - Freeze Day-Level Information Architecture

Define the Journal Day sections and field order.

Frozen layout:

- Day Header:
  - account
  - date
  - day mode
- Pre-Market:
  - pre-market plan
  - session intent
  - mental state before
- During Session:
  - intraday state notes
- Actual Trades:
  - keep as its own section, placed after During Session
  - do not merge into During Session, because trades have their own lifecycle and fill editor
- Post Session:
  - post-market summary
  - discipline summary
  - main mistake
  - best behavior
  - next-session focus
- Discipline Review:
  - Phase D stays text-first
  - do not expose structured discipline toggles yet

Requirements:

- Keep the page short enough to complete daily.
- Do not expose every existing schema field just because it exists.
- Keep Actual Trades as a distinct section.

## Step 287.1 Status

Completed.

The Journal Day information architecture is frozen for Phase D.

Final page sections:

- Day Header
- Pre-Market
- During Session
- Actual Trades
- Post Session
- Discipline Review

Fields shown in Phase D:

- `accountId`
- `date`
- `dayMode`
- `preMarketPlan`
- `sessionIntent`
- `mentalStateBefore`
- `intradayStateNotes`
- `liveTrades`
- `postMarketSummary`
- `disciplineSummary`
- `mainMistake`
- `bestBehavior`
- `nextSessionFocus`

Fields intentionally not shown in Phase D:

- `idealTrades`
- full `disciplineReview` structured object
- automatic score or grading fields
- broker/order import fields
- chart object linking fields
- trade statistics fields

Discipline decision:

- Keep discipline text-first in Phase D.
- `disciplineSummary` is the primary discipline field.
- Do not add planned-trades-only / respected-risk / overtraded controls yet.
- Revisit structured discipline controls only after using the text-first version for several sessions.

Rationale:

- Phase D should be quick enough to complete every day.
- Actual Trades remain distinct from During Session because they have their own expanded editor and fills.
- The visible fields map to the three practical questions: plan/state before trading, what happened during trading, and what should change after trading.

### Step 287.2 - Journal Day UI Reorganization

Update `journal-workspace.js` layout to match Step 287.1.

Requirements:

- Add explicit section headings.
- Add explicit visible labels for all day-level fields.
- Preserve current Actual Trades UI behavior.
- Avoid nested cards and oversized marketing layout.
- Keep mobile layout usable.

## Step 287.2 Status

Completed.

Journal workspace now renders the Phase D information architecture:

- Day Header:
  - account
  - date
  - day mode
- Pre-Market:
  - pre-market plan
  - session intent
  - mental state before
- During Session:
  - intraday state notes
- Actual Trades:
  - unchanged actual trade list/editor
- Post Session:
  - post-market summary
  - main mistake
  - best behavior
  - next-session focus
- Discipline Review:
  - discipline summary

Actual Trades remain a distinct section and were not merged into During Session.

### Step 287.3 - Day-Level Field Persistence

Wire newly visible day-level fields into existing `JournalDay`.

Candidate existing store fields:

- `preMarketPlan`
- `sessionIntent`
- `mentalStateBefore`
- `intradayStateNotes`
- `postMarketSummary`
- `disciplineSummary`
- `mainMistake`
- `bestBehavior`
- `nextSessionFocus`

Requirements:

- Account/date switching does not leak fields.
- Refresh/reopen restores all day-level fields.
- Empty page load does not create unnecessary trade rows.

## Step 287.3 Status

Completed.

Newly visible fields use the existing `data-journal-field` debounce update path and existing `JournalDay` store fields:

- `sessionIntent`
- `intradayStateNotes`
- `mainMistake`
- `bestBehavior`
- `nextSessionFocus`

Browser smoke now verifies:

- all day-level fields save to `v4:journal:<accountId>`
- reopening the page restores all day-level fields
- switching date shows empty day-level fields and no trade leakage
- switching account shows empty day-level fields and no trade leakage
- switching back to original account/date restores original day-level fields and trade/fill

Validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `node v4/tests/journal-actual-trade-examples-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 287.4 - Minimal Discipline Review Shape

Decide whether Phase D exposes `disciplineReview` structured fields now or keeps discipline as text only.

Recommended first version:

- Keep `disciplineSummary` as the required text field.
- Optionally expose 3 compact select/toggle fields only if they are clearly useful:
  - planned trades only
  - respected risk
  - overtraded

Do not expose the full `disciplineReview` object in Phase D unless the UI remains quick to fill.

## Step 287.4 Status

Completed.

Phase D uses the text-first discipline design:

- `disciplineSummary` is the only visible discipline field.
- No discipline toggles were added.
- The full `disciplineReview` structured object remains hidden.
- No scoring or grading system was added.

Reason:

- The Journal page should remain fast enough to fill every day.
- Structured discipline controls should be based on repeated real usage, not premature modeling.

### Step 287.5 - Browser Smoke / Regression

Extend Journal browser smoke.

Required coverage:

- Switch to Journal.
- Fill pre-market, during-session, post-session, and discipline fields.
- Create actual trade and fill.
- Reopen page and verify all day-level fields plus trade/fill restore.
- Switch account/date and verify no leakage.
- Switch back to Backtesting and verify chart still exists.

## Step 287.5 Status

Completed.

`v4/tests/journal-workspace-browser-smoke.js` now covers:

- Journal workspace switch.
- Phase D day-level fields:
  - pre-market plan
  - session intent
  - mental state before
  - intraday state notes
  - post-market summary
  - main mistake
  - best behavior
  - next-session focus
  - discipline summary
- Actual trade creation.
- Fill creation/editing.
- Manual PnL/R entry.
- Reopen/restore behavior.
- Account/date isolation.
- Backtesting workspace switch and chart presence.

### Step 287.6 - Documentation Closeout

Update TODO/session with implementation status and validation commands.

If UI field choices differ from this plan, record the reason in this session file.

## Step 287.6 Status

Completed.

Final Phase D field choices match Step 287.1 except that `disciplineSummary` is rendered under the standalone Discipline Review section, while Post Session keeps post-market summary, main mistake, best behavior, and next-session focus.

Validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `node v4/tests/journal-actual-trade-examples-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

## Recommended Commit Boundaries

- 287.1 commit after information architecture is frozen in docs.
- 287.2/287.3 commit after UI and persistence work.
- 287.4 commit if discipline structured controls are added.
- 287.5/287.6 commit after smoke/regression and docs pass.
