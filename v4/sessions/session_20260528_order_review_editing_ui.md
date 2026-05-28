# V4 Order Review Editing UI Handoff

## Branch
- `feature/order-review-editing-ui`

## Base
- Created from `main` after `821add8 docs(v4): record order review merge`.
- Phase 8B Order Review MVP is already merged into `main`.

## Objective
- Start Phase 8C: make Order Review records editable from the V4 UI.
- First version should prioritize a complete Inspector editing workflow, then add chart pick helpers.
- Keep this phase manual and review-oriented.

## Scope
- Inspector should allow editing the existing Order Review object:
  - Setup Thesis
  - Entry Plan
  - Result Review
  - linked refs
- Chart interaction should be helper-only:
  - pick setup / entry / exit time from the main chart
  - pick price from OHLC or current chart price for entry / stop / target fields
- Rendering remains the existing lightweight marker/helper-line layer unless the edit workflow requires a small refresh.

## Non-Goals
- No automatic signal detection.
- No automatic 09:30 / 09:50 / Silver Bullet verdict.
- No drag-to-edit overlays.
- No statistics page.
- No DB writes.

## TODO Updated
- Added `Phase 8C: Order Review Editing UI` to `v4/TODO.md`.
- Planned steps:
  - Step 64: define editing entry boundaries
  - Step 65: add collapsible Inspector editing sections
  - Step 66: edit Setup Thesis fields
  - Step 67: edit Entry Plan fields
  - Step 68: edit Result Review fields and derived outcome refresh
  - Step 69: manage linked refs
  - Step 70: chart pick for setup / entry / exit timestamps
  - Step 71: chart price pick for entry / stop / target
  - Step 72: verify full manual recording workflow

## Current Implementation Context
- Store:
  - `v4/src/order/order-review-store.js`
  - normalizes incomplete drafts and emits `order-review:changed`
  - update path is `updateOrderReview(id, patch)`
- Persistence:
  - `v4/src/order/order-review-persistence.js`
  - localStorage key `v4:order-reviews:NQ`
  - saves after store changes
- Inspector:
  - `v4/src/ui/inspector/order-review-panel.js`
  - currently provides compact read-only panels plus basic actions
  - likely the main file for Step 65-69
- Sidebar integration:
  - `v4/src/ui/inspector-sidebar.js`
  - currently creates blank / segment-derived / composite-derived order reviews
  - handles locate, note/result update, and delete
- Renderer:
  - `v4/src/order/order-review-renderer.js`
  - draws setup / entry / exit vertical markers and optional SL / target helper lines
- Archive:
  - Review JSON includes `orderReviews`
  - imports normalize order reviews and remap linked refs

## Suggested Next Step
- Execute Step 64 first: document the exact edit-mode boundary in code comments or TODO notes before changing UI, then move to Step 65.

## Local Files To Avoid Committing
- `__pycache__/`
- `tmp/`
- `trading_data.duckdb`
- `v3/plans/`
