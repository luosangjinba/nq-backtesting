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
- Step 64 is complete.
- Step 66 is complete.
- Next step is Step 67: wire Entry Plan field changes through Inspector actions to `updateOrderReview()`.

## 2026-05-28 Update - Step 64
- Documented the Phase 8C editing entry boundary in `v4/docs/ORDER_REVIEW_DESIGN.md`.
- Decision: Inspector full form is the primary editing entry.
- Decision: chart pick is secondary and helper-only.
- Decision: no drag editing, no chart right-click order creation, no order marker hit-test selection, no automatic setup/target/statistics logic, and no DB writes in Phase 8C.
- Ownership remains:
  - store normalizes
  - persistence subscribes and saves
  - renderer draws visual helpers only
  - Inspector panel renders controls
  - Inspector sidebar routes actions and selected-object context

## 2026-05-28 Update - Step 65
- Added collapsible Order Review edit UI in `v4/src/ui/inspector/order-review-panel.js`.
- Each order row now has an `Edit Order Review` details section with:
  - `Setup Thesis`
  - `Entry Plan`
  - `Result Review`
- Controls are rendered with a shared `data-inspector-action="order-review-edit-field"` plus:
  - `data-order-review-id`
  - `data-order-review-section`
  - `data-order-review-field`
- Field-specific persistence is intentionally deferred to Steps 66-68.
- Added compact Inspector CSS in `v4/style.css` for nested order edit sections.
- Verification:
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `git diff --check -- v4/src/ui/inspector/order-review-panel.js v4/style.css`

## 2026-05-28 Update - Step 66
- Wired `setupThesis` edit fields in `v4/src/ui/inspector-sidebar.js`.
- Supported Setup Thesis fields:
  - `primaryEventTimestamp`
  - `primaryEventTimeframe`
  - `primaryEventType`
  - `primaryEventPrice`
  - `confidence`
  - `lowTimeframeWarning`
  - `higherTimeframeJustification`
  - `narrative`
- Setup event time uses the existing `parseEvidenceTimestamp()` parser and accepts the same `YYYY-MM-DD HH:mm` style.
- Setup event price rejects non-numeric input before updating.
- The active Order Review edit row is preserved across store refreshes via `expandedOrderReviewId`.
- Verification:
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `node --check v4/src/ui/inspector-sidebar.js`
  - `git diff --check -- v4/src/ui/inspector/order-review-panel.js v4/src/ui/inspector-sidebar.js`

## Local Files To Avoid Committing
- `__pycache__/`
- `tmp/`
- `trading_data.duckdb`
- `v3/plans/`
