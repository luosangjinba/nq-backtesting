# Session 2026-06-10: Daily Time Review Simplification Plan

Branch: `feature/time-reaction-forward-validation`

Decision:

- Merge `09:30 前状态分析`, `09:30-11:00 Summary`, and `Full Day Summary` into one workflow object named **Opening Thesis Review**.
- Rationale for the name:
  - It describes the full sequence, not just the input note.
  - `Opening` anchors it to the 09:30 open.
  - `Thesis` implies a pre-open hypothesis that may have multiple branches.
  - `Review` implies the later 09:30-11:00 and full-day verification.
- Avoid names like `Pre 09:30 Analysis` because that only describes the first step and hides the validation half.

Target Model:

1. `Bias`
   - Combines weekly and daily bias.
   - Fields:
     - `weeklyBias`
     - `dailyBias`
     - `biasReview`
   - `biasReview` is a free text after-the-fact validation box.

2. `Opening Thesis Review`
   - Combines:
     - pre-09:30 state / thesis
     - 09:30-11:00 summary
     - full day summary
     - after-the-fact thesis review
   - Proposed fields:
     - `preOpenThesis`
     - `morningSummary0930To1100`
     - `fullDaySummary`
     - `thesisReview`
   - This object represents one loop:
     - what I thought before the open
     - what happened in the first 90 minutes
     - what happened over the full day
     - whether the thesis was useful / accurate

3. `Fixed Time State`
   - Remains unchanged.
   - It is statistical/observational data around fixed time points.
   - Do not merge it into Opening Thesis Review.

Compatibility Requirements:

- Keep the localStorage key `v4:daily-time-reviews:NQ`.
- Preserve old Daily Time data:
  - `weeklyBias.note` maps to `bias.weeklyBias`.
  - `dailyBias.note` maps to `bias.dailyBias`.
  - `pre0930Analysis.note` maps to `openingThesisReview.preOpenThesis`.
  - `summary0930To1100.note` maps to `openingThesisReview.morningSummary0930To1100`.
  - `fullDaySummary.note` maps to `openingThesisReview.fullDaySummary`.
- Empty default objects should not count as Calendar/exportable content.

Planned Steps:

- Step 277.1: Confirm naming and ownership boundaries in TODO/session.
- Step 277.2: Add normalized store schema for `bias` and `openingThesisReview` with old-field compatibility.
- Step 277.3: Update Daily Time detail UI to show:
  - Bias
  - Opening Thesis Review
  - Fixed Time State
- Step 277.4: Update Calendar preview, Review JSON/localStorage smoke coverage, and content detection.
- Step 277.5: Validate:
  - legacy notes restore into the new structure
  - Bias has a review textbox
  - Opening Thesis Review supports pre-open thesis plus two summaries and final review
  - Fixed Time State remains unchanged

Current Status:

- Current branch is reset to the branch start baseline.
- No Step 277 implementation is currently present.
- `v4/TODO.md` has been updated with the new Step 277 plan.
