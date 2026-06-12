# Session 2026-06-12 - Journal Usability Pass

Branch: `feature/research-databento-data-journal`

Status: Planned, not implemented.

## Goal

Run a usability pass on the Journal MVP after Phase B/C/D.

The goal is not to expand the schema. The goal is to make the current Journal page practical enough to use every day without friction.

## Current Journal MVP

Already implemented:

- Backtesting / Journal workspace boundary.
- Journal Day identity by `accountId + date`.
- Day-level fields:
  - pre-market plan
  - session intent
  - mental state before
  - intraday state notes
  - post-market summary
  - main mistake
  - best behavior
  - next-session focus
  - discipline summary
- Actual Trades:
  - real-money / simulation trade type
  - instrument
  - direction
  - timing
  - followed plan
  - result
  - manual net PnL
  - manual R
  - reflection
  - fills
- Local persistence and browser smoke coverage.

## Boundaries

In scope:

- UI density and field ergonomics.
- Textarea heights and layout balance.
- Actual Trades expanded/collapsed usability.
- Date/account/day mode header usability.
- Mobile/small-screen usability.
- Browser smoke adjustments for usability-sensitive behavior.
- Small CSS/DOM changes that make the current Journal easier to use.

Out of scope:

- New Journal schema fields.
- IdealTradeReview UI.
- Statistics dashboard.
- Broker import.
- Automatic PnL/R calculation.
- Database/cloud sync.
- Separate `journal.html`.

## Step 288 Plan

### Step 288.1 - Browser Usability Audit

Open the current Journal page in a real browser smoke context and inspect:

- Initial viewport fit.
- Whether the field order feels like a real trading day workflow.
- Whether textareas are too tall or too short.
- Whether Actual Trades dominates the page when expanded.
- Whether the header controls are easy to use.
- Whether there is excessive vertical scrolling.
- Whether small-screen layout stays usable.

Output:

- A short audit note in this session file.
- A concrete list of changes, or a decision that no UI change is needed.

### Step 288.2 - Quick Navigation Controls

Evaluate and, if useful, add low-risk date navigation:

- Today.
- Previous day.
- Next day.

Requirements:

- Must update the existing `activeDate` path.
- Must preserve account/date isolation.
- Must not create empty trades.
- Browser smoke should cover at least one date navigation action if implemented.

### Step 288.3 - Textarea Ergonomics

Tune day-level textarea heights.

Candidate direction:

- Shorter fields:
  - session intent
  - mental state before
  - main mistake
  - best behavior
  - next-session focus
- Taller fields:
  - pre-market plan
  - intraday state notes
  - post-market summary
  - discipline summary

Requirements:

- Do not rely on placeholder instructions.
- Preserve visible labels.
- Keep mobile usable.

### Step 288.4 - Actual Trades Usability

Review whether the expanded actual trade editor is too visually heavy.

Possible low-risk changes:

- Make row summary more scannable.
- Keep fill editor compact.
- Reduce unnecessary vertical spacing.
- Ensure collapsed rows show enough information.

Do not add new trade fields in this step.

### Step 288.5 - Browser Smoke / Regression

Run the standard Journal and Backtesting smoke set.

Required validation:

- `node v4/tests/journal-workspace-browser-smoke.js`
- `node v4/tests/journal-store-smoke.js`
- `node v4/tests/journal-persistence-smoke.js`
- `node v4/tests/journal-actual-trade-examples-smoke.js`
- `node v4/tests/primary-instrument-browser-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`
- `git diff --check`

### Step 288.6 - Documentation Closeout

Update TODO/session with:

- What was changed.
- What was intentionally left unchanged.
- Validation commands.

## Recommended Commit Boundaries

- 288.1 commit after audit notes are written.
- 288.2/288.3 commit after navigation and field ergonomics changes.
- 288.4 commit only if actual trade UI is changed.
- 288.5/288.6 commit after smoke/regression and docs pass.
