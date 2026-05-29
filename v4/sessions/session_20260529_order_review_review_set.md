# V4 Order Review Review Set Cleanup

## Branch
- `feature/order-review-cleanup`

## Objective
- Rebuild the Order Setup infrastructure around the concept that one Order Setup is one Review Set.
- Keep the existing `OrderReview` / `orderReviews` persistence schema compatible during the first migration pass.

## Step 96 Completed
- Updated `v4/docs/ORDER_REVIEW_DESIGN.md` with the Review Set boundary.
- Updated `v4/TODO.md` with Phase 8F implementation steps.

## Decisions
- A Review Set is the chart-facing and interaction-facing container for one planned or reviewed trade idea.
- The existing `OrderReview` record remains canonical storage for now.
- `Review Set` is an adapter/infrastructure abstraction, not a new persisted schema in the first pass.
- Linked `PDA / Segment / Composite / SMT` objects remain references only.
- Calendar, locate, active selection, visibility, focus, and renderer grouping should move toward the Review Set adapter.
- Future schema rename or export format changes require a separate compatibility pass.

## Next Step
- Step 97: add a Review Set adapter over `getOrderReviews()`.

## Step 97 Completed
- Added `v4/src/order/order-review-set.js`.
- The adapter exposes:
  - `getReviewSets()`
  - `getReviewSetById()`
  - `getReviewSetTimeRange()`
  - `locateReviewSet()`
- The adapter maps one existing `OrderReview` to one `order-setup` Review Set without changing localStorage or Review JSON.
- Inspector Order Review locate now routes through `locateReviewSet()` while keeping the existing user-facing action name.

## Next Step
- Step 98: migrate active Order Setup semantics toward active Review Set while keeping existing active id compatibility.

## Step 98 Completed
- Updated `v4/src/order/order-review-active.js` so the internal active state is `activeReviewSetId`.
- Added Review Set active APIs:
  - `getActiveReviewSetId()`
  - `getActiveReviewSet()`
  - `setActiveReviewSet()`
  - `clearActiveReviewSet()`
  - `createChartReviewSet()`
  - `updateActiveReviewSet()`
  - `linkRefToActiveReviewSet()`
- Kept existing Order Review active APIs as compatibility wrappers.
- `order-review-active:changed` now emits both Review Set fields and legacy Order Review fields.
- Updated chart right-click Order Setup actions to write through active Review Set APIs.
- Updated Inspector active setup operations to use active Review Set APIs while preserving existing panel option names.

## Next Step
- Step 99: reorganize the Inspector Order Reviews panel around Review Set summaries and keep detailed editing collapsed.

## Step 99 Completed
- Updated `v4/src/ui/inspector/order-review-panel.js` so the Inspector section is now titled `Review Sets`.
- Each row derives a Review Set view from the existing `OrderReview`.
- Default row content is now compact:
  - title
  - updated meta
  - setup / entry / risk / targets / result / refs summary
  - Set Active / Locate / Delete actions
- Result and note controls moved into a collapsed `Quick Review` section.
- Full setup / entry / result editing remains in collapsed `Advanced Edit`.
- Added compact action and quick-edit styles in `v4/style.css`.

## Next Step
- Step 100: move Calendar object grouping and locate/open behavior onto the Review Set adapter.

## 2026-05-29 Planning Update - Setup Set Tree
- User clarified the desired setup workflow from zero:
  - mark reversal time
  - mark entry as one combined time + price annotation
  - mark target1 / target2 / target3 / final target
  - record what happened before reversal without forcing every setup to contain 1H segment or PDA
  - allow complete explanation sets such as 1H segment, PDA, 30m body touch FVG CE, 1m sweep EQL, SMT, or other manual event sets
  - keep regime / bias as notes because they are not reliably chart-markable
- Decision: a setup should be modeled as a large set containing:
  - `orderElements`
  - `explanationElements`
- Tree direction:
  - `Setup Set`
  - `orderElements`: reversal, entry(time+price), stopLoss, targets[], result
  - `explanationElements`: refs[], manualEvents[], note
- Added Phase 8G Steps 103-110 to `v4/TODO.md`.
- Recommended next implementation step is Step 103: write the Setup Set boundary into the design document before changing runtime code.
