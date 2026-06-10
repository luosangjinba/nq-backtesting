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
- Step 277.1 completed:
  - Naming is fixed as `Opening Thesis Review`.
  - `Bias` and `Fixed Time State` boundaries are fixed.
  - Fixed Time State remains an unchanged statistical observation block.
- Step 277.2 completed:
  - Added normalized `bias` and `openingThesisReview` objects to Daily Time Review.
  - Legacy note fields seed the new structures during normalization.
  - Empty new structures do not count as Calendar/exportable content.
  - Added `v4/tests/daily-time-review-store-smoke.js`.
- Step 277.3 completed:
  - Daily Time detail now renders `Bias`, `Opening Thesis Review`, and `Fixed Time State` as the main blocks.
  - `Bias` includes weekly bias, daily bias, and bias review text.
  - `Opening Thesis Review` includes pre-open thesis, 09:30-11:00 summary, full day summary, and thesis review text.
  - Fixed Time State editing remains available.
  - Added `v4/tests/time-reaction-panel-smoke.js`.
- Step 277.4 completed:
  - Kept the Daily Time Review localStorage key stable as `v4:daily-time-reviews:NQ`.
  - Review JSON export includes populated `bias` and `openingThesisReview` structures.
  - Calendar preview reads `Bias` and `Opening Thesis Review` summaries through null-safe helpers.
  - Blank new-structure drafts are filtered from exportable Daily Time Review content.
  - Added `v4/tests/daily-time-review-archive-smoke.js` and extended `v4/tests/calendar-visibility-smoke.js`.
- Step 277.5 completed:
  - Legacy Daily Time notes normalize into the new `Bias` and `Opening Thesis Review` structures.
  - Bias supports weekly bias, daily bias, and after-the-fact review.
  - Opening Thesis Review supports pre-open thesis, 09:30-11:00 summary, full day summary, and final thesis review.
  - Fixed Time State remains unchanged.
  - Validation passed:
    - `for f in v4/tests/*.js; do node "$f" || exit 1; done`
    - `for f in $(rg --files v4/src v4/tests -g '*.js'); do node --check "$f" || exit 1; done`
- Follow-up fix:
  - Calendar `Time Reaction Observation` rows now match the simplified model: `Bias`, `Opening Thesis Review`, and `固定时点状态`.
  - Removed old Calendar row labels from the display path: `周 Bias 分析`, `日 Bias 分析`, `09:30 前状态分析`, `09:30-11:00 Summary`, and `全天 Summary`.
  - Added calendar smoke assertions for the new row labels and previews.
- Input performance hotfix:
  - Bias and Opening Thesis Review text changes no longer force an immediate Inspector re-render.
  - `daily-time-review:changed` skips refresh while a Daily Time long-text field is actively focused.
  - This keeps local save/history behavior while avoiding textarea DOM rebuilds during editing.
- Bias field follow-up:
  - Bias now has four explicit long-text fields: `日 Bias 预判`, `日 Bias 验证`, `周 Bias 预判（周一填写）`, and `周 Bias 验证（周五填写）`.
  - Field titles are visible labels above each textarea, not placeholder text.
  - Legacy `dailyBias` / `weeklyBias` still map to the new prediction fields, and legacy `biasReview` maps to daily bias review.
- Panel structure fix:
  - The main Daily Time panel now renders `Bias`, `Opening Thesis Review`, and `固定时点状态` as sibling cards.
  - `固定时点状态` no longer embeds the full fixed-time detail section inside the main panel.
  - Opening Thesis Review fields now use explicit titles so they do not visually inherit Bias or Fixed Time content.
- Opening Thesis title follow-up:
  - Opening Thesis Review field titles are now explicit fixed labels: `预判（09:30 前）`, `验证（09:30-11:00）`, `验证（全天）`, and `结论（Opening Thesis Review）`.
  - The titles are rendered above each textarea, not as placeholder text inside the input.
- Section open isolation fix:
  - Calendar `Time Reaction Observation` rows now open section-specific detail panels.
  - `Bias`, `Opening Thesis Review`, and `固定时点状态` each render only their own fields when opened from Calendar.
  - Smoke coverage asserts the Calendar row section keys and that each section panel excludes the other two groups.
