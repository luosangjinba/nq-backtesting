# Session 2026-06-12 - Journal Phase D Plan

Branch: `feature/research-databento-data-journal`

Status: Planned, not implemented.

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

Proposed layout:

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
  - actual trades
- Post Session:
  - post-market summary
  - discipline summary
  - main mistake
  - best behavior
  - next-session focus
- Discipline Review:
  - first version should stay text-first unless a small set of toggles is clearly useful.

Requirements:

- Keep the page short enough to complete daily.
- Do not expose every existing schema field just because it exists.
- Keep Actual Trades as a distinct section.

### Step 287.2 - Journal Day UI Reorganization

Update `journal-workspace.js` layout to match Step 287.1.

Requirements:

- Add explicit section headings.
- Add explicit visible labels for all day-level fields.
- Preserve current Actual Trades UI behavior.
- Avoid nested cards and oversized marketing layout.
- Keep mobile layout usable.

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

### Step 287.4 - Minimal Discipline Review Shape

Decide whether Phase D exposes `disciplineReview` structured fields now or keeps discipline as text only.

Recommended first version:

- Keep `disciplineSummary` as the required text field.
- Optionally expose 3 compact select/toggle fields only if they are clearly useful:
  - planned trades only
  - respected risk
  - overtraded

Do not expose the full `disciplineReview` object in Phase D unless the UI remains quick to fill.

### Step 287.5 - Browser Smoke / Regression

Extend Journal browser smoke.

Required coverage:

- Switch to Journal.
- Fill pre-market, during-session, post-session, and discipline fields.
- Create actual trade and fill.
- Reopen page and verify all day-level fields plus trade/fill restore.
- Switch account/date and verify no leakage.
- Switch back to Backtesting and verify chart still exists.

### Step 287.6 - Documentation Closeout

Update TODO/session with implementation status and validation commands.

If UI field choices differ from this plan, record the reason in this session file.

## Recommended Commit Boundaries

- 287.1 commit after information architecture is frozen in docs.
- 287.2/287.3 commit after UI and persistence work.
- 287.4 commit if discipline structured controls are added.
- 287.5/287.6 commit after smoke/regression and docs pass.
