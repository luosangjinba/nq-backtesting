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
