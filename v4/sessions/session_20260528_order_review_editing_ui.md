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

## 2026-05-28 Merge To Main
- `feature/order-review-editing-ui` was fast-forward merged into `main`.
- Merge head: `468dd28 fix(v4): clear order review price pick on cancel`.
- Final checks before merge:
  - full `v4/src/**/*.js` `node --check`
  - `git diff --check main...HEAD`
  - API health
  - headless Chrome smoke
  - `git status`
- Review found one issue before merge: price pick cancel / invalid source left stale pick state active. Fixed in `468dd28`.
- `main` now contains Phase 8C:
  - full Inspector Order Review edit form
  - Setup Thesis / Entry Plan / Result Review saves
  - linked refs management
  - setup / entry / exit time pick
  - entry / stop / final target price pick

## 2026-05-28 Direction Change - Phase 8D
- User clarified that the current Inspector-first workflow is not the desired primary interaction.
- New direction:
  - Order Setup should be created and edited primarily from chart actions.
  - Inspector should be reduced to lightweight summary, a few corrections, refs, note/result, locate/delete.
  - Segment / Composite should not be treated as the normal order parent.
  - PDA / SMT / Segment / Composite are all supporting linked refs.
  - A setup may be a 1H/30M PDA event, such as a 1H FVG touch and bounce, without needing a drawable 1H segment.
- Added `Phase 8D: Chart-First Order Setup Workflow` to `v4/TODO.md`.
- Planned steps:
  - Step 73: redefine interaction boundary
  - Step 74: active Order Setup state
  - Step 75: chart context menu Order Setup actions
  - Step 76: link chart objects to active setup
  - Step 77: compact Inspector default view
  - Step 78: docs/user guide update
  - Step 79: chart-first workflow verification

## 2026-05-28 Update - Phase 8D Steps 73-78
- Created branch `feature/chart-first-order-setup`.
- Added `v4/src/order/order-review-active.js` for session-only active Order Setup state.
- `app.js` now initializes active Order Setup state.
- Main chart right-click menu now has an `Order Setup` group.
- Chart actions added:
  - `Create Bullish Setup Here`
  - `Create Bearish Setup Here`
  - `Set Setup Event Here`
  - `Set Entry Time Here`
  - `Set Exit Time Here`
  - `Set Entry Price Here`
  - `Set Stop Loss Here`
  - `Set Final Target Here`
- Object linking actions added:
  - clicked PDA -> active setup
  - clicked Segment -> active setup
  - clicked Composite Move -> active setup
  - latest SMT -> active setup
- Inspector now passes `activeOrderReviewId` into the Order Review panel.
- Order Review rows now show compact setup summaries by default; the full form is moved under `Advanced Edit`.
- Inspector can `Set Active Setup` and `Clear Active Setup`.
- Updated:
  - `v4/docs/ORDER_REVIEW_DESIGN.md`
  - `v4/docs/USER_GUIDE.zh-CN.md`
  - `v4/docs/USER_GUIDE.en.md`
- Step 79 remains: verification of the chart-first workflow.

## 2026-05-28 Update - Phase 8D Step 79
- Full `v4/src/**/*.js` syntax check passed.
- `git diff --check` passed.
- Active setup probe passed:
  - chart-created setup becomes active
  - active setup can receive entry fields
  - linked refs write through `linkRefToActiveOrderReview()`
  - store derives `riskPoints`
- Probe result:

```json
{"active":true,"count":1,"setup":1326120300,"price":2368.25,"entry":1326120600,"refs":1,"risk":5}
```

- API health passed at `http://127.0.0.1:8766/v4/health`.
- Page service passed at `http://127.0.0.1:8001/index.html`.
- Headless Chrome smoke passed:
  - right-click menu contains `Order Setup`
  - menu contains `Create Bullish Setup Here`
  - menu contains `Set Entry Time Here`
  - menu contains `Set Final Target Here`
- Chart-first creation smoke passed after loading 2012-01-09 09:00-16:00 1H bars:
  - found a chart bar at `2012-01-09 10:00`
  - clicked `Create Bullish Setup Here`
  - confirmed one Order Review row
  - confirmed active row
  - confirmed compact summary
  - confirmed `Advanced Edit`
- Browser smoke result:

```json
{"rows":1,"active":1,"summary":1,"advanced":1,"textIncludes":true}
```

- Review JSON and localStorage schemas were not changed in Phase 8D; they continue to use the existing Order Review store/persistence/archive paths from Phase 8B/8C.

## 2026-05-28 Update - PDA Extend Cross-Timeframe Fix
- User reported that PDA `extendBars` was tied to current chart bars, so a 1M Fib extended by 20 bars became 20 hours after switching to 1H.
- Added `v4/src/pda/pda-extend.js`.
- New behavior:
  - Inspector still lets the user enter extend in current chart bars.
  - On save, the app stores `display.extendSeconds` and `display.extendTimeframe`.
  - Main PDA renderer, secondary PDA renderer, and PDA hit-test convert that duration back into current timeframe bars.
  - Legacy annotations without `extendSeconds` infer the original timeframe from `display.extendTimeframe`, `display.sourceTimeframe`, `annotation.timeframe`, or context labels when possible.
- Fixed sub-bar extend rendering:
  - Primitive extension now uses pixel-level `barSpacing` math instead of `logicalToCoordinate(logical + fractionalBars)`.
  - This prevents fractional values such as `0.75` or `1.5` from extending in the wrong direction.
- Fixed Fib-specific behavior:
  - Original Fib boundaries remain visible.
  - Positive extend only appends to the original right boundary.
  - Fib hit-test now matches the visual range.
- Validation:
  - Full `v4/src/**/*.js` syntax check passed.
  - `git diff --check` passed.
  - Probe confirmed `1M extend 20` converts to `0.3333` bars on `1H`.
