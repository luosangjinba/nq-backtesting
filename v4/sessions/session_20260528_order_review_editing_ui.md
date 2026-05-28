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
- Step 72 is complete.
- Phase 8C implementation steps are complete; next step should be review / commit / optional manual visual pass before merging.

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

## 2026-05-28 Update - Step 67
- Wired `entryPlan` edit fields in `v4/src/ui/inspector-sidebar.js`.
- Supported Entry Plan fields:
  - `direction`
  - `entryTimestamp`
  - `entryTimeframe`
  - `entryPrice`
  - `entryModel`
  - `stopLoss`
  - `stopReason`
  - `targetInternal`
  - `targetSwing`
  - `targetExternal`
  - `selectedTargetType`
  - `finalTarget`
  - `note`
- Entry time uses `parseEvidenceTimestamp()` and accepts the same `YYYY-MM-DD HH:mm` style as Setup Thesis.
- Price fields reject non-numeric input before updating.
- `riskPoints` remains store-derived from `entryPrice` and `stopLoss`, so changing either field refreshes the read-only value after normalization.
- Verification:
  - `node --check v4/src/ui/inspector-sidebar.js`
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `git diff --check -- v4/src/ui/inspector-sidebar.js v4/src/ui/inspector/order-review-panel.js`

## 2026-05-28 Update - Step 68
- Wired `resultReview` edit fields in `v4/src/ui/inspector-sidebar.js`.
- Supported Result Review fields:
  - `expectedTargetReached`
  - `finalTargetReached`
  - `exitTimestamp`
  - `exitPrice`
  - `result`
  - `exitReason`
  - `note`
- Exit time uses `parseEvidenceTimestamp()` and accepts the same `YYYY-MM-DD HH:mm` style.
- Exit price rejects non-numeric input before updating.
- `outcomePoints` and `outcomeR` remain store-derived from Entry Plan plus Result Review.
- Verification:
  - `node --check v4/src/ui/inspector-sidebar.js`
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `git diff --check -- v4/src/ui/inspector-sidebar.js`
  - node probe confirmed `{ riskPoints: 5, outcomePoints: 10, outcomeR: 2 }` for a long entry 100 / stop 95 / exit 110

## 2026-05-28 Update - Step 69
- Added linked refs management to the Order Review editor.
- `Setup Thesis` edit section now shows:
  - existing `linkedObjectRefs`
  - per-ref remove button
  - add buttons for selected PDA / Segment / Composite / SMT
- Ref updates write through `updateOrderReview()` with `setupThesis.linkedObjectRefs`, so store normalization still handles dedupe and validation.
- PDA / Segment / Composite refs use the existing chart selection stores.
- SMT did not previously have a selection model, so first version adds a `Select` button to each SMT row in `v4/src/ui/inspector/smt-panel.js`; `Add SMT` links the currently selected SMT id.
- Added compact linked-ref UI styles in `v4/style.css`.
- Verification:
  - `node --check v4/src/ui/inspector-sidebar.js`
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `node --check v4/src/ui/inspector/smt-panel.js`
  - `git diff --check -- v4/src/ui/inspector-sidebar.js v4/src/ui/inspector/order-review-panel.js v4/src/ui/inspector/smt-panel.js v4/style.css`

## 2026-05-28 Update - Step 70
- Added `Pick` buttons beside Order Review timestamp inputs:
  - Setup Thesis `primaryEventTimestamp`
  - Entry Plan `entryTimestamp`
  - Result Review `exitTimestamp`
- Added Order Review time pick state in `v4/src/ui/inspector-sidebar.js`.
- Pick workflow:
  - click `Pick` in Inspector
  - hover main chart shows the existing preview cursor
  - click a main chart bar to write that bar timestamp into the target field
  - `Escape` cancels pick mode
- Order Review time pick clears actor bar pick if needed, and bars clear also clears pick state.
- Verification:
  - `node --check v4/src/ui/inspector-sidebar.js`
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `git diff --check -- v4/src/ui/inspector-sidebar.js v4/src/ui/inspector/order-review-panel.js`

## 2026-05-28 Update - Step 71
- Added price `Pick` buttons for:
  - `entryPlan.entryPrice`
  - `entryPlan.stopLoss`
  - `entryPlan.finalTarget`
- Added Order Review price pick state in `v4/src/ui/inspector-sidebar.js`.
- Pick workflow:
  - click `Pick` beside a price field
  - hover main chart shows the existing preview cursor
  - click a main chart bar
  - choose `current`, `open`, `high`, `low`, or `close` in the first-version browser prompt
  - selected price writes back through `updateOrderReview()`
- Short aliases are supported in the prompt: `o/h/l/c`.
- Price pick is still helper-only; no drag editing was added.
- Verification:
  - `node --check v4/src/ui/inspector-sidebar.js`
  - `node --check v4/src/ui/inspector/order-review-panel.js`
  - `git diff --check -- v4/src/ui/inspector-sidebar.js v4/src/ui/inspector/order-review-panel.js`

## 2026-05-28 Update - Step 72
- Ran full JS syntax check across `v4/src/**/*.js`.
- Ran `git diff --check` for the Phase 8C modified files.
- Ran a store-level probe that covered:
  - blank order creation
  - Setup Thesis update
  - Entry Plan update
  - Result Review update
  - linked ref dedupe
  - `riskPoints`
  - `outcomePoints`
  - `outcomeR`
- Probe result:

```json
{"count":1,"refs":1,"risk":5,"points":10,"r":2}
```

- Confirmed API health at `http://127.0.0.1:8766/v4/health`.
- Headless Chrome `--dump-dom` confirmed the V4 page initializes at `http://127.0.0.1:8001/index.html`, chart canvas renders, and Inspector shows Order Reviews.
- Chrome DevTools smoke test:
  - cleared localStorage
  - clicked `Create Blank Order Review`
  - confirmed one order row renders
  - confirmed edit section auto-opens
  - confirmed Setup / Entry / Exit time pick buttons render
  - confirmed three price pick buttons render
  - confirmed four linked ref add buttons render
  - confirmed 28 editable fields render
- Browser smoke result:

```json
{"rows":1,"editorOpen":true,"setupPick":1,"entryPick":1,"exitPick":1,"pricePick":3,"refAdd":4,"refRemove":0,"fields":28}
```

- Validation found and fixed one issue: new Order Review creation emitted store refresh before `expandedOrderReviewId` was set, so the edit section did not auto-open. The create helpers now call `refreshSelection()` after setting `expandedOrderReviewId`.
- Note: `bash v4/start.sh restart` could not bind the API port inside the current sandbox (`PermissionError: [Errno 1] Operation not permitted`), but an existing API process was reachable and returned healthy.

## Local Files To Avoid Committing
- `__pycache__/`
- `tmp/`
- `trading_data.duckdb`
- `v3/plans/`
